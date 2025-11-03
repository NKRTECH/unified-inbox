import { z } from 'zod';

// Enums
export const ChannelEnum = z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK']);
export const DirectionEnum = z.enum(['INBOUND', 'OUTBOUND']);
export const MessageStatusEnum = z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED']);

export type Channel = z.infer<typeof ChannelEnum>;
export type Direction = z.infer<typeof DirectionEnum>;
export type MessageStatus = z.infer<typeof MessageStatusEnum>;

// Message schemas
export const CreateMessageSchema = z.object({
  conversationId: z.string().cuid(),
  contactId: z.string().cuid(),
  senderId: z.string().cuid().optional(),
  channel: ChannelEnum,
  direction: DirectionEnum,
  content: z.string().min(1, 'Message content is required'),
  metadata: z.record(z.string(), z.any()).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string(),
    size: z.number().optional(),
  })).optional(),
  status: MessageStatusEnum.default('SENT'),
  scheduledFor: z.string().datetime().optional(),
});

export const UpdateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  status: MessageStatusEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string(),
    size: z.number().optional(),
  })).optional(),
  sentAt: z.string().datetime().optional(),
});

export const MessageQuerySchema = z.object({
  conversationId: z.string().cuid().optional(),
  contactId: z.string().cuid().optional(),
  channel: ChannelEnum.optional(),
  direction: DirectionEnum.optional(),
  status: MessageStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;
export type MessageQueryInput = z.infer<typeof MessageQuerySchema>;

// Response types
export interface MessageResponse {
  id: string;
  conversationId: string;
  contactId: string;
  senderId: string | null;
  channel: Channel;
  direction: Direction;
  content: string;
  metadata: Record<string, unknown> | null;
  attachments: Array<{
    url: string;
    type: string;
    name: string;
    size?: number;
  }> | null;
  status: MessageStatus;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string | null;
    email: string;
  };
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  conversation: {
    id: string;
    status: string;
    priority: string;
  };
}

export interface MessageListResponse {
  messages: MessageResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Channel-specific metadata types
export interface SMSMetadata {
  twilioSid?: string;
  fromNumber: string;
  toNumber: string;
  numSegments?: number;
}

export interface WhatsAppMetadata {
  twilioSid?: string;
  fromNumber: string;
  toNumber: string;
  profileName?: string;
}

export interface EmailMetadata {
  messageId?: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  ccAddresses?: string[];
  bccAddresses?: string[];
}

export interface TwitterMetadata {
  tweetId?: string;
  dmId?: string;
  username: string;
  screenName?: string;
}

export interface FacebookMetadata {
  messageId?: string;
  pageId: string;
  senderId: string;
  recipientId: string;
}