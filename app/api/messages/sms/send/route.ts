/**
 * SMS sending API endpoint
 * Handles SMS message sending through Twilio with proper validation and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { messageService } from '@/lib/services/message-service';
import { ChannelType, MessageAttachment } from '@/lib/integrations/types';

/**
 * Request validation schema
 */
const SendSmsSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
  content: z.string().min(1, 'Message content is required').max(1600, 'Message too long'),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number().max(5 * 1024 * 1024, 'Attachment too large (max 5MB)'),
    url: z.string().url('Invalid attachment URL')
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Send SMS message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = SendSmsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { to, content, conversationId, contactId, attachments, metadata } = validation.data;

    // Prepare outbound message
    const outboundMessage = {
      to,
      content,
      channel: ChannelType.SMS,
      attachments: attachments as MessageAttachment[] | undefined,
      metadata: {
        ...metadata,
        conversationId,
        contactId,
        sentAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
      }
    };

    // Send message through message service
    const result = await messageService.sendMessage(outboundMessage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        externalId: result.externalId,
        storedMessage: result.storedMessage ? {
          id: result.storedMessage.id,
          conversationId: result.storedMessage.conversationId,
          status: result.storedMessage.status,
          createdAt: result.storedMessage.createdAt
        } : null,
        metadata: result.metadata
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          metadata: result.metadata
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('SMS send API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get SMS sending capabilities and configuration
 */
export async function GET() {
  try {
    const { createSender } = await import('@/lib/integrations/factory');
    const sender = createSender(ChannelType.SMS);
    const features = sender.getSupportedFeatures();
    
    return NextResponse.json({
      channel: ChannelType.SMS,
      features,
      limits: {
        maxMessageLength: features.maxMessageLength,
        maxAttachments: 10,
        maxAttachmentSize: features.maxAttachmentSize,
        supportedAttachmentTypes: features.supportedAttachmentTypes
      },
      configuration: {
        fromNumber: process.env.TWILIO_FROM_NUMBER || 'Not configured',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'Not configured'
      }
    });
  } catch (error) {
    console.error('SMS capabilities API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get SMS capabilities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}