/**
 * Message utility functions
 * 
 * Helper functions for message processing, validation, and formatting
 */

import {
  ChannelType,
  MessageDirection,
  MessageStatus,
  UnifiedMessage,
  MessageAttachment
} from '@/lib/integrations/types';

/**
 * Message formatting options
 */
export interface MessageFormatOptions {
  maxLength?: number;
  stripHtml?: boolean;
  preserveLineBreaks?: boolean;
  truncateIndicator?: string;
}

/**
 * Attachment validation result
 */
export interface AttachmentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Format message content for display
 */
export function formatMessageContent(
  content: string,
  channel: ChannelType,
  options: MessageFormatOptions = {}
): string {
  let formatted = content;

  // Strip HTML if requested or if channel doesn't support it
  if (options.stripHtml || !channelSupportsHtml(channel)) {
    formatted = stripHtmlTags(formatted);
  }

  // Preserve line breaks if requested
  if (options.preserveLineBreaks) {
    formatted = formatted.replace(/\n/g, '<br>');
  }

  // Truncate if max length specified
  if (options.maxLength && formatted.length > options.maxLength) {
    const indicator = options.truncateIndicator || '...';
    formatted = formatted.substring(0, options.maxLength - indicator.length) + indicator;
  }

  return formatted.trim();
}

/**
 * Validate message content for a specific channel
 */
export function validateMessageContent(content: string, channel: ChannelType): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('Message content cannot be empty');
    return { isValid: false, errors, warnings };
  }

  const maxLength = getChannelMaxLength(channel);
  if (content.length > maxLength) {
    if (channel === ChannelType.SMS) {
      errors.push(`SMS messages cannot exceed ${maxLength} characters`);
    } else {
      warnings.push(`Message exceeds recommended length for ${channel} (${content.length}/${maxLength})`);
    }
  }

  // Check for unsupported formatting
  if (containsRichText(content) && !channelSupportsRichText(channel)) {
    warnings.push(`Rich text formatting may not be supported on ${channel}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate message attachments for a channel
 */
export function validateAttachments(
  attachments: MessageAttachment[],
  channel: ChannelType
): AttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!attachments || attachments.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Check if channel supports attachments
  if (!channelSupportsAttachments(channel)) {
    errors.push(`${channel} does not support attachments`);
    return { isValid: false, errors, warnings };
  }

  const maxAttachments = getChannelMaxAttachments(channel);
  if (attachments.length > maxAttachments) {
    errors.push(`${channel} supports maximum ${maxAttachments} attachments`);
  }

  const maxSize = getChannelMaxAttachmentSize(channel);
  const supportedTypes = getChannelSupportedAttachmentTypes(channel);

  for (const attachment of attachments) {
    // Validate required fields
    if (!attachment.url || !attachment.filename) {
      errors.push('Attachment must have URL and filename');
      continue;
    }

    // Validate size
    if (attachment.size > maxSize) {
      errors.push(`Attachment ${attachment.filename} exceeds maximum size of ${formatFileSize(maxSize)}`);
    }

    // Validate type
    if (!supportedTypes.includes(attachment.contentType)) {
      warnings.push(`Attachment type ${attachment.contentType} may not be supported on ${channel}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extract phone number from various formats
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Add + if not present and starts with country code
  if (!normalized.startsWith('+') && normalized.length > 10) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Extract email from various formats
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate message preview for display in lists
 */
export function generateMessagePreview(
  message: UnifiedMessage,
  maxLength = 100
): string {
  let preview = message.content;

  // Strip HTML tags
  preview = stripHtmlTags(preview);

  // Replace line breaks with spaces
  preview = preview.replace(/\n/g, ' ');

  // Truncate if too long
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength - 3) + '...';
  }

  // Add attachment indicator
  if (message.attachments && message.attachments.length > 0) {
    const attachmentCount = message.attachments.length;
    const indicator = attachmentCount === 1 ? '📎' : `📎${attachmentCount}`;
    preview = `${indicator} ${preview}`;
  }

  return preview;
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channel: ChannelType): string {
  switch (channel) {
    case ChannelType.SMS: return 'SMS';
    case ChannelType.WHATSAPP: return 'WhatsApp';
    case ChannelType.EMAIL: return 'Email';
    case ChannelType.TWITTER: return 'Twitter';
    case ChannelType.FACEBOOK: return 'Facebook';
    default: return channel;
  }
}

