/**
 * Twilio WhatsApp test endpoint
 * Provides testing capabilities for WhatsApp sending functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSender } from '@/lib/integrations/factory';
import { ChannelType } from '@/lib/integrations/types';
import { TwilioWhatsAppSender } from '@/lib/integrations/twilio/whatsapp-sender';

/**
 * Test WhatsApp message schema
 */
const TestWhatsAppSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
  content: z.string().min(1).max(500).default('Test WhatsApp message from Unified Inbox 📱'),
  preserveFormatting: z.boolean().default(true),
  includeAttachment: z.boolean().default(false)
});

/**
 * Test WhatsApp sending functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = TestWhatsAppSchema.safeParse(body);
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

    const { to, content, preserveFormatting, includeAttachment } = validation.data;

    // Create WhatsApp sender
    const sender = createSender(ChannelType.WHATSAPP) as TwilioWhatsAppSender;
    
    // Prepare test message with WhatsApp formatting
    let testContent = content;
    if (preserveFormatting) {
      testContent = `*${content}*\n\n_Sent at ${new Date().toLocaleString()}_\n\n✅ WhatsApp formatting test`;
    }
    
    const testMessage = {
      to,
      content: testContent,
      channel: ChannelType.WHATSAPP,
      attachments: includeAttachment ? [{
        id: 'test-attachment',
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        size: 50000,
        url: 'https://picsum.photos/300/200' // Random test image
      }] : undefined,
      metadata: {
        test: true,
        preserveFormatting,
        timestamp: new Date().toISOString()
      }
    };

    // Send test message
    const result = await sender.send(testMessage);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      externalId: result.externalId,
      error: result.error,
      metadata: result.metadata,
      testMessage: {
        to: testMessage.to,
        content: testMessage.content,
        hasAttachments: !!testMessage.attachments?.length,
        preserveFormatting
      }
    });
  } catch (error) {
    console.error('WhatsApp test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get WhatsApp sender configuration and status
 */
export async function GET() {
  try {
    // Import to ensure registration
    await import('@/lib/integrations/twilio');
    const sender = createSender(ChannelType.WHATSAPP) as TwilioWhatsAppSender;
    const features = sender.getSupportedFeatures();
    const retryConfig = sender.getRetryConfig();
    
    // Test Twilio configuration
    const { TwilioClient } = await import('@/lib/integrations/twilio/client');
    const isConfigValid = await TwilioClient.validateConfiguration();
    
    let accountInfo = null;
    if (isConfigValid) {
      try {
        accountInfo = await TwilioClient.getAccountInfo();
      } catch (error) {
        console.warn('Could not fetch account info:', error);
      }
    }

    return NextResponse.json({
      whatsappConfiguration: {
        isValid: isConfigValid,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'Not configured',
        sandboxMode: process.env.NODE_ENV === 'development' || 
                    process.env.TWILIO_WHATSAPP_NUMBER?.includes('sandbox'),
        accountInfo
      },
      features,
      retryConfig,
      formattingSupport: {
        bold: '*text*',
        italic: '_text_',
        code: '```text```',
        lineBreaks: 'Preserved',
        emojis: 'Supported 📱✅🎉'
      },
      testInstructions: {
        endpoint: '/api/integrations/twilio/whatsapp/test',
        method: 'POST',
        requiredFields: ['to'],
        optionalFields: ['content', 'preserveFormatting', 'includeAttachment'],
        example: {
          to: '+1234567890',
          content: 'Hello from Unified Inbox! 👋',
          preserveFormatting: true,
          includeAttachment: false
        },
        sandboxNote: 'In sandbox mode, only verified numbers can receive messages'
      }
    });
  } catch (error) {
    console.error('WhatsApp configuration check error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check WhatsApp configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}