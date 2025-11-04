/**
 * Contact Timeline API
 * Get complete communication history for a contact across all channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/contacts/[id]/timeline
 * Get complete timeline of interactions for a contact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contactId } = await params;

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const channel = searchParams.get('channel');

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Build where clause for filtering
    const where: any = { contactId };
    if (channel) {
      where.channel = channel;
    }

    // Fetch messages
    const [messages, totalMessages] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          conversation: {
            select: {
              id: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({ where }),
    ]);

    // Fetch calls
    const calls = await prisma.call.findMany({
      where: { contactId },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Fetch conversations
    const conversations = await prisma.conversation.findMany({
      where: { contactId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
            notes: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Combine and sort timeline events
    const timeline = [
      ...messages.map((msg) => ({
        type: 'message' as const,
        id: msg.id,
        timestamp: msg.createdAt,
        data: msg,
      })),
      ...calls.map((call) => ({
        type: 'call' as const,
        id: call.id,
        timestamp: call.createdAt,
        data: call,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate statistics
    const stats = {
      totalMessages: totalMessages,
      totalCalls: calls.length,
      totalConversations: conversations.length,
      channelBreakdown: messages.reduce((acc, msg) => {
        acc[msg.channel] = (acc[msg.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastInteraction: timeline[0]?.timestamp || null,
    };

    return NextResponse.json({
      contact,
      timeline,
      conversations,
      stats,
      pagination: {
        limit,
        offset,
        total: timeline.length,
        hasMore: offset + limit < totalMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching contact timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact timeline' },
      { status: 500 }
    );
  }
}
