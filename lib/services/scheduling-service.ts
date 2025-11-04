/**
 * Message Scheduling Service
 * 
 * Handles scheduling, processing, and management of scheduled messages.
 * Uses PostgreSQL as a queue for background job processing.
 */

import { prisma } from '@/lib/prisma';
import { messageService } from './message-service';
import { ChannelType, OutboundMessage } from '@/lib/integrations/types';
import { ScheduleStatus, MessageStatus } from '@prisma/client';

/**
 * Schedule message request
 */
export interface ScheduleMessageRequest {
  conversationId: string;
  contactId: string;
  senderId: string;
  channel: ChannelType;
  content: string;
  scheduledFor: Date;
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Scheduled message with details
 */
export interface ScheduledMessageDetails {
  id: string;
  messageId: string;
  scheduledFor: Date;
  status: ScheduleStatus;
  templateId?: string;
  variables?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  message: {
    id: string;
    conversationId: string;
    contactId: string;
    senderId?: string;
    channel: ChannelType;
    content: string;
    status: MessageStatus;
    attachments?: any;
    metadata?: any;
    contact: {
      id: string;
      name?: string;
      phone?: string;
      email?: string;
    };
  };
}

/**
 * Processing result for scheduled messages
 */
export interface ProcessingResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ messageId: string; error: string }>;
}

/**
 * Message Scheduling Service
 */
