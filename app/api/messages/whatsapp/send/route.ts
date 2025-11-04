/**
 * WhatsApp sending API endpoint
 * Handles WhatsApp message sending through Twilio with proper validation and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { messageService } from '@/lib/services/message-service';
import { ChannelType, MessageAttachment } from '@/lib/integrations/types';

/**
 * Request validation schema for WhatsApp
 */
const SendWhatsAppSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
  content: z.string().min(1, 'Message content is required').max(4096, 'Message too long for WhatsApp'),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
  preserveFormatting: z.boolean().default(true),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    contentType: z.string(),
    size: z.number().max(16 * 1024 * 1024, 'Attachment too large (max 16MB for WhatsApp)'),
    url: z.string().url('Invalid attachment URL')
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Send WhatsApp message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = SendWhatsAppSchema.safeParse(body);
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

    const { to, content, conversationId, contactId, preserveFormatting, attachments, metadata } = validation.data;

    // Prepare outbound message
    const outboundMessage = {
      to,
      content,
      channel: ChannelType.WHATSAPP,
      attachments: attachments as MessageAttachment[] | undefined,
      metadata: {
        ...metadata,
        conversationId,
        contactId,
        preserveFormatting,
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
    console.error('WhatsApp send API error:', error);
    
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
 * Get WhatsApp sending capabilities and configuration
 */
export async function GET() {
  try {
    // Import to ensure registration
    const { createSender } = await import('@/lib/integrations');
    const sender = createSender(ChannelType.WHATSAPP);
    const features = sender.getSupportedFeatures();
    
    return NextResponse.json({
      channel: ChannelType.WHATSAPP,
      features,
      limits: {
        maxMessageLength: features.maxMessageLength,
        maxAttachments: 10,
        maxAttachmentSize: features.maxAttachmentSize,
        supportedAttachmentTypes: features.supportedAttachmentTypes
      },
      configuration: {
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'Not configured',
        sandboxMode: process.env.NODE_ENV === 'development' || 
                    process.env.TWILIO_WHATSAPP_NUMBER?.includes('sandbox')
      },
      formatting: {
        supportsRichText: features.supportsRichText,
        supportedFormats: [
          '*bold text*',
          '_italic text_',
          '```code text```',
          'Line breaks preserved'
        ]
      }
    });
  } catch (error) {
    console.error('WhatsApp capabilities API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get WhatsApp capabilities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}