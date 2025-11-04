/**
 * Analytics Service
 * 
 * Tracks message events, calculates response times, and generates engagement metrics
 * across all communication channels.
 */

import { prisma } from '@/lib/prisma';
import { Channel, Direction, MessageStatus } from '@prisma/client';

/**
 * Analytics metrics for a specific time period
 */
export interface AnalyticsMetrics {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  averageResponseTime: number; // in minutes
  channelVolume: Record<Channel, number>;
  deliveryRate: number; // percentage
  readRate: number; // percentage
  failureRate: number; // percentage
}

/**
 * Channel-specific performance metrics
 */
export interface ChannelMetrics {
  channel: Channel;
  totalMessages: number;
  deliveryRate: number;
  averageResponseTime: number;
  failureCount: number;
}

/**
 * Response time data point for charting
 */
export interface ResponseTimeDataPoint {
  date: string;
  averageResponseTime: number;
  messageCount: number;
}

/**
 * Date range filter for analytics queries
 */
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Analytics service for tracking and calculating engagement metrics
 */
export class AnalyticsService {
  /**
   * Get overall analytics metrics for a date range
   */
  async getMetrics(filter: DateRangeFilter): Promise<AnalyticsMetrics> {
    const { startDate, endDate } = filter;

    // Get all messages in date range
    const messages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        channel: true,
        direction: true,
        status: true,
        createdAt: true,
        sentAt: true,
        conversationId: true,
      },
    });

    const totalMessages = messages.length;
    const inboundMessages = messages.filter(m => m.direction === Direction.INBOUND).length;
    const outboundMessages = messages.filter(m => m.direction === Direction.OUTBOUND).length;

    // Calculate channel volume
    const channelVolume: Record<Channel, number> = {
      SMS: 0,
      WHATSAPP: 0,
      EMAIL: 0,
      TWITTER: 0,
      FACEBOOK: 0,
    };

    messages.forEach(msg => {
      channelVolume[msg.channel]++;
    });

    // Calculate delivery and read rates
    const deliveredMessages = messages.filter(m => 
      m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ
    ).length;
    const readMessages = messages.filter(m => m.status === MessageStatus.READ).length;
    const failedMessages = messages.filter(m => m.status === MessageStatus.FAILED).length;

    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
    const readRate = totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;
    const failureRate = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;

    // Calculate average response time
    const averageResponseTime = await this.calculateAverageResponseTime(filter);

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      averageResponseTime,
      channelVolume,
      deliveryRate,
      readRate,
      failureRate,
    };
  }

  /**
   * Calculate average response time across all conversations
   */
  async calculateAverageResponseTime(filter: DateRangeFilter): Promise<number> {
    const { startDate, endDate } = filter;

    // Get all conversations with messages in the date range
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      include: {
        messages: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    // Calculate response times for each conversation
    for (const conversation of conversations) {
      const messages = conversation.messages;
      
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];

        // If current is inbound and next is outbound, calculate response time
        if (currentMsg.direction === Direction.INBOUND && nextMsg.direction === Direction.OUTBOUND) {
          const responseTime = nextMsg.createdAt.getTime() - currentMsg.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    // Return average in minutes
    return responseCount > 0 ? totalResponseTime / responseCount / 1000 / 60 : 0;
  }

  /**
   * Get channel-specific performance metrics
   */
  async getChannelMetrics(filter: DateRangeFilter): Promise<ChannelMetrics[]> {
    const { startDate, endDate } = filter;

    const channels: Channel[] = [Channel.SMS, Channel.WHATSAPP, Channel.EMAIL, Channel.TWITTER, Channel.FACEBOOK];
    const channelMetrics: ChannelMetrics[] = [];

    for (const channel of channels) {
      const messages = await prisma.message.findMany({
        where: {
          channel,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
          direction: true,
          createdAt: true,
          conversationId: true,
        },
      });

      const totalMessages = messages.length;
      const deliveredMessages = messages.filter(m => 
        m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ
      ).length;
      const failureCount = messages.filter(m => m.status === MessageStatus.FAILED).length;

      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      // Calculate average response time for this channel
      const channelResponseTime = await this.calculateChannelResponseTime(channel, filter);

      channelMetrics.push({
        channel,
        totalMessages,
        deliveryRate,
        averageResponseTime: channelResponseTime,
        failureCount,
      });
    }

    return channelMetrics;
  }

  /**
   * Calculate average response time for a specific channel
   */
  private async calculateChannelResponseTime(channel: Channel, filter: DateRangeFilter): Promise<number> {
    const { startDate, endDate } = filter;

    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            channel,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      include: {
        messages: {
          where: {
            channel,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const conversation of conversations) {
      const messages = conversation.messages;
      
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];

        if (currentMsg.direction === Direction.INBOUND && nextMsg.direction === Direction.OUTBOUND) {
          const responseTime = nextMsg.createdAt.getTime() - currentMsg.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    return responseCount > 0 ? totalResponseTime / responseCount / 1000 / 60 : 0;
  }

  /**
   * Get response time data points for charting (daily aggregation)
   */
  async getResponseTimeChart(filter: DateRangeFilter): Promise<ResponseTimeDataPoint[]> {
    const { startDate, endDate } = filter;

    // Get all conversations with messages in range
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      include: {
        messages: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    // Group response times by date
    const dailyData: Map<string, { totalTime: number; count: number }> = new Map();

    for (const conversation of conversations) {
      const messages = conversation.messages;
      
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];

        if (currentMsg.direction === Direction.INBOUND && nextMsg.direction === Direction.OUTBOUND) {
          const responseTime = nextMsg.createdAt.getTime() - currentMsg.createdAt.getTime();
          const dateKey = nextMsg.createdAt.toISOString().split('T')[0];

          const existing = dailyData.get(dateKey) || { totalTime: 0, count: 0 };
          dailyData.set(dateKey, {
            totalTime: existing.totalTime + responseTime,
            count: existing.count + 1,
          });
        }
      }
    }

    // Convert to array and calculate averages
    const dataPoints: ResponseTimeDataPoint[] = [];
    dailyData.forEach((value, date) => {
      dataPoints.push({
        date,
        averageResponseTime: value.totalTime / value.count / 1000 / 60, // in minutes
        messageCount: value.count,
      });
    });

    // Sort by date
    return dataPoints.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Track a message event (for future real-time analytics)
   */
  async trackMessageEvent(messageId: string, event: 'sent' | 'delivered' | 'read' | 'failed'): Promise<void> {
    // Update message status
    const statusMap = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: statusMap[event],
        sentAt: event === 'sent' ? new Date() : undefined,
      },
    });

    // In a production system, you might also:
    // - Emit WebSocket event for real-time dashboard updates
    // - Store in a time-series database for better performance
    // - Update cached metrics
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
