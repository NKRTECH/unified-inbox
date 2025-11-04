/**
 * Twilio SMS sender implementation with retry logic and message service integration
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
import { 
  formatSmsContent, 
  calculateSmsSegments, 
  validatePhoneNumber, 
  validateMmsAttachments,
  shouldSendAsMms 
} from './sms-utils';

/**
 * Retry configuration for SMS sending
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class TwilioSmsSender implements ChannelSender {
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
   * Send an SMS message through Twilio with retry logic
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
      // Format content for SMS
      const formattedContent = formatSmsContent(message.content, {
        maxLength: 1600,
        truncateWithEllipsis: true,
        removeFormatting: true
      });

      // Calculate segments for metadata
      const segmentInfo = calculateSmsSegments(formattedContent);
      const isMms = shouldSendAsMms(formattedContent, message.attachments);

      // Prepare the message for Twilio
      const twilioMessageData: any = {
        body: formattedContent,
        from: this.config.fromNumber || process.env.TWILIO_FROM_NUMBER,
        to: message.to
      };

      // Add media URLs if attachments are present (for MMS)
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
          attempt: attempt + 1,
          isMms,
          segmentInfo,
          originalContent: message.content,
          formattedContent,
          hasAttachments: !!(message.attachments && message.attachments.length > 0),
          attachmentCount: message.attachments?.length || 0
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

        console.warn(`SMS send attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return await this.sendWithRetry(message, attempt + 1);
      }

      // No more retries or non-retryable error
      console.error(`Failed to send SMS via Twilio after ${attempt + 1} attempts:`, error);
      
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
    // Twilio error codes that are retryable (only transient errors)
    const retryableErrorCodes = [
      20429, // Too Many Requests
      30001, // Queue overflow
      30008, // Unknown error
    ];

    // Network/connection errors are retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('timeout') ||
        error.message?.includes('network')) {
      return true;
    }

    // Twilio specific errors
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
      return `Twilio Error ${error.code}: ${error.message}`;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Unknown error occurred while sending SMS';
  }

  /**
   * Validate if a recipient is valid for SMS
   */
  validateRecipient(contact: Contact): ValidationResult {
    const errors: string[] = [];

    if (!contact.phone) {
      errors.push('Contact must have a phone number for SMS');
    } else {
      // Basic phone number validation (E.164 format)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(contact.phone)) {
        errors.push('Phone number must be in E.164 format (e.g., +1234567890)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get SMS channel features and capabilities
   */
  getSupportedFeatures(): ChannelFeatures {
    return {
      supportsAttachments: true, // MMS support
      supportsRichText: false,
      maxMessageLength: 1600, // SMS concatenation limit
      supportedAttachmentTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg',
        'text/plain'
      ],
      maxAttachmentSize: 5 * 1024 * 1024, // 5MB for MMS
      supportsDeliveryReceipts: true,
      supportsReadReceipts: false,
      supportsTypingIndicators: false
    };
  }

  /**
   * Get the channel type
   */
  getChannelType(): ChannelType {
    return ChannelType.SMS;
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
   * Validate the outbound message using utility functions
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

    // Validate phone number using utility
    if (message.to) {
      const phoneValidation = validatePhoneNumber(message.to);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    // Check message length and segments
    if (message.content) {
      const formattedContent = formatSmsContent(message.content);
      const segmentInfo = calculateSmsSegments(formattedContent);
      
      if (formattedContent.length > features.maxMessageLength) {
        errors.push(`Message content exceeds maximum length of ${features.maxMessageLength} characters`);
      }

      // Warn about multiple segments
      if (segmentInfo.segments > 1) {
        warnings.push(`Message will be split into ${segmentInfo.segments} SMS segments (${segmentInfo.encoding} encoding)`);
      }

      // Warn about expensive messages
      if (segmentInfo.segments > 3) {
        warnings.push(`Long message (${segmentInfo.segments} segments) may be expensive. Consider using MMS or shortening the message.`);
      }
    }

    // Check from number configuration
    if (!this.config.fromNumber && !process.env.TWILIO_FROM_NUMBER) {
      errors.push('No Twilio from number configured. Set TWILIO_FROM_NUMBER environment variable.');
    }

    // Validate MMS attachments using utility
    if (message.attachments && message.attachments.length > 0) {
      const attachmentValidation = validateMmsAttachments(message.attachments);
      errors.push(...attachmentValidation.errors);
      warnings.push(...attachmentValidation.warnings);
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