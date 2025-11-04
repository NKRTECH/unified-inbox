import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CallStatus } from '@prisma/client';

/**
 * Handle Twilio Voice webhooks for call status updates
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log('Twilio Voice webhook received:', {
      callSid,
      callStatus,
      duration,
      from,
      to,
    });

    // Map Twilio call status to our CallStatus enum
    const mapTwilioStatus = (status: string): CallStatus => {
      switch (status.toLowerCase()) {
        case 'ringing':
          return CallStatus.RINGING;
        case 'in-progress':
          return CallStatus.ACTIVE;
        case 'completed':
          return CallStatus.COMPLETED;
        case 'failed':
          return CallStatus.FAILED;
        case 'busy':
        case 'no-answer':
          return CallStatus.NO_ANSWER;
        case 'canceled':
          return CallStatus.CANCELLED;
        default:
          return CallStatus.INITIATED;
      }
    };

    // Update call record if it exists
    if (callSid) {
      const updateData: any = {
        status: mapTwilioStatus(callStatus),
      };

      // Add duration if call is completed
      if (callStatus === 'completed' && duration) {
        updateData.duration = parseInt(duration, 10);
        updateData.endedAt = new Date();
      }

      // Update the call record
      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: updateData,
      });

      console.log(`Updated call ${callSid} with status ${callStatus}`);
    }

    // Return TwiML response (empty for status webhooks)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error processing Twilio voice webhook:', error);
    
    // Return empty TwiML response even on error to avoid retries
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}