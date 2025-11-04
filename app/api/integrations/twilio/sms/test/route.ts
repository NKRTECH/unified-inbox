/**
 * Twilio SMS test endpoint
 * Provides testing capabilities for SMS sending functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSender } from '@/lib/integrations/factory';
import { ChannelType } from '@/lib/integrations/types';
import { TwilioSmsSender } from '@/lib/integrations/twilio/sms-sender';

/**
 * Test message schema
 */
const TestSmsSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
  content: z.string().min(1).max(160).default('Test message from Unified Inbox'),
  includeAttachment: z.boolean().default(false)
});

/**
 * Test SMS sending functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = TestSmsSchema.safeParse(body);
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

    const { to, content, includeAttachment } = validation.data;

    // Create SMS sender
    const sender = createSender(ChannelType.SMS) as TwilioSmsSender;
    
    // Prepare test message
    const testMessage = {
      to,
      content: `${content} - Sent at ${new Date().toISOString()}`,
      channel: ChannelType.SMS,
      attachments: includeAttachment ? [{
        id: 'test-attachment',
        filename: 'test.txt',
        contentType: 'text/plain',
        size: 100,
        url: 'https://demo.twilio.com/docs/classic.mp3' // Twilio demo file
      }] : undefined,
      metadata: {
        test: true,
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
        hasAttachments: !!testMessage.attachments?.length
      }
    });
  } catch (error) {
    console.error('SMS test error:', error);
    
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
 * Get SMS sender configuration and status
 */
export async function GET() {
  try {
    const sender = createSender(ChannelType.SMS) as TwilioSmsSender;
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
      smsConfiguration: {
        isValid: isConfigValid,
        fromNumber: process.env.TWILIO_FROM_NUMBER || 'Not configured',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'Not configured',
        accountInfo
      },
      features,
      retryConfig,
      testInstructions: {
        endpoint: '/api/integrations/twilio/sms/test',
        method: 'POST',
        requiredFields: ['to'],
        optionalFields: ['content', 'includeAttachment'],
        example: {
          to: '+1234567890',
          content: 'Hello from Unified Inbox!',
          includeAttachment: false
        }
      }
    });
  } catch (error) {
    console.error('SMS configuration check error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check SMS configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}