import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateMessageSchema, MessageQuerySchema } from '@/lib/types/message';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedQuery = MessageQuerySchema.parse(queryParams);
    
    const {
      conversationId,
      contactId,
      channel,
      direction,
      status,
      startDate,
      endDate,
      page,
      limit,
      search,
    } = validatedQuery;

    // Build where clause
    const where: any = {};
    
    if (conversationId) where.conversationId = conversationId;
    if (contactId) where.contactId = contactId;
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
        createdAt: 'desc',
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
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.conversationId || !body.contactId || !body.channel || !body.direction || !body.content) {
      return createErrorResponse('Missing required fields', 400);
    }
    
    // Validate enum values
    const validChannels = ['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK'];
    const validDirections = ['INBOUND', 'OUTBOUND'];
    const validStatuses = ['DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED'];
    
    if (!validChannels.includes(body.channel)) {
      return createErrorResponse('Invalid channel', 400);
    }
    
    if (!validDirections.includes(body.direction)) {
      return createErrorResponse('Invalid direction', 400);
    }
    
    if (body.status && !validStatuses.includes(body.status)) {
      return createErrorResponse('Invalid status', 400);
    }
    
    const validatedData = {
      ...body,
      status: body.status || 'SENT'
    };

    // Verify that conversation and contact exist
    const conversation = await prisma.conversation.findUnique({
      where: { id: validatedData.conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      return createErrorResponse('Conversation not found', 404);
    }

    if (conversation.contactId !== validatedData.contactId) {
      return createErrorResponse('Contact does not belong to this conversation', 400);
    }

    // If senderId is provided, verify user exists
    if (validatedData.senderId) {
      const user = await prisma.user.findUnique({
        where: { id: validatedData.senderId },
      });

      if (!user) {
        return createErrorResponse('Sender not found', 404);
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        ...validatedData,
        sentAt: validatedData.status === 'SENT' ? new Date() : null,
      },
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
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: validatedData.conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}