export class SchedulingService {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Schedule a new message for future delivery
   */
  async scheduleMessage(request: ScheduleMessageRequest): Promise<ScheduledMessageDetails> {
    // Validate scheduled time is in the future
    if (request.scheduledFor <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Apply template variables if template is provided
    let content = request.content;
    if (request.templateId && request.variables) {
      content = this.applyTemplateVariables(content, request.variables);
    }

    // Create the message record with SCHEDULED status
    const message = await prisma.message.create({
      data: {
        conversationId: request.conversationId,
        contactId: request.contactId,
        senderId: request.senderId,
        channel: request.channel,
        direction: 'OUTBOUND',
        content,
        status: MessageStatus.SCHEDULED,
        scheduledFor: request.scheduledFor,
        attachments: request.attachments ? JSON.parse(JSON.stringify(request.attachments)) : null,
        metadata: request.metadata ? JSON.parse(JSON.stringify(request.metadata)) : null,
      },
      include: {
        contact: true,
      },
    });

    // Create the scheduled message record
    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        messageId: message.id,
        scheduledFor: request.scheduledFor,
        status: ScheduleStatus.PENDING,
        templateId: request.templateId,
        variables: request.variables ? JSON.parse(JSON.stringify(request.variables)) : null,
      },
      include: {
        message: {
          include: {
            contact: true,
          },
        },
      },
    });

    return this.mapToScheduledMessageDetails(scheduledMessage);
  }

  /**
   * Get scheduled message by ID
   */
  async getScheduledMessage(id: string): Promise<ScheduledMessageDetails | null> {
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: {
        message: {
          include: {
            contact: true,
          },
        },
      },
    });

    return scheduledMessage ? this.mapToScheduledMessageDetails(scheduledMessage) : null;
  }

  /**
   * Get all scheduled messages with optional filtering
   */
  async getScheduledMessages(options: {
    status?: ScheduleStatus;
    contactId?: string;
    conversationId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ScheduledMessageDetails[]> {
    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.contactId || options.conversationId) {
      where.message = {};
      if (options.contactId) {
        where.message.contactId = options.contactId;
      }
      if (options.conversationId) {
        where.message.conversationId = options.conversationId;
      }
    }

    const scheduledMessages = await prisma.scheduledMessage.findMany({
      where,
      include: {
        message: {
          include: {
            contact: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return scheduledMessages.map(sm => this.mapToScheduledMessageDetails(sm));
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    id: string,
    updates: {
      scheduledFor?: Date;
      content?: string;
      variables?: Record<string, any>;
    }
  ): Promise<ScheduledMessageDetails> {
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: { message: true },
    });

    if (!scheduledMessage) {
      throw new Error('Scheduled message not found');
    }

    if (scheduledMessage.status !== ScheduleStatus.PENDING) {
      throw new Error('Can only update pending scheduled messages');
    }

    // Update scheduled message
    const updateData: any = {};
    if (updates.scheduledFor) {
      if (updates.scheduledFor <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      updateData.scheduledFor = updates.scheduledFor;
    }
    if (updates.variables) {
      updateData.variables = JSON.parse(JSON.stringify(updates.variables));
    }

    // Update message content if provided
    if (updates.content) {
      await prisma.message.update({
        where: { id: scheduledMessage.messageId },
        data: { content: updates.content },
      });
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: updateData,
      include: {
        message: {
          include: {
            contact: true,
          },
        },
      },
    });

    return this.mapToScheduledMessageDetails(updated);
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(id: string): Promise<void> {
    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
    });

    if (!scheduledMessage) {
      throw new Error('Scheduled message not found');
    }

    if (scheduledMessage.status !== ScheduleStatus.PENDING) {
      throw new Error('Can only cancel pending scheduled messages');
    }

    await prisma.scheduledMessage.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });

    await prisma.message.update({
      where: { id: scheduledMessage.messageId },
      data: { status: MessageStatus.FAILED },
    });
  }

  /**
   * Process due scheduled messages
   * This should be called periodically by a cron job or background worker
   */
  async processDueMessages(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      console.log('Already processing scheduled messages, skipping...');
      return {
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    const result: ProcessingResult = {
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Find all pending messages that are due
      const dueMessages = await prisma.scheduledMessage.findMany({
        where: {
          status: ScheduleStatus.PENDING,
          scheduledFor: {
            lte: new Date(),
          },
        },
        include: {
          message: {
            include: {
              contact: true,
            },
          },
        },
        take: 100, // Process in batches
      });

      result.processedCount = dueMessages.length;

      for (const scheduledMessage of dueMessages) {
        try {
          await this.sendScheduledMessage(scheduledMessage);
          result.successCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            messageId: scheduledMessage.messageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Mark as failed
          await prisma.scheduledMessage.update({
            where: { id: scheduledMessage.id },
            data: { status: ScheduleStatus.FAILED },
          });

          await prisma.message.update({
            where: { id: scheduledMessage.messageId },
            data: { status: MessageStatus.FAILED },
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Start automatic processing of scheduled messages
   * @param intervalMs Interval in milliseconds (default: 60000 = 1 minute)
   */
  startAutoProcessing(intervalMs: number = 60000): void {
    if (this.processingInterval) {
      console.log('Auto-processing already started');
      return;
    }

    console.log(`Starting scheduled message auto-processing (interval: ${intervalMs}ms)`);
    
    // Process immediately
    this.processDueMessages().catch(error => {
      console.error('Error in initial scheduled message processing:', error);
    });

    // Then process at intervals
    this.processingInterval = setInterval(() => {
      this.processDueMessages().catch(error => {
        console.error('Error in scheduled message processing:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop automatic processing
   */
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped scheduled message auto-processing');
    }
  }

  /**
   * Send a scheduled message
   */
  private async sendScheduledMessage(scheduledMessage: any): Promise<void> {
    const { message } = scheduledMessage;

    // Prepare outbound message
    const outboundMessage: OutboundMessage = {
      channel: message.channel as ChannelType,
      to: message.contact.phone || message.contact.email || '',
      content: message.content,
      attachments: message.attachments || undefined,
      metadata: {
        ...message.metadata,
        scheduledMessageId: scheduledMessage.id,
        originalScheduledFor: scheduledMessage.scheduledFor,
      },
    };

    // Send the message
    const sendResult = await messageService.sendMessage(outboundMessage);

    if (sendResult.success) {
      // Mark as sent
      await prisma.scheduledMessage.update({
        where: { id: scheduledMessage.id },
        data: { status: ScheduleStatus.SENT },
      });

      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });
    } else {
      throw new Error(sendResult.error || 'Failed to send message');
    }
  }

  /**
   * Apply template variables to content
   */
  private applyTemplateVariables(
    content: string,
    variables: Record<string, any>
  ): string {
    let result = content;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  /**
   * Map database record to ScheduledMessageDetails
   */
  private mapToScheduledMessageDetails(scheduledMessage: any): ScheduledMessageDetails {
    return {
      id: scheduledMessage.id,
      messageId: scheduledMessage.messageId,
      scheduledFor: scheduledMessage.scheduledFor,
      status: scheduledMessage.status,
      templateId: scheduledMessage.templateId || undefined,
      variables: scheduledMessage.variables || undefined,
      createdAt: scheduledMessage.createdAt,
      updatedAt: scheduledMessage.updatedAt,
      message: {
        id: scheduledMessage.message.id,
        conversationId: scheduledMessage.message.conversationId,
        contactId: scheduledMessage.message.contactId,
        senderId: scheduledMessage.message.senderId || undefined,
        channel: scheduledMessage.message.channel as ChannelType,
        content: scheduledMessage.message.content,
        status: scheduledMessage.message.status,
        attachments: scheduledMessage.message.attachments || undefined,
        metadata: scheduledMessage.message.metadata || undefined,
        contact: {
          id: scheduledMessage.message.contact.id,
          name: scheduledMessage.message.contact.name || undefined,
          phone: scheduledMessage.message.contact.phone || undefined,
          email: scheduledMessage.message.contact.email || undefined,
        },
      },
    };
  }

  /**
   * Get statistics about scheduled messages
   */
  async getSchedulingStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    upcomingToday: number;
    upcomingThisWeek: number;
  }> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const [total, byStatus, upcomingToday, upcomingThisWeek] = await Promise.all([
      prisma.scheduledMessage.count(),
      prisma.scheduledMessage.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.scheduledMessage.count({
        where: {
          status: ScheduleStatus.PENDING,
          scheduledFor: {
            gte: now,
            lte: endOfDay,
          },
        },
      }),
      prisma.scheduledMessage.count({
        where: {
          status: ScheduleStatus.PENDING,
          scheduledFor: {
            gte: now,
            lte: endOfWeek,
          },
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      pending: statusCounts.pending || 0,
      sent: statusCounts.sent || 0,
      failed: statusCounts.failed || 0,
      cancelled: statusCounts.cancelled || 0,
      upcomingToday,
      upcomingThisWeek,
    };
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();
