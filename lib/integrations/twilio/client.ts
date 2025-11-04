import { Twilio } from 'twilio';

/**
 * Twilio client configuration and initialization
 */
export class TwilioClient {
  private static instance: Twilio | null = null;
  
  /**
   * Get the singleton Twilio client instance
   */
  public static getInstance(): Twilio {
    if (!TwilioClient.instance) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        throw new Error(
          'Twilio credentials not found. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
        );
      }
      
      TwilioClient.instance = new Twilio(accountSid, authToken);
    }
    
    return TwilioClient.instance;
  }
  
  /**
   * Reset the client instance (useful for testing)
   */
  public static reset(): void {
    TwilioClient.instance = null;
  }
  
  /**
   * Validate Twilio configuration
   */
  public static async validateConfiguration(): Promise<boolean> {
    try {
      const client = TwilioClient.getInstance();
      // Test the connection by fetching account info
      await client.api.accounts(client.accountSid).fetch();
      return true;
    } catch (error) {
      console.error('Twilio configuration validation failed:', error);
      return false;
    }
  }
  
  /**
   * Get account information
   */
  public static async getAccountInfo() {
    try {
      const client = TwilioClient.getInstance();
      const account = await client.api.accounts(client.accountSid).fetch();
      return {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      };
    } catch (error) {
      console.error('Failed to fetch Twilio account info:', error);
      throw error;
    }
  }
}

/**
 * Convenience function to get the Twilio client instance
 */
export const getTwilioClient = () => TwilioClient.getInstance();

/**
 * Twilio configuration interface
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  webhookUrl?: string;
  fromNumber?: string;
  whatsappNumber?: string;
}

/**
 * Get Twilio configuration from environment variables
 */
export const getTwilioConfig = (): TwilioConfig => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    throw new Error(
      'Twilio configuration incomplete. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN'
    );
  }
  
  return {
    accountSid,
    authToken,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
  };
};