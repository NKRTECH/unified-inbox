/**
 * WhatsApp utility functions for Twilio integration
 */

import { MessageAttachment } from '../types';

/**
 * WhatsApp message formatting options
 */
export interface WhatsAppFormatOptions {
  preserveFormatting?: boolean;
  maxLength?: number;
  convertEmojis?: boolean;
}

/**
 * WhatsApp attachment validation result
 */
export interface WhatsAppAttachmentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Format message content for WhatsApp with rich text support
 */
export function formatWhatsAppContent(
  content: string, 
  options: WhatsAppFormatOptions = {}
): string {
  const {
    preserveFormatting = true,
    maxLength = 4096,
    convertEmojis = true
  } = options;

  let formatted = content;

  if (preserveFormatting) {
    // Convert common HTML/markdown to WhatsApp format
    formatted = formatted
      // HTML to WhatsApp formatting
      .replace(/<strong>(.*?)<\/strong>/g, '*$1*')
      .replace(/<b>(.*?)<\/b>/g, '*$1*')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<i>(.*?)<\/i>/g, '_$1_')
      .replace(/<code>(.*?)<\/code>/g, '```$1```')
      .replace(/<pre>(.*?)<\/pre>/g, '```$1```')
      .replace(/<s>(.*?)<\/s>/g, '~$1~')
      .replace(/<del>(.*?)<\/del>/g, '~$1~')
      
      // Markdown to WhatsApp formatting
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
      .replace(/__(.*?)__/g, '_$1_') // Italic
      .replace(/~~(.*?)~~/g, '~$1~') // Strikethrough
      .replace(/`([^`]+)`/g, '```$1```') // Inline code
      
      // Remove unsupported HTML tags
      .replace(/<[^>]*>/g, '');
  } else {
    // Remove all formatting
    formatted = formatted
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1') // Remove WhatsApp bold
      .replace(/_(.*?)_/g, '$1') // Remove italic
      .replace(/~(.*?)~/g, '$1') // Remove strikethrough
      .replace(/```(.*?)```/g, '$1') // Remove code blocks
      .replace(/`(.*?)`/g, '$1'); // Remove inline code
  }

  // Convert common text emoticons to emojis if enabled
  if (convertEmojis) {
    formatted = formatted
      .replace(/:\)/g, '😊')
      .replace(/:\(/g, '😢')
      .replace(/:D/g, '😃')
      .replace(/;-?\)/g, '😉')
      .replace(/<3/g, '❤️')
      .replace(/:\|/g, '😐')
      .replace(/:o/gi, '😮')
      .replace(/:p/gi, '😛');
  }

  // Normalize whitespace (preserve line breaks for WhatsApp)
  formatted = formatted
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/[ \t]+/g, ' ') // Collapse spaces and tabs, preserve newlines
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
    .trim();

  // Truncate if necessary
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + '...';
  }

  return formatted;
}

/**
 * Validate WhatsApp attachments
 */
export function validateWhatsAppAttachments(attachments: MessageAttachment[]): WhatsAppAttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // WhatsApp limits
  const maxAttachments = 10;
  const maxFileSize = 16 * 1024 * 1024; // 16MB
  const maxVideoSize = 16 * 1024 * 1024; // 16MB
  const maxAudioSize = 16 * 1024 * 1024; // 16MB
  const maxImageSize = 5 * 1024 * 1024; // 5MB (recommended)
  
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Videos
    'video/mp4',
    'video/3gpp',
    'video/quicktime',
    'video/avi',
    'video/mkv',
    
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/amr',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    
    // Documents
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Other
    'text/x-vcard',
    'application/zip'
  ];
  
  if (attachments.length > maxAttachments) {
    errors.push(`Too many attachments (${attachments.length}). WhatsApp supports maximum ${maxAttachments} attachments.`);
  }
  
  for (const attachment of attachments) {
    // Check file type
    if (!supportedTypes.includes(attachment.contentType)) {
      errors.push(`Unsupported attachment type: ${attachment.contentType} for file "${attachment.filename}"`);
    }
    
    // Check file size based on type
    let maxSizeForType = maxFileSize;
    let typeName = 'file';
    
    if (attachment.contentType.startsWith('image/')) {
      maxSizeForType = maxImageSize;
      typeName = 'image';
    } else if (attachment.contentType.startsWith('video/')) {
      maxSizeForType = maxVideoSize;
      typeName = 'video';
    } else if (attachment.contentType.startsWith('audio/')) {
      maxSizeForType = maxAudioSize;
      typeName = 'audio';
    }
    
    if (attachment.size > maxSizeForType) {
      errors.push(`${typeName} "${attachment.filename}" is too large (${Math.round(attachment.size / 1024 / 1024)}MB). Maximum size for ${typeName}s is ${Math.round(maxSizeForType / 1024 / 1024)}MB.`);
    }
    
    // Warnings for large files
    if (attachment.size > 5 * 1024 * 1024) {
      warnings.push(`Large attachment "${attachment.filename}" (${Math.round(attachment.size / 1024 / 1024)}MB) may take longer to send and receive.`);
    }
    
    // Check filename length
    if (attachment.filename.length > 100) {
      warnings.push(`Long filename "${attachment.filename}" may be truncated in WhatsApp.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate WhatsApp message preview
 */
