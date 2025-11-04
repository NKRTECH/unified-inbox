/**
 * Twilio integration exports and registration
 */

export { TwilioClient, getTwilioClient, getTwilioConfig } from './client';
export { TwilioSmsSender } from './sms-sender';
export { TwilioWhatsAppSender } from './whatsapp-sender';
export { TwilioSmsIntegration, TwilioWhatsAppIntegration } from './integration';

// Auto-register Twilio integrations with the factory
import { registerSender, registerIntegration } from '../factory';
import { ChannelType } from '../types';
import { TwilioSmsSender } from './sms-sender';
import { TwilioWhatsAppSender } from './whatsapp-sender';
import { TwilioSmsIntegration, TwilioWhatsAppIntegration } from './integration';

/**
 * Register Twilio senders and integrations with the factory
 */
export function registerTwilioIntegrations(): void {
  // Register SMS sender and integration
  registerSender(ChannelType.SMS, () => new TwilioSmsSender());
  registerIntegration(ChannelType.SMS, () => new TwilioSmsIntegration());

  // Register WhatsApp sender and integration
  registerSender(ChannelType.WHATSAPP, () => new TwilioWhatsAppSender());
  registerIntegration(ChannelType.WHATSAPP, () => new TwilioWhatsAppIntegration());

  console.log('Twilio integrations registered: SMS, WhatsApp');
}

// Auto-register when this module is imported
registerTwilioIntegrations();