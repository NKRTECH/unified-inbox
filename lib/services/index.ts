/**
 * Services index
 * 
 * Exports all service modules for the unified inbox system
 */

// Message services
export {
  MessageNormalizationService,
  type RawChannelMessage,
  type RawAttachment,
  type NormalizedMessage,
  type ProcessingResult,
  type ContactResolution
} from './message-normalization';

export {
  MessageService,
  messageService,
  type MessageProcessingOptions,
  type BatchProcessingResult,
  type MessageQueryOptions
} from './message-service';

// Re-export message utilities
export * from '../utils/message-utils';

/**
 * Example usage:
 * 
 * ```typescript
 * import { messageService, MessageService } from '@/lib/services';
 * 
 * // Process an inbound webhook message
 * const result = await messageService.processInboundMessage({
 *   channel: ChannelType.SMS,
 *   externalId: 'sms_123',
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   content: 'Hello from customer',
 *   timestamp: new Date(),
 *   metadata: { provider: 'twilio' }
 * });
 * 
 * // Send an outbound message
 * const sendResult = await messageService.sendMessage({
 *   to: '+1234567890',
 *   content: 'Hello from support team',
 *   channel: ChannelType.SMS
 * });
 * ```
 */