export function generateWhatsAppPreview(
  content: string, 
  attachments?: MessageAttachment[]
): {
  preview: string;
  hasFormatting: boolean;
  hasAttachments: boolean;
  estimatedSize: string;
} {
  const formattedContent = formatWhatsAppContent(content);
  const hasFormatting = /[*_~`]/.test(formattedContent);
  const hasAttachments = !!(attachments && attachments.length > 0);
  
  let preview = formattedContent;
  if (preview.length > 100) {
    preview = preview.substring(0, 97) + '...';
  }
  
  // Add attachment indicator
  if (hasAttachments) {
    const attachmentTypes = attachments!.reduce((acc, att) => {
      const type = att.contentType.split('/')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const typeDescriptions = Object.entries(attachmentTypes)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    preview += ` [${typeDescriptions}]`;
  }
  
  // Calculate estimated size
  const textSize = new Blob([formattedContent]).size;
  const attachmentSize = attachments?.reduce((sum, att) => sum + att.size, 0) || 0;
  const totalSize = textSize + attachmentSize;
  
  let estimatedSize = '';
  if (totalSize < 1024) {
    estimatedSize = `${totalSize} bytes`;
  } else if (totalSize < 1024 * 1024) {
    estimatedSize = `${Math.round(totalSize / 1024)} KB`;
  } else {
    estimatedSize = `${Math.round(totalSize / 1024 / 1024)} MB`;
  }
  
  return {
    preview,
    hasFormatting,
    hasAttachments,
    estimatedSize
  };
}

/**
 * Check if a phone number is likely to have WhatsApp
 */
export function isWhatsAppNumber(phoneNumber: string): {
  isLikely: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Countries with high WhatsApp adoption
  const highAdoptionCountries = ['+55', '+91', '+62', '+52', '+54', '+34', '+39', '+49'];
  const mediumAdoptionCountries = ['+1', '+44', '+33', '+81', '+86'];
  
  if (highAdoptionCountries.some(code => phoneNumber.startsWith(code))) {
    confidence = 'high';
    reasons.push('Country has high WhatsApp adoption rate');
  } else if (mediumAdoptionCountries.some(code => phoneNumber.startsWith(code))) {
    confidence = 'medium';
    reasons.push('Country has medium WhatsApp adoption rate');
  }
  
  // Mobile number patterns (simplified)
  const mobilePatterns = [
    /^\+1[2-9]\d{9}$/, // US/Canada mobile
    /^\+44[7-9]\d{8,9}$/, // UK mobile
    /^\+49[1][5-7]\d{8,9}$/, // Germany mobile
    /^\+55[1-9][1-9]\d{8}$/, // Brazil mobile
    /^\+91[6-9]\d{9}$/, // India mobile
  ];
  
  if (mobilePatterns.some(pattern => pattern.test(phoneNumber))) {
    reasons.push('Number appears to be a mobile number');
    if (confidence === 'low') confidence = 'medium';
  }
  
  return {
    isLikely: confidence !== 'low',
    confidence,
    reasons
  };
}

/**
 * Format WhatsApp number with country-specific formatting
 */
export function formatWhatsAppDisplay(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/^whatsapp:/, '');
  
  // Common country formatting patterns
  const formatPatterns = [
    { pattern: /^\+1(\d{3})(\d{3})(\d{4})$/, format: '+1 ($1) $2-$3' }, // US/Canada
    { pattern: /^\+44(\d{4})(\d{6})$/, format: '+44 $1 $2' }, // UK
    { pattern: /^\+49(\d{3})(\d{8})$/, format: '+49 $1 $2' }, // Germany
    { pattern: /^\+55(\d{2})(\d{5})(\d{4})$/, format: '+55 $1 $2-$3' }, // Brazil
    { pattern: /^\+91(\d{5})(\d{5})$/, format: '+91 $1 $2' }, // India
  ];
  
  for (const { pattern, format } of formatPatterns) {
    if (pattern.test(cleanNumber)) {
      return cleanNumber.replace(pattern, format);
    }
  }
  
  // Default formatting
  return cleanNumber;
}