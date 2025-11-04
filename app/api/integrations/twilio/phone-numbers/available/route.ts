import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/integrations/twilio/client';

/**
 * GET /api/integrations/twilio/phone-numbers/available
 * Search for available phone numbers to purchase
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check when auth middleware is implemented

    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode');
    const contains = searchParams.get('contains');
    const country = searchParams.get('country') || 'US';
    const limit = parseInt(searchParams.get('limit') || '20');

    const client = getTwilioClient();
    
    // Check account type
    const account = await client.api.accounts(client.accountSid).fetch();
    const isTrialAccount = account.type === 'Trial';
    
    if (isTrialAccount) {
      return NextResponse.json({
        availableNumbers: [],
        message: 'Phone number search not available for trial accounts. Trial accounts use pre-assigned numbers only.',
        isTrial: true,
        upgradeUrl: 'https://console.twilio.com/billing'
      });
    }

    // Build search parameters
    const searchOptions: any = {
      limit,
      smsEnabled: true,
      voiceEnabled: true
    };

    if (areaCode) {
      searchOptions.areaCode = areaCode;
    }

    if (contains) {
      searchOptions.contains = contains;
    }

    // Search for available local numbers
    const availableNumbers = await client.availablePhoneNumbers(country)
      .local
      .list(searchOptions);

    // Format the response
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      postalCode: number.postalCode,
      isoCountry: number.isoCountry,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms,
        fax: number.capabilities.fax
      },
      addressRequirements: number.addressRequirements,
      beta: number.beta
    }));

    return NextResponse.json({
      availableNumbers: formattedNumbers,
      totalCount: formattedNumbers.length,
      searchCriteria: {
        areaCode,
        contains,
        country,
        limit
      },
      isTrial: false
    });

  } catch (error) {
    console.error('Error searching available phone numbers:', error);
    
    if (error instanceof Error) {
      // Handle specific Twilio errors
      if (error.message.includes('Invalid country')) {
        return NextResponse.json(
          { error: 'Invalid country code' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Invalid area code')) {
        return NextResponse.json(
          { error: 'Invalid area code' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to search available phone numbers' },
      { status: 500 }
    );
  }
}