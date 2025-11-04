/**
 * Twilio Webhook Handler
 * Handles inbound SMS/WhatsApp messages and status callbacks from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';
import { 
  ChannelType, 
  MessageDirection, 
  MessageStatus
} from '@/lib/integrations/types';
import type { RawChannelMessage } from '@/lib/services/message-normalization';
import {
  isTwilioWebhook,
  parseTwilioWebhook,
  extractChannelType,
  cleanPhoneNumber,
  extractMediaAttachments,
  isStatusCallback,
  mapTwilioStatus
} from '@/lib/integrations/twilio/webhook-utils';

/**
 * Twilio webhook payload interface
 */
interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  MediaUrl1?: string;
  MediaContentType1?: string;
  // Add more media fields as needed (Twilio supports up to 10)
  SmsStatus?: string;
  MessageStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  DateCreated?: string;
  DateSent?: string;
  DateUpdated?: string;
  Direction?: string;
  Price?: string;
  PriceUnit?: string;
  Uri?: string;
  NumSegments?: string;
  // WhatsApp specific fields
  ProfileName?: string;
  WaId?: string;
  SmsMessageSid?: string;
  // Additional fields
  [key: string]: string | undefined;
}





/**
 * Normalize Twilio webhook payload to RawChannelMessage
 */
function normalizeTwilioMessage(params: Record<string, string>): RawChannelMessage {
  const channelType = extractChannelType(params);
  const channel = channelType === 'WHATSAPP' ? ChannelType.WHATSAPP : ChannelType.SMS;
  const attachments = extractMediaAttachments(params);
  
  // Clean phone numbers (remove whatsapp: prefix for storage)
  const cleanFrom = cleanPhoneNumber(params.From || '');
  const cleanTo = cleanPhoneNumber(params.To || '');
  
  return {
    channel,
    externalId: params.MessageSid || '',
    from: cleanFrom,
    to: cleanTo,
    content: params.Body || '',
    timestamp: params.DateCreated ? new Date(params.DateCreated) : new Date(),
    metadata: {
      twilioAccountSid: params.AccountSid,
      messagingServiceSid: params.MessagingServiceSid,
      direction: params.Direction,
      price: params.Price,
      priceUnit: params.PriceUnit,
      numSegments: params.NumSegments,
      errorCode: params.ErrorCode,
      errorMessage: params.ErrorMessage,
      dateSent: params.DateSent,
      dateUpdated: params.DateUpdated,
      uri: params.Uri,
      // WhatsApp specific
      profileName: params.ProfileName,
      waId: params.WaId,
      // Raw payload for debugging
      rawPayload: params
    },
    attachments: attachments.length > 0 ? attachments : undefined,
    direction: MessageDirection.INBOUND,
    status: mapTwilioStatus(params.SmsStatus || params.MessageStatus) as MessageStatus
  };
}

/**
 * Handle Twilio webhook POST request
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body and headers
    const body = await request.text();
    
    // Get headers directly from request
    const headersObj: Record<string, string | null> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    
    // Validate this is a legitimate Twilio webhook
    const validation = isTwilioWebhook(headersObj, body, request.url);
    if (!validation.isValid) {
      console.warn('Invalid Twilio webhook:', validation.reason);
      return NextResponse.json(
        { error: validation.reason || 'Invalid webhook' },
        { status: 401 }
      );
    }
    
    // Parse the webhook parameters
    const params = parseTwilioWebhook(body);
    
    console.log('Received Twilio webhook:', {
      MessageSid: params.MessageSid,
      From: params.From,
      To: params.To,
      Body: params.Body?.substring(0, 50) + (params.Body?.length > 50 ? '...' : ''),
      Channel: extractChannelType(params),
      Status: params.SmsStatus || params.MessageStatus
    });
    
    // Check if this is a status callback or new message
    const isStatus = isStatusCallback(params);
    
    if (isStatus) {
      // Handle status callback
      await handleStatusCallback(params);
    } else {
      // Handle new inbound message
      await handleInboundMessage(params);
    }
    
    // Return TwiML response (empty response is fine for webhooks)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Twilio webhook error:', error);
    
    // Return success to prevent Twilio retries for our internal errors
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}

/**
 * Handle inbound message from Twilio
 */
async function handleInboundMessage(params: Record<string, string>): Promise<void> {
  try {
    // Normalize the Twilio payload to our format
    const rawMessage = normalizeTwilioMessage(params);
    
    // Process the message through our message service
    const result = await messageService.processInboundMessage(rawMessage);
    
    if (result.success) {
      console.log('Successfully processed inbound message:', {
        messageId: result.storedMessage?.id,
        conversationId: result.storedMessage?.conversationId,
        channel: rawMessage.channel,
        from: rawMessage.from
      });
    } else {
      console.error('Failed to process inbound message:', {
        errors: result.errors,
        warnings: result.warnings,
        externalId: params.MessageSid
      });
    }
  } catch (error) {
    console.error('Error handling inbound message:', error);
  }
}

/**
 * Handle status callback from Twilio
 */
async function handleStatusCallback(params: Record<string, string>): Promise<void> {
  try {
    const status = mapTwilioStatus(params.SmsStatus || params.MessageStatus) as MessageStatus;
    
    // Find and update the message status in our database
    console.log('Status callback received:', {
      MessageSid: params.MessageSid,
      Status: params.SmsStatus || params.MessageStatus,
      MappedStatus: status,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage
    });
    
    // Update message status in our database
    await messageService.updateMessageStatusByExternalId(params.MessageSid, status);
    
  } catch (error) {
    console.error('Error handling status callback:', error);
  }
}

/**
 * Handle GET request (for webhook URL verification)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Twilio webhook endpoint is active',
    timestamp: new Date().toISOString(),
    supportedMethods: ['POST'],
    supportedChannels: ['SMS', 'WhatsApp'],
    features: [
      'Signature validation',
      'Inbound message processing',
      'Status callbacks',
      'Media attachment support',
      'Message normalization'
    ]
  });
}