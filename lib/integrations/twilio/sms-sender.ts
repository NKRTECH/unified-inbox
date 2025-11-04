/**
 * Twilio SMS sender implementation
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

export class TwilioSmsSender implements ChannelSender {
  private client = getTwilioClient();
  private config = getTwilioConfig();

  /**
   * Send an SMS message through Twilio
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

      // Prepare the message for Twilio
      const twilioMessage = await this.client.messages.create({
        body: message.content,
        from: this.config.fromNumber,
        to: message.to,
        // Add media URLs if attachments are present (for MMS)
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
          numSegments: twilioMessage.numSegments
        }
      };
    } catch (error) {
      console.error('Failed to send SMS via Twilio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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
    if (!phoneRegex.test(message.to)) {
      errors.push('Recipient phone number must be in E.164 format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}