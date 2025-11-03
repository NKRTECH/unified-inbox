/**
 * Core interfaces for the integration factory pattern
 */

import {
  ChannelType,
  OutboundMessage,
  SendResult,
  Contact,
  ChannelFeatures,
  WebhookConfig,
  ValidationResult,
  ChannelMessage,
  UnifiedMessage
} from './types';

/**
 * Interface for sending messages through a specific channel
 */
export interface ChannelSender {
  /**
   * Send a message through this channel
   */
  send(message: OutboundMessage): Promise<SendResult>;

  /**
   * Validate if a recipient is valid for this channel
   */
  validateRecipient(contact: Contact): ValidationResult;

  /**
   * Get the features and capabilities supported by this channel
   */
  getSupportedFeatures(): ChannelFeatures;

  /**
   * Get the channel type this sender handles
   */
  getChannelType(): ChannelType;
}

/**
 * Interface for channel integration setup and webhook handling
 */
export interface ChannelIntegration {
  /**
   * Create a sender instance for this channel
   */
  createSender(): ChannelSender;

  /**
   * Set up webhook configuration for receiving messages
   */
  setupWebhook(config: WebhookConfig): Promise<void>;

  /**
   * Validate incoming webhook payload and signature
   */
  validateWebhook(payload: unknown, signature: string): boolean;

  /**
   * Process incoming webhook and normalize to unified format
   */
  processWebhook(payload: unknown): Promise<UnifiedMessage[]>;

  /**
   * Get the channel type this integration handles
   */
  getChannelType(): ChannelType;
}

/**
 * Interface for normalizing raw channel messages
 */
export interface MessageProcessor {
  /**
   * Normalize a raw channel message to unified format
   */
  normalize(rawMessage: ChannelMessage): UnifiedMessage;

  /**
   * Validate a unified message
   */
  validate(message: UnifiedMessage): ValidationResult;

  /**
   * Extract metadata from channel-specific message
   */
  extractMetadata(rawMessage: ChannelMessage): Record<string, unknown>;
}