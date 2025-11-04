/**
 * Trial account validation utilities
 */

/**
 * Check if a phone number is verified for trial accounts
 */
export async function isPhoneNumberVerified(phoneNumber: string): Promise<boolean> {
  try {
    const response = await fetch('/api/integrations/twilio/verified-contacts');
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    
    if (!data.isTrial) {
      // Paid accounts can send to any number
      return true;
    }
    
    // Check if the number is in the verified list
    return data.verifiedNumbers?.some((contact: any) => 
      contact.phoneNumber === phoneNumber
    ) || false;
  } catch (error) {
    console.error('Error checking phone number verification:', error);
    return false;
  }
}

/**
 * Get account trial status
 */
export async function getAccountTrialStatus(): Promise<{
  isTrial: boolean;
  verifiedNumbers: string[];
}> {
  try {
    const response = await fetch('/api/integrations/twilio/verified-contacts');
    if (!response.ok) {
      return { isTrial: false, verifiedNumbers: [] };
    }
    
    const data = await response.json();
    
    return {
      isTrial: data.isTrial || false,
      verifiedNumbers: data.verifiedNumbers?.map((contact: any) => contact.phoneNumber) || []
    };
  } catch (error) {
    console.error('Error getting account trial status:', error);
    return { isTrial: false, verifiedNumbers: [] };
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Add + prefix if not present
  if (!phoneNumber.startsWith('+')) {
    return `+${digits}`;
  }
  
  return phoneNumber;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}