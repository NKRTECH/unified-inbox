/**
 * Twilio WhatsApp sender implementation with retry logic and enhanced features
 */

import { ChannelSender } from '../interfaces';
import {
  ChannelType,
  OutboundMessage,
  SendResult,
  Contact,
  ChannelFeatures,
  ValidationResult
} from '../types';
import { getTwilioClient, getTwilioConfig } from './client';
import { validatePhoneNumber } from './sms-utils';
import { 
  formatWhatsAppContent, 
  validateWhatsAppAttachments,
  isWhatsAppNumber,
  WhatsAppFormatOptions
} from './whatsapp-utils';

/**
 * Retry configuration for WhatsApp sending
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}



export class TwilioWhatsAppSender implements ChannelSender {
  private client = getTwilioClient();
  private config = getTwilioConfig();
  
  // Default retry configuration
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2
  };

  /**
   * Send a WhatsApp message through Twilio with retry logic
   */
  async send(message: OutboundMessage): Promise<SendResult> {
    // Validate the message first
    const validation = this.validateMessage(message);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Attempt to send with retry logic
    return await this.sendWithRetry(message, 0);
  }

  /**
   * Send message with exponential backoff retry logic
   */
  private async sendWithRetry(message: OutboundMessage, attempt: number): Promise<SendResult> {
    try {
      // Format content for WhatsApp using utility
      const formattedContent = formatWhatsAppContent(message.content, {
        preserveFormatting: message.metadata?.preserveFormatting !== false,
        maxLength: 4096,
        convertEmojis: true
      });

      // Format the recipient number for WhatsApp
      const whatsappTo = this.formatWhatsAppNumber(message.to);
      
      // Determine the sender number with proper validation
      const fromNumber = this.config.whatsappNumber || 
        process.env.TWILIO_WHATSAPP_NUMBER ||
        (process.env.NODE_ENV === 'development' ? 'whatsapp:+14155238886' : null);

      if (!fromNumber) {
        return {
          success: false,
          error: 'WhatsApp sender number not configured. Please set TWILIO_WHATSAPP_NUMBER environment variable.'
        };
      }
      
      // Prepare the message for Twilio WhatsApp
      const twilioMessageData: any = {
        body: formattedContent,
        from: fromNumber,
        to: whatsappTo
      };

      // Add media URLs if attachments are present
      if (message.attachments && message.attachments.length > 0) {
        twilioMessageData.mediaUrl = message.attachments.map(att => att.url);
      }

      // Send the message via Twilio
      const twilioMessage = await this.client.messages.create(twilioMessageData);

      return {
        success: true,
        messageId: twilioMessage.sid,
        externalId: twilioMessage.sid,
        metadata: {
          // Twilio response data
          status: twilioMessage.status,
          direction: twilioMessage.direction,
          price: twilioMessage.price,
          priceUnit: twilioMessage.priceUnit,
          numSegments: twilioMessage.numSegments,
          dateCreated: twilioMessage.dateCreated,
          dateSent: twilioMessage.dateSent,
          errorCode: twilioMessage.errorCode,
          errorMessage: twilioMessage.errorMessage,
          
          // Our processing metadata
          channel: 'whatsapp',
          attempt: attempt + 1,
          originalContent: message.content,
          formattedContent,
          hasAttachments: !!(message.attachments && message.attachments.length > 0),
          attachmentCount: message.attachments?.length || 0,
          whatsappTo,
          fromNumber
        }
      };
    } catch (error) {
      const isRetryableError = this.isRetryableError(error);
      const shouldRetry = attempt < this.retryConfig.maxRetries && isRetryableError;

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        console.warn(`WhatsApp send attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return await this.sendWithRetry(message, attempt + 1);
      }

      // No more retries or non-retryable error
      console.error(`Failed to send WhatsApp message via Twilio after ${attempt + 1} attempts:`, error);
      
      return {
        success: false,
        error: this.formatErrorMessage(error),
        metadata: {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          isRetryableError,
          originalError: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // WhatsApp/Twilio error codes that are retryable (only transient errors)
    const retryableErrorCodes = [
      20429, // Too Many Requests
      30001, // Queue overflow
      30008, // Unknown error
      63016, // WhatsApp rate limit exceeded
      // Note: 63017 (message undeliverable) is permanent failure, not retryable
    ];

    // Network/connection errors are retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('timeout') ||
        error.message?.includes('network')) {
      return true;
    }

    // Twilio/WhatsApp specific errors
    if (error.code) {
      const codeNum = parseInt(error.code, 10);
      if (!isNaN(codeNum) && retryableErrorCodes.includes(codeNum)) {
        return true;
      }
    }

    // HTTP 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting (429) is retryable
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Format error message for user-friendly display
   */
  private formatErrorMessage(error: any): string {
    if (error.code && error.message) {
      return `Twilio WhatsApp Error ${error.code}: ${error.message}`;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Unknown error occurred while sending WhatsApp message';
  }

  /**
   * Configure retry settings
   */
  public configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Get current retry configuration
   */
  public getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Validate if a recipient is valid for WhatsApp
   */
  validateRecipient(contact: Contact): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!contact.phone) {
      errors.push('Contact must have a phone number for WhatsApp');
    } else {
      // Use utility function for phone validation
      const phoneValidation = validatePhoneNumber(contact.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    // WhatsApp-specific warnings
    warnings.push('WhatsApp messages require the recipient to have WhatsApp installed');
    
    if (process.env.NODE_ENV === 'development' || process.env.TWILIO_WHATSAPP_NUMBER?.includes('sandbox')) {
      warnings.push('In sandbox mode, only verified numbers can receive messages');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get WhatsApp channel features and capabilities
   */
  getSupportedFeatures(): ChannelFeatures {
    return {
      supportsAttachments: true,
      supportsRichText: true, // WhatsApp supports basic formatting
      maxMessageLength: 4096, // WhatsApp message limit
      supportedAttachmentTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/3gpp',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      maxAttachmentSize: 16 * 1024 * 1024, // 16MB for WhatsApp
      supportsDeliveryReceipts: true,
      supportsReadReceipts: true,
      supportsTypingIndicators: false
    };
  }

  /**
   * Get the channel type
   */
  getChannelType(): ChannelType {
    return ChannelType.WHATSAPP;
  }



  /**
   * Format phone number for WhatsApp (add whatsapp: prefix)
   */
  private formatWhatsAppNumber(phoneNumber: string): string {
    // Remove any existing whatsapp: prefix
    const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
    
    // Validate and format using utility
    const phoneValidation = validatePhoneNumber(cleanNumber);
    if (phoneValidation.isValid && phoneValidation.formatted) {
      return `whatsapp:${phoneValidation.formatted}`;
    }
    
    // Fallback to original logic
    if (cleanNumber.startsWith('+')) {
      return `whatsapp:${cleanNumber}`;
    } else {
      return `whatsapp:+${cleanNumber}`;
    }
  }

  /**
   * Validate the outbound message
   */
  private validateMessage(message: OutboundMessage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const features = this.getSupportedFeatures();

    // Check required fields
    if (!message.content || message.content.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (!message.to) {
      errors.push('Recipient phone number is required');
    }

    // Check message length
    if (message.content && message.content.length > features.maxMessageLength) {
      errors.push(`Message content exceeds maximum length of ${features.maxMessageLength} characters`);
    }

    // Check WhatsApp sender configuration
    const fromNumber = this.config.whatsappNumber || 
      process.env.TWILIO_WHATSAPP_NUMBER ||
      (process.env.NODE_ENV === 'development' ? 'whatsapp:+14155238886' : null);

    if (!fromNumber) {
      errors.push('No WhatsApp sender number configured. Set TWILIO_WHATSAPP_NUMBER environment variable.');
    }

    // Validate WhatsApp attachments using utility
    if (message.attachments && message.attachments.length > 0) {
      const attachmentValidation = validateWhatsAppAttachments(message.attachments);
      errors.push(...attachmentValidation.errors);
      warnings.push(...attachmentValidation.warnings);
      
      // Additional URL validation
      for (const attachment of message.attachments) {
        if (!attachment.url || !this.isValidUrl(attachment.url)) {
          errors.push(`Invalid attachment URL for ${attachment.filename}`);
        }
      }
    }

    // Validate phone number format
    if (message.to) {
      const cleanNumber = message.to.replace(/^whatsapp:/, '');
      const phoneValidation = validatePhoneNumber(cleanNumber);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    // WhatsApp-specific warnings
    if (process.env.NODE_ENV === 'development') {
      warnings.push('Using WhatsApp sandbox - only verified numbers can receive messages');
    }

    // Check if number is likely to have WhatsApp
    if (message.to) {
      const cleanNumber = message.to.replace(/^whatsapp:/, '');
      const whatsappCheck = isWhatsAppNumber(cleanNumber);
      if (!whatsappCheck.isLikely) {
        warnings.push('Phone number may not have WhatsApp installed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}