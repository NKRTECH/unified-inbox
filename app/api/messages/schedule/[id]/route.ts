/**
 * Individual Scheduled Message API
 * 
 * Endpoints for managing individual scheduled messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { schedulingService } from '@/lib/services/scheduling-service';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updates
const updateScheduledMessageSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  content: z.string().min(1).max(10000).optional(),
  variables: z.record(z.any()).optional(),
});

/**
 * GET /api/messages/schedule/[id]
 * Get a specific scheduled message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const scheduledMessage = await schedulingService.getScheduledMessage(id);

    if (!scheduledMessage) {
      return NextResponse.json(
        { error: 'Scheduled message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scheduledMessage,
    });

  } catch (error) {
    console.error('Error fetching scheduled message:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch scheduled message',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/schedule/[id]
 * Update a scheduled message
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const validatedData = updateScheduledMessageSchema.parse(body);

    // Prepare updates
    const updates: any = {};
    if (validatedData.scheduledFor) {
      updates.scheduledFor = new Date(validatedData.scheduledFor);
    }
    if (validatedData.content) {
      updates.content = validatedData.content;
    }
    if (validatedData.variables) {
      updates.variables = validatedData.variables;
    }

    // Update the scheduled message
    const updatedMessage = await schedulingService.updateScheduledMessage(
      id,
      updates
    );

    return NextResponse.json({
      success: true,
      data: updatedMessage,
    });

  } catch (error) {
    console.error('Error updating scheduled message:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update scheduled message',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/schedule/[id]
 * Cancel a scheduled message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Cancel the scheduled message
    await schedulingService.cancelScheduledMessage(id);

    return NextResponse.json({
      success: true,
      message: 'Scheduled message cancelled successfully',
    });

  } catch (error) {
    console.error('Error cancelling scheduled message:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to cancel scheduled message',
      },
      { status: 500 }
    );
  }
}
