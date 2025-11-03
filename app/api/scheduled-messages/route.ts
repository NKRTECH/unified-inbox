import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { CreateScheduledMessageSchema, ScheduledMessageQuerySchema } from '@/lib/types/scheduled-message';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedQuery = ScheduledMessageQuerySchema.parse(queryParams);
    const { status, scheduledAfter, scheduledBefore, page, limit } = validatedQuery;

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    
    if (scheduledAfter || scheduledBefore) {
      where.scheduledFor = {};
      if (scheduledAfter) where.scheduledFor.gte = new Date(scheduledAfter);
      if (scheduledBefore) where.scheduledFor.lte = new Date(scheduledBefore);
    }

    // Get total count for pagination
    const total = await prisma.scheduledMessage.count({ where });
    
    // Get scheduled messages with relationships
    const scheduledMessages = await prisma.scheduledMessage.findMany({
      where,
      include: {
        message: {
          include: {
            conversation: {
              select: {
                id: true,
                contact: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      scheduledMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/scheduled-messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateScheduledMessageSchema.parse(body);

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id: validatedData.messageId },
    });

    if (!message) {
      return createErrorResponse('Message not found', 404);
    }

    // Check if message is already scheduled
    const existingSchedule = await prisma.scheduledMessage.findUnique({
      where: { messageId: validatedData.messageId },
    });

    if (existingSchedule) {
      return createErrorResponse('Message is already scheduled', 409);
    }

    // Create the scheduled message
    const scheduledMessage = await prisma.scheduledMessage.create({
      data: {
        messageId: validatedData.messageId,
        scheduledFor: new Date(validatedData.scheduledFor),
        templateId: validatedData.templateId,
        variables: validatedData.variables as any, // Prisma JsonValue requires casting
      },
      include: {
        message: {
          include: {
            conversation: {
              select: {
                id: true,
                contact: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(scheduledMessage, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/scheduled-messages');
  }
}