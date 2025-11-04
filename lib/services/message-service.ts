/**
 * Message Service
 * 
 * High-level service that orchestrates message processing, normalization,
 * and storage. Integrates with the integration factory and normalization service.
 */

import { prisma } from '@/lib/prisma';
import { 
  MessageNormalizationService, 
  RawChannelMessage, 
  ProcessingResult 
} from './message-normalization';
import {
  ChannelType,
  OutboundMessage,
  SendResult,
  UnifiedMessage,
  MessageDirection,
  MessageStatus
} from '@/lib/integrations/types';
import { createSender } from '@/lib/integrations/factory';

/**
 * Message processing options
 */
export interface MessageProcessingOptions {
  skipValidation?: boolean;
  skipNotification?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  totalMessages: number;
  successCount: number;
  failureCount: number;
  results: ProcessingResult[];
  processingTime: number;
}

/**
 * Message query options
 */
export interface MessageQueryOptions {
  conversationId?: string;
  contactId?: string;
  channel?: ChannelType;
  direction?: MessageDirection;
  status?: MessageStatus;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Message Service
 */
export class MessageService {
  private normalizationService: MessageNormalizationService;

  constructor() {
    this.normalizationService = new MessageNormalizationService();
  }

  /**
   * Process a single inbound message from a webhook
   */
  async processInboundMessage(
    rawMessage: RawChannelMessage,
    options: MessageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    try {
      // Ensure direction is set to inbound
      rawMessage.direction = MessageDirection.INBOUND;
      
      // Process through normalization pipeline
      const result = await this.normalizationService.processMessage(rawMessage);
      
      if (result.success && result.storedMessage && !options.skipNotification) {
        // Trigger real-time notifications
        await this.notifyMessageReceived(result.storedMessage);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to process inbound message: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        processingTime: 0
      };
    }
  }

  /**
   * Send an outbound message through the appropriate channel
   */
  async sendMessage(message: OutboundMessage): Promise<SendResult & { storedMessage?: any }> {
    try {
      // Get the appropriate sender for the channel
      const sender = createSender(message.channel);
      
      // Send the message
      const sendResult = await sender.send(message);
      
      if (sendResult.success) {
        // Store the sent message
        const rawMessage: RawChannelMessage = {
          channel: message.channel,
          externalId: sendResult.externalId || sendResult.messageId || `msg_${Date.now()}`,
          from: 'system', // This would be the system/user sending
          to: message.to,
          content: message.content,
          timestamp: new Date(),
          metadata: {
            ...message.metadata,
            sendResult
          },
          attachments: message.attachments?.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            url: att.url
          })),
          direction: MessageDirection.OUTBOUND,
          status: MessageStatus.SENT
        };

        const processingResult = await this.normalizationService.processMessage(rawMessage);
        
        return {
          ...sendResult,
          storedMessage: processingResult.storedMessage
        };
      }
      
      return sendResult;
    } catch (error) {
      return {
        success: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process multiple messages in batch
   */
  async processBatch(
    rawMessages: RawChannelMessage[],
    options: MessageProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const rawMessage of rawMessages) {
      try {
        const result = await this.processInboundMessage(rawMessage, options);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        const errorResult: ProcessingResult = {
          success: false,
          errors: [`Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          processingTime: 0
        };
        results.push(errorResult);
        failureCount++;
      }
    }

    return {
      totalMessages: rawMessages.length,
      successCount,
      failureCount,
      results,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Get messages with filtering and pagination
   */
  async getMessages(options: MessageQueryOptions = {}) {
    const where: any = {};
    
    if (options.conversationId) {
      where.conversationId = options.conversationId;
    }
    
    if (options.contactId) {
      where.contactId = options.contactId;
    }
    
    if (options.channel) {
      where.channel = options.channel;
    }
    
    if (options.direction) {
      where.direction = options.direction;
    }
    
    if (options.status) {
      where.status = options.status;
    }
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    return await prisma.message.findMany({
      where,
      include: {
        contact: true,
        conversation: true,
        sender: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options.limit || 50,
      skip: options.offset || 0
    });
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string) {
    return await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        contact: true,
        conversation: true,
        sender: true
      }
    });
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId: string, status: MessageStatus) {
    return await prisma.message.update({
      where: { id: messageId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update message status by external ID (Twilio MessageSid)
   */
  async updateMessageStatusByExternalId(externalId: string, status: MessageStatus) {
    try {
      const updated = await prisma.message.updateMany({
        where: { 
          metadata: {
            path: ['sendResult', 'messageId'],
            equals: externalId
          }
        },
        data: { 
          status,
          updatedAt: new Date()
        }
      });

      console.log(`Updated ${updated.count} messages with external ID ${externalId} to status ${status}`);
      return updated;
    } catch (error) {
      console.error('Failed to update message status by external ID:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string, limit = 50, offset = 0) {
    return await prisma.message.findMany({
      where: { conversationId },
      include: {
        contact: true,
        sender: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit,
      skip: offset
    });
  }

  /**
   * Search messages by content
   */
  async searchMessages(query: string, options: MessageQueryOptions = {}) {
    const where: any = {
      content: {
        contains: query,
        mode: 'insensitive'
      }
    };

    // Apply additional filters
    if (options.conversationId) where.conversationId = options.conversationId;
    if (options.contactId) where.contactId = options.contactId;
    if (options.channel) where.channel = options.channel;

    return await prisma.message.findMany({
      where,
      include: {
        contact: true,
        conversation: true,
        sender: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options.limit || 20
    });
  }

  /**
   * Get message statistics
   */
  async getMessageStats(options: { 
    startDate?: Date; 
    endDate?: Date; 
    channel?: ChannelType 
  } = {}) {
    const where: any = {};
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }
    
    if (options.channel) {
      where.channel = options.channel;
    }

    const [total, byChannel, byDirection, byStatus] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.groupBy({
        by: ['channel'],
        where,
        _count: { id: true }
      }),
      prisma.message.groupBy({
        by: ['direction'],
        where,
        _count: { id: true }
      }),
      prisma.message.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      })
    ]);

    return {
      total,
      byChannel: byChannel.reduce((acc, item) => {
        acc[item.channel] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byDirection: byDirection.reduce((acc, item) => {
        acc[item.direction] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Notify about received message (placeholder for real-time notifications)
   */
  private async notifyMessageReceived(message: any): Promise<void> {
    // This would integrate with WebSocket service or notification service
    // For now, just log the notification
    console.log(`New message received in conversation ${message.conversationId}`);
    
    // TODO: Implement real-time notification via WebSocket
    // TODO: Trigger any necessary webhooks or integrations
    // TODO: Update conversation last activity timestamp
  }
}

// Export singleton instance
export const messageService = new MessageService();