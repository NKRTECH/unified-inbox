/**
 * Message Normalization Service
 * 
 * Handles normalization of raw channel messages into unified format,
 * validation, and storage pipeline for the unified inbox system.
 */

import { prisma } from '@/lib/prisma';
import {
  ChannelType,
  ChannelMessage,
  UnifiedMessage,
  MessageDirection,
  MessageStatus,
  ValidationResult,
  MessageAttachment
} from '@/lib/integrations/types';

/**
 * Raw message from external channels before normalization
 */
export interface RawChannelMessage {
  channel: ChannelType;
  externalId: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  attachments?: RawAttachment[];
  direction?: MessageDirection;
  status?: MessageStatus;
}

/**
 * Raw attachment before normalization
 */
export interface RawAttachment {
  id?: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Normalized message ready for storage
 */
export interface NormalizedMessage extends UnifiedMessage {
  externalId: string;
  normalizedAt: Date;
  processingMetadata: {
    source: string;
    processor: string;
    version: string;
  };
}

/**
 * Processing result for message normalization
 */
export interface ProcessingResult {
  success: boolean;
  message?: NormalizedMessage;
  storedMessage?: any; // Prisma Message type
  errors: string[];
  warnings: string[];
  processingTime: number;
}

/**
 * Contact resolution result
 */
export interface ContactResolution {
  contactId: string;
  conversationId: string;
  isNewContact: boolean;
  isNewConversation: boolean;
}

/**
 * Message Normalization Service
 */
export class MessageNormalizationService {
  private readonly processorVersion = '1.0.0';

  /**
   * Process a raw channel message through the complete normalization pipeline
   */
  async processMessage(rawMessage: RawChannelMessage): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Normalize the raw message
      const normalizedMessage = this.normalizeMessage(rawMessage);
      
