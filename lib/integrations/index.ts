/**
 * Integration factory pattern exports
 * 
 * This module provides the core integration factory pattern for multi-channel
 * communication. It includes interfaces, base classes, and factory functions
 * for creating channel senders and integrations.
 */

// Core types and enums
export {
  ChannelType,
  MessageDirection,
  MessageStatus,
  type UnifiedMessage,
  type OutboundMessage,
  type MessageAttachment,
  type Contact,
  type SendResult,
  type ChannelFeatures,
  type WebhookConfig,
  type ValidationResult,
  type ChannelMessage
} from './types';

// Interfaces
export {
  type ChannelSender,
  type ChannelIntegration,
  type MessageProcessor
} from './interfaces';

// Base classes
export {
  BaseChannelSender,
  BaseChannelIntegration,
  BaseMessageProcessor
} from './base';

// Factory functions
export {
  createSender,
  createIntegration,
  registerSender,
  registerIntegration,
  getRegisteredChannels,
  isChannelRegistered,
  getAvailableSenders,
  validateRequiredChannels,
  integrationRegistry
} from './factory';

/**
 * Example usage:
 * 
 * ```typescript
 * import { createSender, ChannelType } from '@/lib/integrations';
 * 
 * // Create a sender for SMS
 * const smsSender = createSender(ChannelType.SMS);
 * 
 * // Send a message
 * const result = await smsSender.send({
 *   to: '+1234567890',
 *   content: 'Hello from unified inbox!',
 *   channel: ChannelType.SMS
 * });
 * ```
 */