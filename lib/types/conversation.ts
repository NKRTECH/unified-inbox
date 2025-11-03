import { Conversation, Contact, User } from "@prisma/client";

// Base conversation type from Prisma
export type ConversationType = Conversation;

// Conversation with related data
export interface ConversationWithRelations extends Conversation {
  contact: Pick<Contact, "id" | "name" | "email" | "phone">;
  assignedUser?: Pick<User, "id" | "name" | "email"> | null;
}

// Conversation with full contact details
export interface ConversationWithFullContact extends Conversation {
  contact: Pick<Contact, "id" | "name" | "email" | "phone" | "socialHandles" | "tags" | "customFields">;
  assignedUser?: Pick<User, "id" | "name" | "email" | "role"> | null;
}

// Conversation creation input
export type CreateConversationInput = {
  contactId: string;
  status?: "ACTIVE" | "RESOLVED" | "ARCHIVED";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignedTo?: string;
};

// Conversation update input
export type UpdateConversationInput = {
  status?: "ACTIVE" | "RESOLVED" | "ARCHIVED";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignedTo?: string | null;
};

// Conversation list response with pagination
export interface ConversationListResponse {
  conversations: ConversationWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Conversations by contact response
export interface ConversationsByContactResponse {
  contact: Pick<Contact, "id" | "name" | "email" | "phone">;
  conversations: (Conversation & {
    assignedUser?: Pick<User, "id" | "name" | "email"> | null;
  })[];
  count: number;
}

// Conversation status enum
export type ConversationStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

// Priority enum
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

// Conversation filter options
export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: Priority;
  assignedTo?: string;
  contactId?: string;
}

// Conversation sort options
export type ConversationSortField = "createdAt" | "updatedAt" | "status" | "priority";
export type ConversationSortOrder = "asc" | "desc";

export interface ConversationSort {
  field: ConversationSortField;
  order: ConversationSortOrder;
}

// Conversation statistics
export interface ConversationStats {
  total: number;
  active: number;
  resolved: number;
  archived: number;
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}