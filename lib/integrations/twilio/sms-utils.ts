/**
 * SMS utility functions for Twilio integration
 */

import { MessageAttachment } from '../types';

/**
 * SMS message formatting options
 */
export interface SmsFormatOptions {
  maxLength?: number;
  truncateWithEllipsis?: boolean;
  removeFormatting?: boolean;
}

/**
 * SMS segment calculation result
 */
export interface SmsSegmentInfo {
  segments: number;
  charactersPerSegment: number;
  totalCharacters: number;
  encoding: 'GSM' | 'UCS2';
  isConcatenated: boolean;
}

/**
 * Format message content for SMS sending
 */
export function formatSmsContent(
  content: string, 
  options: SmsFormatOptions = {}
): string {
  const {
    maxLength = 1600,
    truncateWithEllipsis = true,
    removeFormatting = true
  } = options;

  let formatted = content;

  // Remove rich text formatting if requested
  if (removeFormatting) {
    formatted = formatted
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/`(.*?)`/g, '$1') // Remove code markdown
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links, keep text
  }

  // Normalize whitespace
  formatted = formatted
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces and tabs, preserve newlines
    .trim();

  // Truncate if necessary
  if (formatted.length > maxLength) {
    if (truncateWithEllipsis) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    } else {
      formatted = formatted.substring(0, maxLength);
    }
  }

  return formatted;
}

/**
 * Calculate SMS segments for a message
 */
export function calculateSmsSegments(content: string): SmsSegmentInfo {
  // Check if message contains non-GSM characters
  const gsmCharacters = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\^{}\[~\]|€]*$/;
  const isGsm = gsmCharacters.test(content);
  
  const encoding = isGsm ? 'GSM' : 'UCS2';
  const singleSmsLimit = isGsm ? 160 : 70;
  const concatenatedLimit = isGsm ? 153 : 67;
  
  const length = content.length;
  
  if (length <= singleSmsLimit) {
    return {
      segments: 1,
      charactersPerSegment: singleSmsLimit,
      totalCharacters: length,
      encoding,
      isConcatenated: false
    };
  }
  
  const segments = Math.ceil(length / concatenatedLimit);
  
  return {
    segments,
    charactersPerSegment: concatenatedLimit,
    totalCharacters: length,
    encoding,
    isConcatenated: true
  };
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber: string): {
  isValid: boolean;
  formatted?: string;
  error?: string;
} {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  if (e164Regex.test(cleaned)) {
    return {
      isValid: true,
      formatted: cleaned
    };
  }
  
  // Try to format common US numbers
  if (/^\d{10}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+1${cleaned}`
    };
  }
  
  return {
    isValid: false,
    error: 'Phone number must be in E.164 format (e.g., +1234567890)'
  };
}

/**
 * Validate MMS attachments
 */
export function validateMmsAttachments(attachments: MessageAttachment[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // MMS limits
  const maxAttachments = 10;
  const maxTotalSize = 5 * 1024 * 1024; // 5MB
  const maxIndividualSize = 5 * 1024 * 1024; // 5MB per file
  
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/3gpp',
    'audio/mpeg',
    'audio/mp4',
    'audio/amr',
    'text/plain',
    'text/x-vcard',
    'application/pdf'
  ];
  
  if (attachments.length > maxAttachments) {
    errors.push(`Too many attachments (${attachments.length}). MMS supports maximum ${maxAttachments} attachments.`);
  }
  
  let totalSize = 0;
  
  for (const attachment of attachments) {
    totalSize += attachment.size;
    
    if (attachment.size > maxIndividualSize) {
      errors.push(`Attachment "${attachment.filename}" is too large (${Math.round(attachment.size / 1024 / 1024)}MB). Maximum size is 5MB.`);
    }
    
    if (!supportedTypes.includes(attachment.contentType)) {
      errors.push(`Unsupported attachment type: ${attachment.contentType} for file "${attachment.filename}"`);
    }
    
    // Warn about large files
    if (attachment.size > 1024 * 1024) {
      warnings.push(`Large attachment "${attachment.filename}" (${Math.round(attachment.size / 1024 / 1024)}MB) may take longer to send.`);
    }
  }
  
  if (totalSize > maxTotalSize) {
    errors.push(`Total attachment size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds 5MB limit.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate SMS preview for UI display
 */
export function generateSmsPreview(
  content: string, 
  attachments?: MessageAttachment[]
): {
  preview: string;
  segmentInfo: SmsSegmentInfo;
  hasAttachments: boolean;
  estimatedCost?: string;
} {
  const formattedContent = formatSmsContent(content);
  const segmentInfo = calculateSmsSegments(formattedContent);
  const hasAttachments = !!(attachments && attachments.length > 0);
  
  let preview = formattedContent;
  if (preview.length > 100) {
    preview = preview.substring(0, 97) + '...';
  }
  
  // Add attachment indicator
  if (hasAttachments) {
    preview += ` [${attachments!.length} attachment${attachments!.length > 1 ? 's' : ''}]`;
  }
  
  // Rough cost estimation (varies by carrier and region)
  const baseCost = 0.0075; // USD per segment (same for SMS/MMS)
  const estimatedCost = `~$${(segmentInfo.segments * baseCost).toFixed(4)}`;
  
  return {
    preview,
    segmentInfo,
    hasAttachments,
    estimatedCost
  };
}

/**
 * Check if a message should be sent as MMS
 */
export function shouldSendAsMms(
  content: string, 
  attachments?: MessageAttachment[]
): boolean {
  // Has attachments
  if (attachments && attachments.length > 0) {
    return true;
  }
  
  // Long message that would be expensive as SMS
  const segmentInfo = calculateSmsSegments(content);
  if (segmentInfo.segments > 3) {
    return true;
  }
  
  return false;
}