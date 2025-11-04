/**
 * Twilio webhook utilities
 */

import crypto from 'crypto';

/**
 * Generate a valid Twilio signature for testing
 */
export function generateTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string
): string {
  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');
  
  // Create the signature string
  const signatureString = url + sortedParams;
  
  // Generate HMAC-SHA1 signature
  return crypto
    .createHmac('sha1', authToken)
    .update(signatureString)
    .digest('base64');
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  try {
    const expectedSignature = generateTwilioSignature(url, params, authToken);
    
    // Use timing-safe comparison with length validation
    const signatureBuf = Buffer.from(signature, 'base64');
    const expectedBuf = Buffer.from(expectedSignature, 'base64');
    
    if (signatureBuf.length !== expectedBuf.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuf, expectedBuf);
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Parse Twilio webhook form data
 */
export function parseTwilioWebhook(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const formData = new URLSearchParams(body);
  
  for (const [key, value] of formData.entries()) {
    params[key] = value;
  }
  
  return params;
}

/**
 * Check if webhook is from Twilio based on headers and signature
 */
export function isTwilioWebhook(
  headers: Record<string, string | null>,
  body: string,
  url: string
): { isValid: boolean; reason?: string } {
  // Check for Twilio signature header
  const signature = headers['x-twilio-signature'];
  if (!signature) {
    return { isValid: false, reason: 'Missing X-Twilio-Signature header' };
  }
  
  // Check for auth token
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return { isValid: false, reason: 'Missing TWILIO_AUTH_TOKEN environment variable' };
  }
  
  // Parse webhook parameters
  const params = parseTwilioWebhook(body);
  
  // Validate signature
  const isValidSignature = validateTwilioSignature(url, params, signature, authToken);
  if (!isValidSignature) {
    return { isValid: false, reason: 'Invalid webhook signature' };
  }
  
  return { isValid: true };
}

/**
 * Extract channel type from Twilio webhook parameters
 */
export function extractChannelType(params: Record<string, string>): 'SMS' | 'WHATSAPP' {
  const from = params.From || '';
  const to = params.To || '';
  
  if (from.startsWith('whatsapp:') || to.startsWith('whatsapp:')) {
    return 'WHATSAPP';
  }
  
  return 'SMS';
}

/**
 * Clean phone number (remove whatsapp: prefix)
 */
export function cleanPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/^whatsapp:/, '');
}

/**
 * Format phone number for WhatsApp (add whatsapp: prefix)
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  if (phoneNumber.startsWith('whatsapp:')) {
    return phoneNumber;
  }
  return `whatsapp:${phoneNumber}`;
}

/**
 * Extract media attachments from Twilio webhook
 */
export function extractMediaAttachments(params: Record<string, string>) {
  const attachments = [];
  const numMedia = parseInt(params.NumMedia || '0', 10);
  
  for (let i = 0; i < numMedia && i < 10; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    const contentType = params[`MediaContentType${i}`];
    
    if (mediaUrl && contentType) {
      attachments.push({
        id: `twilio_media_${i}_${Date.now()}`,
        filename: `attachment_${i}.${getFileExtension(contentType)}`,
        contentType,
        size: 0, // Twilio doesn't provide size
        url: mediaUrl
      });
    }
  }
  
  return attachments;
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/vcard': 'vcf'
  };
  
  return extensions[mimeType] || 'bin';
}

/**
 * Map Twilio message status to our internal status
 */
export function mapTwilioStatus(twilioStatus?: string): 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
  if (!twilioStatus) return 'SENT';
  
  const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
    'queued': 'SENT',
    'sending': 'SENT', 
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'read': 'READ',
    'failed': 'FAILED',
    'undelivered': 'FAILED',
    'received': 'DELIVERED'
  };
  
  return statusMap[twilioStatus.toLowerCase()] || 'SENT';
}

/**
 * Check if webhook payload is a status callback vs new message
 */
export function isStatusCallback(params: Record<string, string>): boolean {
  // Status callbacks typically don't have a Body but have status fields
  const hasStatus = !!(params.MessageStatus || params.SmsStatus);
  const hasBody = !!(params.Body && params.Body.trim());
  
  return hasStatus && !hasBody;
}

/**
 * Generate webhook URL for Twilio configuration
 */
export function generateWebhookUrl(baseUrl: string, path = '/api/webhooks/twilio'): string {
  const url = new URL(path, baseUrl);
  return url.toString();
}