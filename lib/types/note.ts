import { z } from 'zod';

// Note creation schema
export const CreateNoteSchema = z.object({
  conversationId: z.string().cuid(),
  authorId: z.string().cuid(),
  content: z.string().min(1, 'Note content is required'),
  isPrivate: z.boolean().default(false),
  mentions: z.array(z.string()).default([]),
});

// Note update schema
export const UpdateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  isPrivate: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
});

// Note query schema
export const NoteQuerySchema = z.object({
  conversationId: z.string().cuid().optional(),
  authorId: z.string().cuid().optional(),
  isPrivate: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// TypeScript types
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;

// Note with relationships type
export interface NoteWithRelations {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  isPrivate: boolean;
  mentions: string[];
  encryptedData: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  conversation: {
    id: string;
    status: string;
    contact: {
      id: string;
      name: string | null;
    };
  };
}