/**
 * Get channel icon/emoji
 */
export function getChannelIcon(channel: ChannelType): string {
  switch (channel) {
    case ChannelType.SMS: return '💬';
    case ChannelType.WHATSAPP: return '📱';
    case ChannelType.EMAIL: return '📧';
    case ChannelType.TWITTER: return '🐦';
    case ChannelType.FACEBOOK: return '👥';
    default: return '💬';
  }
}

/**
 * Get message status display info
 */
export function getMessageStatusInfo(status: MessageStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case MessageStatus.DRAFT:
      return { label: 'Draft', color: 'gray', icon: '📝' };
    case MessageStatus.SCHEDULED:
      return { label: 'Scheduled', color: 'blue', icon: '⏰' };
    case MessageStatus.SENT:
      return { label: 'Sent', color: 'green', icon: '✓' };
    case MessageStatus.DELIVERED:
      return { label: 'Delivered', color: 'green', icon: '✓✓' };
    case MessageStatus.READ:
      return { label: 'Read', color: 'blue', icon: '👁️' };
    case MessageStatus.FAILED:
      return { label: 'Failed', color: 'red', icon: '❌' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '?' };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if content contains rich text formatting
 */
export function containsRichText(content: string): boolean {
  // Check for HTML tags
  if (/<[^>]+>/.test(content)) return true;
  
  // Check for Markdown formatting
  if (/\*\*.*\*\*|\*.*\*|__.*__|_.*_/.test(content)) return true;
  
  return false;
}

/**
 * Strip HTML tags from content
 */
export function stripHtmlTags(content: string): string {
  return content.replace(/<[^>]*>/g, '');
}

// Channel capability helper functions
function channelSupportsHtml(channel: ChannelType): boolean {
  return channel === ChannelType.EMAIL;
}

function channelSupportsRichText(channel: ChannelType): boolean {
  return [ChannelType.EMAIL, ChannelType.WHATSAPP].includes(channel);
}

function channelSupportsAttachments(channel: ChannelType): boolean {
  return [ChannelType.WHATSAPP, ChannelType.EMAIL, ChannelType.FACEBOOK].includes(channel);
}

function getChannelMaxLength(channel: ChannelType): number {
  switch (channel) {
    case ChannelType.SMS: return 160;
    case ChannelType.WHATSAPP: return 4096;
    case ChannelType.TWITTER: return 280;
    case ChannelType.FACEBOOK: return 2000;
    case ChannelType.EMAIL: return 100000;
    default: return 1000;
  }
}

function getChannelMaxAttachments(channel: ChannelType): number {
  switch (channel) {
    case ChannelType.WHATSAPP: return 10;
    case ChannelType.EMAIL: return 25;
    case ChannelType.FACEBOOK: return 5;
    default: return 0;
  }
}

function getChannelMaxAttachmentSize(channel: ChannelType): number {
  switch (channel) {
    case ChannelType.WHATSAPP: return 16 * 1024 * 1024; // 16MB
    case ChannelType.EMAIL: return 25 * 1024 * 1024; // 25MB
    case ChannelType.FACEBOOK: return 8 * 1024 * 1024; // 8MB
    default: return 0;
  }
}

function getChannelSupportedAttachmentTypes(channel: ChannelType): string[] {
  switch (channel) {
    case ChannelType.WHATSAPP:
      return [
        'image/jpeg', 'image/png', 'image/gif',
        'video/mp4', 'video/3gpp',
        'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
        'application/pdf',
        'text/plain', 'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
    case ChannelType.EMAIL:
      return ['*/*']; // Email supports most file types
    case ChannelType.FACEBOOK:
      return [
        'image/jpeg', 'image/png', 'image/gif',
        'video/mp4', 'video/avi', 'video/mov'
      ];
    default:
      return [];
  }
}