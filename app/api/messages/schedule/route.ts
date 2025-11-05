/**
 * Message Scheduling API
 * 
 * Endpoints for scheduling, managing, and querying scheduled messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { schedulingService, ScheduleMessageRequest } from '@/lib/services/scheduling-service';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const scheduleMessageSchema = z.object({
  conversationId: z.string().cuid(),
  contactId: z.string().cuid(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK']),
  content: z.string().min(1).max(10000),
  scheduledFor: z.string().datetime(),
  templateId: z.string().optional(),
  variables: z.unknown().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    url: z.string().url(),
  })).optional(),
  metadata: z.unknown().optional(),
});

/**
 * POST /api/messages/schedule
 * Schedule a new message for future delivery
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = scheduleMessageSchema.parse(body);

    // Create schedule request
    const scheduleRequest: ScheduleMessageRequest = {
      ...validatedData,
      senderId: session.user.id,
      scheduledFor: new Date(validatedData.scheduledFor),
      // zod returns a union of string literal types; cast to ChannelType for the internal type
      channel: validatedData.channel as any,
      variables: validatedData.variables as any,
      metadata: validatedData.metadata as any,
    };

    // Schedule the message
    const scheduledMessage = await schedulingService.scheduleMessage(scheduleRequest);

    return NextResponse.json({
      success: true,
      data: scheduledMessage,
    }, { status: 201 });

  } catch (error) {
    console.error('Error scheduling message:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: (error as any).issues || (error as any).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to schedule message',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/schedule
 * Get scheduled messages with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const contactId = searchParams.get('contactId') || undefined;
    const conversationId = searchParams.get('conversationId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // Get scheduled messages
    const scheduledMessages = await schedulingService.getScheduledMessages({
      status,
      contactId,
      conversationId,
      limit,
      offset,
    });

    // Get statistics
    const stats = await schedulingService.getSchedulingStats();

    return NextResponse.json({
      success: true,
      data: scheduledMessages,
      stats,
      pagination: {
        limit: limit || 50,
        offset: offset || 0,
        total: scheduledMessages.length,
      },
    });

  } catch (error) {
    console.error('Error fetching scheduled messages:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch scheduled messages',
      },
      { status: 500 }
    );
  }
}
