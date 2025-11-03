import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageQuerySchema } from '@/lib/types/message';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse query parameters but override conversationId
    const validatedQuery = MessageQuerySchema.parse({
      ...queryParams,
      conversationId,
    });
    
    const {
      channel,
      direction,
      status,
      startDate,
      endDate,
      page,
      limit,
      search,
    } = validatedQuery;

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return createErrorResponse('Conversation not found', 404);
    }

    // Build where clause
    const where: any = {
      conversationId,
    };
    
    if (channel) where.channel = channel;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get total count for pagination
    const total = await prisma.message.count({ where });
    
    // Get messages with relationships
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
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
      orderBy: {
        createdAt: 'asc', // Chronological order for conversation view
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/conversations/[id]/messages');
  }
}