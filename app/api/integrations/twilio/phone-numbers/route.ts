import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/integrations/twilio/client';

/**
 * GET /api/integrations/twilio/phone-numbers
 * Fetch available Twilio phone numbers and their capabilities
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth middleware is implemented

    const client = getTwilioClient();
    
    // Fetch incoming phone numbers
    const incomingNumbers = await client.incomingPhoneNumbers.list();
    
    // Fetch account information to determine trial status
    const account = await client.api.accounts(client.accountSid).fetch();
    
    // Format phone numbers with capabilities
    const phoneNumbers = incomingNumbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms,
        fax: number.capabilities.fax
      },
      status: number.status,
      dateCreated: number.dateCreated,
      dateUpdated: number.dateUpdated,
      voiceUrl: number.voiceUrl,
      smsUrl: number.smsUrl,
      statusCallback: number.statusCallback,
      addressRequirements: number.addressRequirements,
      beta: number.beta,
      trunkSid: number.trunkSid
    }));

    // Check if account is in trial mode
    const isTrialAccount = account.type === 'Trial';
    
    return NextResponse.json({
      phoneNumbers,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        isTrial: isTrialAccount
      },
      totalCount: phoneNumbers.length
    });

  } catch (error) {
    console.error('Error fetching Twilio phone numbers:', error);
    
    if (error instanceof Error) {
      // Handle specific Twilio errors
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'Invalid Twilio credentials' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('Account not found')) {
        return NextResponse.json(
          { error: 'Twilio account not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/twilio/phone-numbers
 * Purchase a new phone number (for trial accounts, this will be limited)
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth middleware is implemented

    const body = await request.json();
    const { phoneNumber, areaCode, friendlyName } = body;

    const client = getTwilioClient();
    
    // Check account type first
    const account = await client.api.accounts(client.accountSid).fetch();
    const isTrialAccount = account.type === 'Trial';
    
    if (isTrialAccount) {
      return NextResponse.json(
        { 
          error: 'Phone number purchase not available for trial accounts',
          message: 'Trial accounts can only use pre-assigned phone numbers. Please upgrade to a paid account to purchase additional numbers.',
          upgradeUrl: 'https://console.twilio.com/billing'
        },
        { status: 403 }
      );
    }

    let purchasedNumber;
    
    if (phoneNumber) {
      // Purchase specific phone number
      purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        friendlyName: friendlyName || `Unified Inbox - ${phoneNumber}`
      });
    } else if (areaCode) {
      // Search and purchase number by area code
      const availableNumbers = await client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: areaCode,
          limit: 1,
          smsEnabled: true,
          voiceEnabled: true
        });
      
      if (availableNumbers.length === 0) {
        return NextResponse.json(
          { error: `No available numbers found in area code ${areaCode}` },
          { status: 404 }
        );
      }
      
      purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: availableNumbers[0].phoneNumber,
        friendlyName: friendlyName || `Unified Inbox - ${availableNumbers[0].phoneNumber}`
      });
    } else {
      return NextResponse.json(
        { error: 'Either phoneNumber or areaCode is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      phoneNumber: {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
        friendlyName: purchasedNumber.friendlyName,
        capabilities: purchasedNumber.capabilities,
        status: purchasedNumber.status,
        dateCreated: purchasedNumber.dateCreated
      }
    });

  } catch (error) {
    console.error('Error purchasing phone number:', error);
    
    if (error instanceof Error) {
      // Handle specific Twilio errors
      if (error.message.includes('not available')) {
        return NextResponse.json(
          { error: 'Phone number not available for purchase' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient account balance' },
          { status: 402 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}