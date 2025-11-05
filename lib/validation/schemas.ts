/**
 * Common Validation Schemas
 * 
 * Reusable Zod schemas for API validation
 */

import { z } from 'zod';

/**
 * Common field schemas
 */
export const schemas = {
  // IDs
  id: z.string().cuid('Invalid ID format'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Contact information
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  url: z.string().url('Invalid URL format'),
  
  // Text fields
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  shortText: z.string().min(1).max(500),
  mediumText: z.string().min(1).max(2000),
  longText: z.string().min(1).max(10000),
  
  // Dates
  date: z.coerce.date(),
  dateString: z.string().datetime('Invalid date format'),
  futureDate: z.coerce.date().refine(
    (date) => date > new Date(),
    'Date must be in the future'
  ),
  
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  
  // Sorting
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Boolean
  boolean: z.coerce.boolean(),
  optionalBoolean: z.coerce.boolean().optional(),
};

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: schemas.page,
  limit: schemas.limit,
});

/**
 * Offset pagination schema
 */
export const offsetPaginationSchema = z.object({
  limit: schemas.limit,
  offset: schemas.offset,
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: schemas.date,
  endDate: schemas.date,
}).refine(
  (data) => data.endDate >= data.startDate,
  'End date must be after start date'
);

/**
 * Search schema
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  ...paginationSchema.shape,
});

/**
 * Contact schemas
 */
export const createContactSchema = z.object({
  name: schemas.name.optional(),
  phone: schemas.phone.optional(),
  email: schemas.email.optional(),
  socialHandles: z.record(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).optional(),
}).refine(
  (data) => data.phone || data.email,
  'Either phone or email is required'
);

export const updateContactSchema = createContactSchema.partial();

export const contactQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  ...paginationSchema.shape,
});

/**
 * Message schemas
 */
export const channelEnum = z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK']);
export const directionEnum = z.enum(['INBOUND', 'OUTBOUND']);
export const messageStatusEnum = z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED']);

export const createMessageSchema = z.object({
  conversationId: schemas.id,
  contactId: schemas.id,
  channel: channelEnum,
  direction: directionEnum,
  content: z.string().min(1, 'Message content is required').max(10000),
  metadata: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    url: schemas.url,
    type: z.string(),
    name: z.string(),
    size: z.number(),
  })).optional(),
  scheduledFor: schemas.futureDate.optional(),
});

export const sendMessageSchema = z.object({
  contactId: schemas.id,
  channel: channelEnum,
  content: z.string().min(1, 'Message content is required').max(10000),
  attachments: z.array(z.object({
    url: schemas.url,
    type: z.string(),
    name: z.string(),
  })).optional(),
});

export const messageQuerySchema = z.object({
  conversationId: schemas.id.optional(),
  contactId: schemas.id.optional(),
  channel: channelEnum.optional(),
  direction: directionEnum.optional(),
  status: messageStatusEnum.optional(),
  startDate: schemas.dateString.optional(),
  endDate: schemas.dateString.optional(),
  ...paginationSchema.shape,
});

/**
 * Conversation schemas
 */
export const conversationStatusEnum = z.enum(['ACTIVE', 'RESOLVED', 'ARCHIVED']);
export const priorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const createConversationSchema = z.object({
  contactId: schemas.id,
  status: conversationStatusEnum.default('ACTIVE'),
  priority: priorityEnum.default('NORMAL'),
  assignedTo: schemas.id.optional(),
});

export const updateConversationSchema = z.object({
  status: conversationStatusEnum.optional(),
  priority: priorityEnum.optional(),
  assignedTo: schemas.id.optional(),
});

export const conversationQuerySchema = z.object({
  contactId: schemas.id.optional(),
  status: conversationStatusEnum.optional(),
  priority: priorityEnum.optional(),
  assignedTo: schemas.id.optional(),
  unreadOnly: schemas.optionalBoolean,
  ...paginationSchema.shape,
});

/**
 * Note schemas
 */
export const createNoteSchema = z.object({
  conversationId: schemas.id,
  content: z.string().min(1, 'Note content is required').max(10000),
  isPrivate: z.boolean().default(false),
  mentions: z.array(schemas.id).default([]),
});

export const updateNoteSchema = createNoteSchema.partial();

export const noteQuerySchema = z.object({
  conversationId: schemas.id.optional(),
  authorId: schemas.id.optional(),
  isPrivate: schemas.optionalBoolean,
  ...paginationSchema.shape,
});

/**
 * Template schemas
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  variables: z.array(z.string()).default([]),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateQuerySchema = z.object({
  category: z.string().optional(),
  isActive: schemas.optionalBoolean,
  search: z.string().optional(),
  ...paginationSchema.shape,
});

/**
 * Scheduled message schemas
 */
export const scheduleStatusEnum = z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED']);

export const createScheduledMessageSchema = z.object({
  messageId: schemas.id,
  scheduledFor: schemas.futureDate,
  templateId: schemas.id.optional(),
  variables: z.record(z.string()).optional(),
});

export const updateScheduledMessageSchema = z.object({
  scheduledFor: schemas.futureDate.optional(),
  status: scheduleStatusEnum.optional(),
});

export const scheduledMessageQuerySchema = z.object({
  status: scheduleStatusEnum.optional(),
  startDate: schemas.dateString.optional(),
  endDate: schemas.dateString.optional(),
  ...paginationSchema.shape,
});

/**
 * Analytics schemas
 */
export const analyticsQuerySchema = z.object({
  startDate: schemas.date,
  endDate: schemas.date,
  channel: channelEnum.optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
}).refine(
  (data) => data.endDate >= data.startDate,
  'End date must be after start date'
);

export const exportFormatEnum = z.enum(['csv', 'pdf', 'json']);

export const analyticsExportSchema = z.object({
  ...analyticsQuerySchema.shape,
  format: exportFormatEnum.default('csv'),
});

/**
 * User schemas
 */
export const userRoleEnum = z.enum(['VIEWER', 'EDITOR', 'ADMIN']);

export const updateUserRoleSchema = z.object({
  role: userRoleEnum,
});

export const userQuerySchema = z.object({
  role: userRoleEnum.optional(),
  search: z.string().optional(),
  ...paginationSchema.shape,
});

/**
 * Webhook schemas
 */
export const twilioWebhookSchema = z.object({
  MessageSid: z.string(),
  AccountSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string().optional(),
  NumMedia: z.coerce.number().optional(),
  MessageStatus: z.string().optional(),
  SmsStatus: z.string().optional(),
});

/**
 * File upload schemas
 */
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  url: schemas.url.optional(),
});

/**
 * Bulk operation schemas
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(schemas.id).min(1, 'At least one ID is required').max(100, 'Maximum 100 items'),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(schemas.id).min(1).max(100),
  data: z.record(z.any()),
});
