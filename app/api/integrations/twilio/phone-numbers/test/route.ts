import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/integrations/twilio/client';

/**
 * GET /api/integrations/twilio/phone-numbers/test
 * Test endpoint to verify Twilio phone number API functionality
 */
export async function GET(request: NextRequest) {
  try {
    const client = getTwilioClient();
    
    // Test basic connectivity
    const account = await client.api.accounts(client.accountSid).fetch();
    
    // Test phone number listing
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    
    // Test verified contacts (for trial accounts)
    let verifiedContacts: any[] = [];
    try {
      verifiedContacts = await client.outgoingCallerIds.list({ limit: 5 });
    } catch (error) {
      // This might fail for paid accounts, which is expected
      console.log('Verified contacts not available (likely paid account)');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Twilio phone number API test successful',
      results: {
        account: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type,
          isTrial: account.type === 'Trial'
        },
        phoneNumbers: {
          count: phoneNumbers.length,
          numbers: phoneNumbers.map(num => ({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName,
            capabilities: num.capabilities
          }))
        },
        verifiedContacts: {
          count: verifiedContacts.length,
          contacts: verifiedContacts.map(contact => ({
            sid: contact.sid,
            phoneNumber: contact.phoneNumber,
            friendlyName: contact.friendlyName
          }))
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Twilio phone number API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Twilio phone number API test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}