import { z } from 'zod';

// Schedule status enum
export const ScheduleStatusEnum = z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED']);

// Scheduled message creation schema
export const CreateScheduledMessageSchema = z.object({
  messageId: z.string().cuid(),
  scheduledFor: z.string().datetime().refine(
    (val) => {
      const date = new Date(val);
      return date.getTime() > Date.now();
    },
    { message: "scheduledFor must be a future date/time" }
  ),
  templateId: z.string().optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
});

// Scheduled message update schema
export const UpdateScheduledMessageSchema = z.object({
  scheduledFor: z.string().datetime().optional().refine(
    (val) => {
      if (!val) return true; // Optional field, allow undefined/null
      const date = new Date(val);
      return date.getTime() > Date.now();
    },
    { message: "scheduledFor must be a future date/time" }
  ),
  status: ScheduleStatusEnum.optional(),
  templateId: z.string().optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
});

// Scheduled message query schema
export const ScheduledMessageQuerySchema = z.object({
  status: ScheduleStatusEnum.optional(),
  scheduledAfter: z.string().datetime().optional(),
  scheduledBefore: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// TypeScript types
export type CreateScheduledMessageInput = z.infer<typeof CreateScheduledMessageSchema>;
export type UpdateScheduledMessageInput = z.infer<typeof UpdateScheduledMessageSchema>;
export type ScheduledMessageQuery = z.infer<typeof ScheduledMessageQuerySchema>;
export type ScheduleStatus = z.infer<typeof ScheduleStatusEnum>;

// Scheduled message with relationships type
export interface ScheduledMessageWithRelations {
  id: string;
  messageId: string;
  scheduledFor: Date;
  status: ScheduleStatus;
  templateId: string | null;
  variables: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  message: {
    id: string;
    content: string;
    channel: string;
    direction: string;
    status: string;
    conversation: {
      id: string;
      contact: {
        id: string;
        name: string | null;
        phone: string | null;
        email: string | null;
      };
    };
    sender: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  };
}