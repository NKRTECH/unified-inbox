import { Contact } from "@prisma/client";

// Base contact type from Prisma
export type ContactType = Contact;

// Contact creation input (without id, createdAt, updatedAt)
export type CreateContactInput = Omit<Contact, "id" | "createdAt" | "updatedAt">;

// Contact update input (all fields optional except id)
export type UpdateContactInput = Partial<Omit<Contact, "id" | "createdAt" | "updatedAt">>;

// Contact with additional computed fields
export interface ContactWithStats extends Contact {
  messageCount?: number;
  lastMessageAt?: Date;
  conversationCount?: number;
}

// Contact search result
export interface ContactSearchResult {
  query: string;
  results: Contact[];
  count: number;
}

// Contact list response with pagination
export interface ContactListResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Social media handles structure
export interface SocialHandles {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  [key: string]: string | undefined;
}

// Custom fields structure (flexible key-value pairs)
export interface CustomFields {
  [key: string]: string | number | boolean | null;
}

// Contact filter options
export interface ContactFilters {
  search?: string;
  tags?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Contact sort options
export type ContactSortField = "name" | "email" | "phone" | "createdAt" | "updatedAt";
export type ContactSortOrder = "asc" | "desc";

export interface ContactSort {
  field: ContactSortField;
  order: ContactSortOrder;
}