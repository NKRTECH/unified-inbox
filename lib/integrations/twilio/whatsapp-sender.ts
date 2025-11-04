/**
 * Twilio WhatsApp sender implementation
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

export class TwilioWhatsAppSender implements ChannelSender {
  private client = getTwilioClient();
  private config = getTwilioConfig();

  /**
   * Send a WhatsApp message through Twilio
   */
  async send(message: OutboundMessage): Promise<SendResult> {
    try {
      // Validate the message
      const validation = this.validateMessage(message);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Format the recipient number for WhatsApp
      const whatsappTo = this.formatWhatsAppNumber(message.to);
      
      // Determine the sender number with proper validation
      const fromNumber = this.config.whatsappNumber || 
        (process.env.NODE_ENV === 'development' ? 'whatsapp:+14155238886' : null);

      if (!fromNumber) {
        return {
          success: false,
          error: 'WhatsApp sender number not configured. Please set TWILIO_WHATSAPP_NUMBER environment variable.'
        };
      }
      
      // Prepare the message for Twilio WhatsApp
      const twilioMessage = await this.client.messages.create({
        body: message.content,
        from: fromNumber,
        to: whatsappTo,
        // Add media URLs if attachments are present
        ...(message.attachments && message.attachments.length > 0 && {
          mediaUrl: message.attachments.map(att => att.url)
        })
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        externalId: twilioMessage.sid,
        metadata: {
          status: twilioMessage.status,
          direction: twilioMessage.direction,
          price: twilioMessage.price,
          priceUnit: twilioMessage.priceUnit,
          numSegments: twilioMessage.numSegments,
          channel: 'whatsapp'
        }
      };
    } catch (error) {
      console.error('Failed to send WhatsApp message via Twilio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate if a recipient is valid for WhatsApp
   */
  validateRecipient(contact: Contact): ValidationResult {
    const errors: string[] = [];

    if (!contact.phone) {
      errors.push('Contact must have a phone number for WhatsApp');
    } else {
      // Basic phone number validation (E.164 format)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(contact.phone)) {
        errors.push('Phone number must be in E.164 format (e.g., +1234567890)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [
        'WhatsApp messages require the recipient to have WhatsApp installed',
        'In sandbox mode, only verified numbers can receive messages'
      ]
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
    
    // Ensure E.164 format and add whatsapp: prefix
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
    const features = this.getSupportedFeatures();

    // Check message length
    if (message.content.length > features.maxMessageLength) {
      errors.push(`Message content exceeds maximum length of ${features.maxMessageLength} characters`);
    }

    // Check attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (!features.supportedAttachmentTypes.includes(attachment.contentType)) {
          errors.push(`Unsupported attachment type: ${attachment.contentType}`);
        }
        if (attachment.size > features.maxAttachmentSize) {
          errors.push(`Attachment ${attachment.filename} exceeds maximum size of ${features.maxAttachmentSize} bytes`);
        }
      }
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const cleanNumber = message.to.replace(/^whatsapp:/, '');
    if (!phoneRegex.test(cleanNumber)) {
      errors.push('Recipient phone number must be in E.164 format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}