      // Step 2: Validate the normalized message
      const validation = this.validateMessage(normalizedMessage);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings || [],
          processingTime: Date.now() - startTime
        };
      }

      // Step 3: Resolve contact and conversation
      const contactResolution = await this.resolveContactAndConversation(normalizedMessage);
      
      // Step 4: Store the message
      const storedMessage = await this.storeMessage(normalizedMessage, contactResolution);

      return {
        success: true,
        message: normalizedMessage,
        storedMessage,
        errors,
        warnings,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        errors,
        warnings,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Normalize a raw channel message to unified format
   */
  private normalizeMessage(rawMessage: RawChannelMessage): NormalizedMessage {
    const now = new Date();
    
    // Determine direction if not provided
    const direction = rawMessage.direction || this.inferDirection(rawMessage);
    
    // Normalize attachments
    const attachments = rawMessage.attachments?.map(this.normalizeAttachment) || [];
    
    // Extract and normalize metadata
    const normalizedMetadata = this.extractChannelMetadata(rawMessage);

    return {
      // Core message fields
      conversationId: '', // Will be set during contact resolution
      contactId: '', // Will be set during contact resolution
      senderId: direction === MessageDirection.OUTBOUND ? undefined : undefined, // Will be resolved
      channel: rawMessage.channel,
      direction,
      content: this.normalizeContent(rawMessage.content, rawMessage.channel),
      metadata: normalizedMetadata,
      attachments,
      status: rawMessage.status || MessageStatus.SENT,
      scheduledFor: undefined,
      sentAt: rawMessage.timestamp,
      createdAt: now,
      
      // Normalization-specific fields
      externalId: rawMessage.externalId,
      normalizedAt: now,
      processingMetadata: {
        source: rawMessage.channel,
        processor: 'MessageNormalizationService',
        version: this.processorVersion
      }
    };
  }

  /**
   * Validate a normalized message
   */
  private validateMessage(message: NormalizedMessage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!message.content || message.content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }

    if (!message.externalId) {
      errors.push('External ID is required for message tracking');
    }

    if (!Object.values(ChannelType).includes(message.channel)) {
      errors.push(`Invalid channel type: ${message.channel}`);
    }

    if (!Object.values(MessageDirection).includes(message.direction)) {
      errors.push(`Invalid message direction: ${message.direction}`);
    }

    // Content length validation by channel
    const maxLength = this.getMaxContentLength(message.channel);
    if (message.content.length > maxLength) {
      warnings.push(`Message content exceeds recommended length for ${message.channel} (${message.content.length}/${maxLength})`);
    }

    // Attachment validation
    if (message.attachments && message.attachments.length > 0) {
      const supportsAttachments = this.channelSupportsAttachments(message.channel);
      if (!supportsAttachments) {
        warnings.push(`Channel ${message.channel} may not support attachments`);
      }

      for (const attachment of message.attachments) {
        if (!attachment.url || !attachment.filename) {
          errors.push('Attachment must have URL and filename');
        }
      }
    }

    // Timestamp validation
    if (message.sentAt && message.sentAt > new Date()) {
      warnings.push('Message timestamp is in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Resolve contact and conversation for the message
   */
  private async resolveContactAndConversation(message: NormalizedMessage): Promise<ContactResolution> {
    const identifier = this.extractContactIdentifier(message);
    
    // Find or create contact
    let contact = await this.findContactByIdentifier(identifier, message.channel);
    let isNewContact = false;
    
    if (!contact) {
      contact = await this.createContact(identifier, message.channel);
      isNewContact = true;
    }

    // Find or create conversation
    let conversation = await this.findActiveConversation(contact.id);
    let isNewConversation = false;
    
    if (!conversation) {
      conversation = await this.createConversation(contact.id);
      isNewConversation = true;
    }

    return {
      contactId: contact.id,
      conversationId: conversation.id,
      isNewContact,
      isNewConversation
    };
  }

  /**
   * Store the normalized message in the database
   */
  private async storeMessage(
    message: NormalizedMessage, 
    resolution: ContactResolution
  ): Promise<any> {
    return await prisma.message.create({
      data: {
        conversationId: resolution.conversationId,
        contactId: resolution.contactId,
        senderId: message.senderId,
        channel: message.channel,
        direction: message.direction,
        content: message.content,
        metadata: {
          ...message.metadata,
          externalId: message.externalId,
          normalizedAt: message.normalizedAt.toISOString(),
          processingMetadata: message.processingMetadata
        },
        attachments: message.attachments ? JSON.parse(JSON.stringify(message.attachments)) : null,
        status: message.status,
        scheduledFor: message.scheduledFor,
        sentAt: message.sentAt,
      },
      include: {
        contact: true,
        conversation: true,
        sender: true
      }
    });
  }

  /**
   * Infer message direction based on channel and metadata
   */
  private inferDirection(rawMessage: RawChannelMessage): MessageDirection {
    // This is a simplified implementation - in practice, you'd use
    // channel-specific logic to determine direction
    
    // For webhooks, messages are typically inbound
    // For API sends, messages are typically outbound
    
    // Check if this looks like a system/bot number (outbound)
    if (this.isSystemNumber(rawMessage.from)) {
      return MessageDirection.OUTBOUND;
    }
    
    // Default to inbound for webhook messages
    return MessageDirection.INBOUND;
  }

  /**
   * Normalize message content based on channel requirements
   */
  private normalizeContent(content: string, channel: ChannelType): string {
    let normalized = content.trim();
    
    switch (channel) {
      case ChannelType.SMS:
        // Remove rich text formatting for SMS
        normalized = this.stripRichText(normalized);
        break;
      case ChannelType.EMAIL:
        // Preserve HTML for email
        break;
      case ChannelType.WHATSAPP:
        // WhatsApp supports limited formatting
        normalized = this.normalizeWhatsAppFormatting(normalized);
        break;
      default:
        // Strip rich text for other channels
        normalized = this.stripRichText(normalized);
    }
    
    return normalized;
  }

  /**
   * Normalize attachment from raw format
   */
  private normalizeAttachment(rawAttachment: RawAttachment): MessageAttachment {
    return {
      id: rawAttachment.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: rawAttachment.filename,
      contentType: rawAttachment.contentType,
      size: rawAttachment.size,
      url: rawAttachment.url
    };
  }

  /**
   * Extract channel-specific metadata
   */
  private extractChannelMetadata(rawMessage: RawChannelMessage): Record<string, unknown> {
    const baseMetadata = {
      originalTimestamp: rawMessage.timestamp.toISOString(),
      externalId: rawMessage.externalId,
      from: rawMessage.from,
      to: rawMessage.to,
      channel: rawMessage.channel
    };

    // Merge with channel-specific metadata
    return {
      ...baseMetadata,
      ...rawMessage.metadata,
      channelSpecific: rawMessage.metadata
    };
  }

  /**
   * Extract contact identifier from message
   */
  private extractContactIdentifier(message: NormalizedMessage): string {
    switch (message.channel) {
      case ChannelType.SMS:
      case ChannelType.WHATSAPP:
        return message.direction === MessageDirection.INBOUND 
          ? (message.metadata?.from as string) 
          : (message.metadata?.to as string);
      case ChannelType.EMAIL:
        return message.direction === MessageDirection.INBOUND 
          ? (message.metadata?.from as string) 
          : (message.metadata?.to as string);
      default:
        return message.metadata?.from as string || message.metadata?.to as string;
    }
  }

  /**
   * Find contact by identifier and channel
   */
  private async findContactByIdentifier(identifier: string, channel: ChannelType) {
    const searchField = this.getContactSearchField(channel);
    
    return await prisma.contact.findFirst({
      where: {
        [searchField]: identifier
      }
    });
  }

  /**
   * Create new contact from identifier
   */
  private async createContact(identifier: string, channel: ChannelType) {
    const contactData: any = {};
    
    switch (channel) {
      case ChannelType.SMS:
      case ChannelType.WHATSAPP:
        contactData.phone = identifier;
        break;
      case ChannelType.EMAIL:
        contactData.email = identifier;
        break;
      default:
        contactData.socialHandles = { [channel.toLowerCase()]: identifier };
    }

    return await prisma.contact.create({
      data: contactData
    });
  }

  /**
   * Find active conversation for contact
   */
  private async findActiveConversation(contactId: string) {
    return await prisma.conversation.findFirst({
      where: {
        contactId,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Create new conversation for contact
   */
  private async createConversation(contactId: string) {
    return await prisma.conversation.create({
      data: {
        contactId,
        status: 'ACTIVE',
        priority: 'NORMAL'
      }
    });
  }

  // Helper methods
  private getMaxContentLength(channel: ChannelType): number {
    switch (channel) {
      case ChannelType.SMS: return 160;
      case ChannelType.WHATSAPP: return 4096;
      case ChannelType.TWITTER: return 280;
      case ChannelType.FACEBOOK: return 2000;
      case ChannelType.EMAIL: return 100000;
      default: return 1000;
    }
  }

  private channelSupportsAttachments(channel: ChannelType): boolean {
    return [ChannelType.WHATSAPP, ChannelType.EMAIL, ChannelType.FACEBOOK].includes(channel);
  }

  private getContactSearchField(channel: ChannelType): string {
    switch (channel) {
      case ChannelType.SMS:
      case ChannelType.WHATSAPP:
        return 'phone';
      case ChannelType.EMAIL:
        return 'email';
      default:
        return 'socialHandles';
    }
  }

  private isSystemNumber(identifier: string): boolean {
    // Simple heuristic - in practice, you'd maintain a list of system numbers
    return identifier.includes('system') || identifier.includes('bot') || identifier.includes('noreply');
  }

  private stripRichText(content: string): string {
    return content.replace(/<[^>]*>/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  }

  private normalizeWhatsAppFormatting(content: string): string {
    // WhatsApp supports *bold* and _italic_
    return content;
  }
}