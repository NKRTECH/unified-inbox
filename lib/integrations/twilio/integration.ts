/**
 * Twilio integration for webhook handling and setup
 */

import { ChannelIntegration, ChannelSender } from '../interfaces';
import {
  ChannelType,
  WebhookConfig,
  UnifiedMessage,
  MessageDirection,
  MessageStatus
} from '../types';
import { getTwilioClient } from './client';
import { TwilioSmsSender } from './sms-sender';
import { TwilioWhatsAppSender } from './whatsapp-sender';
import crypto from 'crypto';

/**
 * Twilio webhook payload interface
 */
interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  MessageStatus?: string;
  SmsStatus?: string;
  SmsSid?: string;
  SmsMessageSid?: string;
  [key: string]: string | undefined;
}

export class TwilioSmsIntegration implements ChannelIntegration {
  private client = getTwilioClient();

  /**
   * Create an SMS sender instance
   */
  createSender(): ChannelSender {
    return new TwilioSmsSender();
  }

  /**
   * Set up webhook configuration for SMS
   */
  async setupWebhook(config: WebhookConfig): Promise<void> {
    try {
      // Get all phone numbers associated with the account
      const phoneNumbers = await this.client.incomingPhoneNumbers.list();
      
      // Update webhook URL for each phone number
      for (const phoneNumber of phoneNumbers) {
        await this.client.incomingPhoneNumbers(phoneNumber.sid).update({
          smsUrl: config.url,
          smsMethod: 'POST',
          statusCallback: `${config.url}/status`,
          statusCallbackMethod: 'POST'
        });
      }
      
      console.log(`SMS webhook configured for ${phoneNumbers.length} phone numbers`);
    } catch (error) {
      console.error('Failed to setup SMS webhook:', error);
      throw error;
    }
  }

  /**
   * Validate incoming webhook signature
   */
  validateWebhook(payload: unknown, signature: string): boolean {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        console.error('TWILIO_AUTH_TOKEN not found for webhook validation');
        return false;
      }

      // Twilio webhook validation logic
      const webhookUrl = process.env.TWILIO_WEBHOOK_URL || '';
      const payloadString = new URLSearchParams(payload as Record<string, string>).toString();
      
      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(webhookUrl + payloadString)
        .digest('base64');

      const signatureBuffer = Buffer.from(signature);
      const expectedSignatureBuffer = Buffer.from(expectedSignature);
      
      if (signatureBuffer.length !== expectedSignatureBuffer.length) {
        console.error('Signature length mismatch in webhook validation');
        return false;
      }
      
      return crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Process incoming SMS webhook
   */
  async processWebhook(payload: unknown): Promise<UnifiedMessage[]> {
    const twilioPayload = payload as TwilioWebhookPayload;
    
    // Handle status callbacks vs new messages
    if (twilioPayload.MessageStatus || twilioPayload.SmsStatus) {
      // This is a status update, not a new message
      return [];
    }

    const message: UnifiedMessage = {
      conversationId: '', // Will be set by the message service
      contactId: '', // Will be resolved by the message service
      channel: ChannelType.SMS,
      direction: MessageDirection.INBOUND,
      content: twilioPayload.Body || '',
      status: MessageStatus.DELIVERED,
      metadata: {
        externalId: twilioPayload.MessageSid,
        from: twilioPayload.From,
        to: twilioPayload.To,
        accountSid: twilioPayload.AccountSid,
        numMedia: twilioPayload.NumMedia ? parseInt(twilioPayload.NumMedia) : 0
      },
      createdAt: new Date()
    };

    // Handle media attachments (MMS)
    if (twilioPayload.NumMedia && parseInt(twilioPayload.NumMedia) > 0) {
      message.attachments = [];
      for (let i = 0; i < parseInt(twilioPayload.NumMedia); i++) {
        const mediaUrl = twilioPayload[`MediaUrl${i}`];
        const contentType = twilioPayload[`MediaContentType${i}`];
        
        if (mediaUrl && contentType) {
          message.attachments.push({
            id: `${twilioPayload.MessageSid}_${i}`,
            filename: `attachment_${i}`,
            contentType,
            size: 0, // Size not provided by Twilio
            url: mediaUrl
          });
        }
      }
    }

    return [message];
  }

  /**
   * Get the channel type
   */
  getChannelType(): ChannelType {
    return ChannelType.SMS;
  }
}

export class TwilioWhatsAppIntegration implements ChannelIntegration {
  private client = getTwilioClient();

  /**
   * Create a WhatsApp sender instance
   */
  createSender(): ChannelSender {
    return new TwilioWhatsAppSender();
  }

  /**
   * Set up webhook configuration for WhatsApp
   */
  async setupWebhook(config: WebhookConfig): Promise<void> {
    try {
      // For WhatsApp, we need to configure the sandbox webhook
      // This is typically done through the Twilio Console for sandbox mode
      console.log('WhatsApp webhook setup - configure in Twilio Console for sandbox mode');
      console.log(`Webhook URL: ${config.url}`);
      
      // In production, you would use the WhatsApp Business API to configure webhooks
      // await this.client.conversations.v1.configuration().webhooks.create({
      //   target: 'webhook',
      //   'webhook.url': config.url,
      //   'webhook.method': 'POST'
      // });
    } catch (error) {
      console.error('Failed to setup WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Validate incoming webhook signature (same as SMS)
   */
  validateWebhook(payload: unknown, signature: string): boolean {
    // WhatsApp uses the same validation as SMS for Twilio
    const smsIntegration = new TwilioSmsIntegration();
    return smsIntegration.validateWebhook(payload, signature);
  }

  /**
   * Process incoming WhatsApp webhook
   */
  async processWebhook(payload: unknown): Promise<UnifiedMessage[]> {
    const twilioPayload = payload as TwilioWebhookPayload;
    
    // Handle status callbacks vs new messages
    if (twilioPayload.MessageStatus || twilioPayload.SmsStatus) {
      // This is a status update, not a new message
      return [];
    }

    const message: UnifiedMessage = {
      conversationId: '', // Will be set by the message service
      contactId: '', // Will be resolved by the message service
      channel: ChannelType.WHATSAPP,
      direction: MessageDirection.INBOUND,
      content: twilioPayload.Body || '',
      status: MessageStatus.DELIVERED,
      metadata: {
        externalId: twilioPayload.MessageSid,
        from: twilioPayload.From?.replace('whatsapp:', ''),
        to: twilioPayload.To?.replace('whatsapp:', ''),
        accountSid: twilioPayload.AccountSid,
        numMedia: twilioPayload.NumMedia ? parseInt(twilioPayload.NumMedia) : 0,
        channel: 'whatsapp'
      },
      createdAt: new Date()
    };

    // Handle media attachments
    if (twilioPayload.NumMedia && parseInt(twilioPayload.NumMedia) > 0) {
      message.attachments = [];
      for (let i = 0; i < parseInt(twilioPayload.NumMedia); i++) {
        const mediaUrl = twilioPayload[`MediaUrl${i}`];
        const contentType = twilioPayload[`MediaContentType${i}`];
        
        if (mediaUrl && contentType) {
          message.attachments.push({
            id: `${twilioPayload.MessageSid}_${i}`,
            filename: `whatsapp_attachment_${i}`,
            contentType,
            size: 0, // Size not provided by Twilio
            url: mediaUrl
          });
        }
      }
    }

    return [message];
  }

  /**
   * Get the channel type
   */
  getChannelType(): ChannelType {
    return ChannelType.WHATSAPP;
  }
}