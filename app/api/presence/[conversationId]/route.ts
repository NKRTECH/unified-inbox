/**
 * Presence API Endpoint
 * Get active users in a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { presenceService } from '@/lib/services/presence-service';
import { auth } from '@/lib/auth/auth';

/**
 * GET /api/presence/[conversationId]
 * Get active users in a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get presence data
    const presenceUsers = presenceService.getConversationPresence(conversationId);

    return NextResponse.json({
      conversationId,
      users: presenceUsers.map((user) => ({
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        status: user.status,
        lastSeen: user.lastSeen.toISOString(),
      })),
      count: presenceUsers.length,
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presence data' },
      { status: 500 }
    );
  }
}
