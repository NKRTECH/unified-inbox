/**
 * Twilio health check API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwilioClient } from '@/lib/integrations/twilio/client';

export async function GET(request: NextRequest) {
  try {
    // Validate Twilio configuration
    const isValid = await TwilioClient.validateConfiguration();
    
    if (!isValid) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Twilio configuration is invalid or credentials are missing' 
        },
        { status: 500 }
      );
    }

    // Get account information
    const accountInfo = await TwilioClient.getAccountInfo();
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Twilio integration is configured and working',
      account: accountInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Twilio health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}