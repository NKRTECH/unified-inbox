/**
 * Abstract base classes for channel implementations
 */

import {
  ChannelType,
  OutboundMessage,
  SendResult,
  Contact,
  ChannelFeatures,
  WebhookConfig,
  ValidationResult,
  UnifiedMessage,
  ChannelMessage
} from './types';
import { ChannelSender, ChannelIntegration, MessageProcessor } from './interfaces';

/**
 * Abstract base class for channel senders
 */
export abstract class BaseChannelSender implements ChannelSender {
  protected channelType: ChannelType;

  constructor(channelType: ChannelType) {
    this.channelType = channelType;
  }

  abstract send(message: OutboundMessage): Promise<SendResult>;
  abstract validateRecipient(contact: Contact): ValidationResult;
  abstract getSupportedFeatures(): ChannelFeatures;

  getChannelType(): ChannelType {
    return this.channelType;
  }

  /**
   * Common validation for message content
   */
  protected validateMessageContent(message: OutboundMessage): ValidationResult {
    const errors: string[] = [];
    const features = this.getSupportedFeatures();

    if (!message.content || message.content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }

    if (message.content.length > features.maxMessageLength) {
      errors.push(`Message exceeds maximum length of ${features.maxMessageLength} characters`);
    }

    if (message.attachments && !features.supportsAttachments) {
      errors.push('This channel does not support attachments');
    }

    if (message.attachments && features.supportsAttachments) {
      for (const attachment of message.attachments) {
        if (attachment.size > features.maxAttachmentSize) {
          errors.push(`Attachment ${attachment.filename} exceeds maximum size of ${features.maxAttachmentSize} bytes`);
        }

        if (!features.supportedAttachmentTypes.includes(attachment.contentType)) {
          errors.push(`Attachment type ${attachment.contentType} is not supported`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Common recipient validation
   */
  protected validateRecipientFormat(recipient: string, pattern: RegExp, errorMessage: string): ValidationResult {
    const errors: string[] = [];

    if (!recipient || recipient.trim().length === 0) {
      errors.push('Recipient cannot be empty');
    } else if (!pattern.test(recipient)) {
      errors.push(errorMessage);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Abstract base class for channel integrations
 */
export abstract class BaseChannelIntegration implements ChannelIntegration {
  protected channelType: ChannelType;
  protected messageProcessor: MessageProcessor;

  constructor(channelType: ChannelType, messageProcessor: MessageProcessor) {
    this.channelType = channelType;
    this.messageProcessor = messageProcessor;
  }

  abstract createSender(): ChannelSender;
  abstract setupWebhook(config: WebhookConfig): Promise<void>;
  abstract validateWebhook(payload: unknown, signature: string): boolean;
  abstract processWebhook(payload: unknown): Promise<UnifiedMessage[]>;

  getChannelType(): ChannelType {
    return this.channelType;
  }

  /**
   * Common webhook validation logic
   */
  protected validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // This is a placeholder - actual implementation would depend on the specific channel's signature method
    // For example, Twilio uses HMAC-SHA1, while others might use different methods
    return true;
  }

  /**
   * Common error handling for webhook processing
   */
  protected handleWebhookError(error: unknown, payload: unknown): never {
    console.error('Webhook processing error:', error);
    console.error('Payload:', payload);
    throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Base message processor with common normalization logic
 */
export abstract class BaseMessageProcessor implements MessageProcessor {
  abstract normalize(rawMessage: ChannelMessage): UnifiedMessage;
  abstract extractMetadata(rawMessage: ChannelMessage): Record<string, unknown>;

  validate(message: UnifiedMessage): ValidationResult {
    const errors: string[] = [];

    if (!message.conversationId) {
      errors.push('Conversation ID is required');
    }

    if (!message.contactId) {
      errors.push('Contact ID is required');
    }

    if (!message.content || message.content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }

    if (!Object.values(ChannelType).includes(message.channel)) {
      errors.push('Invalid channel type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Common metadata extraction
   */
  protected extractCommonMetadata(rawMessage: ChannelMessage): Record<string, unknown> {
    return {
      externalId: rawMessage.externalId,
      originalTimestamp: rawMessage.timestamp,
      channelSpecific: rawMessage.metadata
    };
  }
}