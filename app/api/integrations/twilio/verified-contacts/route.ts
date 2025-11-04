import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/integrations/twilio/client';

/**
 * GET /api/integrations/twilio/verified-contacts
 * Fetch verified phone numbers for trial accounts
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth middleware is implemented

    const client = getTwilioClient();
    
    // Check account type
    const account = await client.api.accounts(client.accountSid).fetch();
    const isTrialAccount = account.type === 'Trial';
    
    if (!isTrialAccount) {
      return NextResponse.json({
        verifiedNumbers: [],
        message: 'Verified contacts are only applicable to trial accounts',
        isTrial: false
      });
    }

    // Fetch verified outgoing caller IDs (for trial accounts)
    const verifiedNumbers = await client.outgoingCallerIds.list();
    
    // Format the response
    const formattedNumbers = verifiedNumbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      dateCreated: number.dateCreated,
      dateUpdated: number.dateUpdated
    }));

    return NextResponse.json({
      verifiedNumbers: formattedNumbers,
      totalCount: formattedNumbers.length,
      isTrial: true,
      message: 'These are the verified phone numbers you can send messages to from your trial account'
    });

  } catch (error) {
    console.error('Error fetching verified contacts:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch verified contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/twilio/verified-contacts
 * Add a new verified phone number for trial accounts
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth middleware is implemented

    const body = await request.json();
    const { phoneNumber, friendlyName } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();
    
    // Check account type
    const account = await client.api.accounts(client.accountSid).fetch();
    const isTrialAccount = account.type === 'Trial';
    
    if (!isTrialAccount) {
      return NextResponse.json(
        { error: 'Verified contacts are only applicable to trial accounts' },
        { status: 403 }
      );
    }

    // Create verified outgoing caller ID
    const verifiedNumber = await client.validationRequests.create({
      phoneNumber: phoneNumber,
      friendlyName: friendlyName || phoneNumber
    });

    return NextResponse.json({
      success: true,
      verificationRequest: {
        accountSid: verifiedNumber.accountSid,
        phoneNumber: verifiedNumber.phoneNumber,
        friendlyName: verifiedNumber.friendlyName,
        validationCode: verifiedNumber.validationCode,
        callSid: verifiedNumber.callSid
      },
      message: 'Verification call initiated. Please answer the call and enter the validation code when prompted.'
    });

  } catch (error) {
    console.error('Error creating verification request:', error);
    
    if (error instanceof Error) {
      // Handle specific Twilio errors
      if (error.message.includes('Invalid phone number')) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('already verified')) {
        return NextResponse.json(
          { error: 'Phone number is already verified' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}