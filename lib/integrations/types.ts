/**
 * Core types and interfaces for the integration factory pattern
 */

export enum ChannelType {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK'
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

export enum MessageStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

/**
 * Unified message format for cross-channel communication
 */
export interface UnifiedMessage {
  id?: string;
  conversationId: string;
  contactId: string;
  senderId?: string;
  channel: ChannelType;
  direction: MessageDirection;
  content: string;
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt?: Date;
}

/**
 * Outbound message for sending through channels
 */
export interface OutboundMessage {
  to: string;
  content: string;
  channel: ChannelType;
  attachments?: MessageAttachment[];
  metadata?: Record<string, unknown>;
}

/**
 * Message attachment structure
 */
export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

/**
 * Contact information for validation
 */
export interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  socialHandles?: Record<string, string>;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * Result of a send operation
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Channel-specific features and capabilities
 */
export interface ChannelFeatures {
  supportsAttachments: boolean;
  supportsRichText: boolean;
  maxMessageLength: number;
  supportedAttachmentTypes: string[];
  maxAttachmentSize: number;
  supportsDeliveryReceipts: boolean;
  supportsReadReceipts: boolean;
  supportsTypingIndicators: boolean;
}

/**
 * Webhook configuration for channel setup
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
}

/**
 * Validation result for recipients and messages
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Raw message from external channels (before normalization)
 */
export interface ChannelMessage {
  channel: ChannelType;
  externalId: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  attachments?: MessageAttachment[];
}