import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
const TWILIO_APP_SID = process.env.TWILIO_APP_SID;

/**
 * Generate Twilio Access Token for Voice SDK
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    console.log('Session check result:', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userId: session?.user?.id 
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to use VoIP features' },
        { status: 401 }
      );
    }

    // Validate required environment variables
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
      console.error('Missing required Twilio credentials');
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // TWILIO_APP_SID is optional for testing - warn if missing
    if (!TWILIO_APP_SID) {
      console.warn('TWILIO_APP_SID not configured - outbound calls may not work');
    }

    // Create identity for the user
    const identity = `user_${session.user.id}`;

    // Create the access token
    const accessToken = jwt.sign(
      {
        iss: TWILIO_API_KEY,
        sub: TWILIO_ACCOUNT_SID,
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        grants: {
          identity,
          voice: {
            incoming: {
              allow: true,
            },
            outgoing: TWILIO_APP_SID ? {
              application_sid: TWILIO_APP_SID,
            } : undefined,
          },
        },
      },
      TWILIO_API_SECRET,
      {
        algorithm: 'HS256',
        header: {
          typ: 'JWT',
          alg: 'HS256',
          cty: 'twilio-fpa;v=1',
        },
      }
    );

    return NextResponse.json({
      accessToken,
      identity,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}