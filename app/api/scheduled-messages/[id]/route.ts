import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { UpdateScheduledMessageSchema } from '@/lib/types/scheduled-message';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const scheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
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

    if (!scheduledMessage) {
      return createErrorResponse('Scheduled message not found', 404);
    }

    return NextResponse.json(scheduledMessage);
  } catch (error) {
    return handleApiError(error, 'GET /api/scheduled-messages/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateScheduledMessageSchema.parse(body);

    // Check if scheduled message exists
    const existingScheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
    });

    if (!existingScheduledMessage) {
      return createErrorResponse('Scheduled message not found', 404);
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.scheduledFor) {
      updateData.scheduledFor = new Date(validatedData.scheduledFor);
    }
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }
    if (validatedData.templateId !== undefined) {
      updateData.templateId = validatedData.templateId;
    }
    if (validatedData.variables !== undefined) {
      updateData.variables = validatedData.variables as any; // Prisma JsonValue requires casting
    }

    // Update the scheduled message
    const scheduledMessage = await prisma.scheduledMessage.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(scheduledMessage);
  } catch (error) {
    return handleApiError(error, 'PUT /api/scheduled-messages/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if scheduled message exists
    const existingScheduledMessage = await prisma.scheduledMessage.findUnique({
      where: { id },
    });

    if (!existingScheduledMessage) {
      return createErrorResponse('Scheduled message not found', 404);
    }

    // Delete the scheduled message
    await prisma.scheduledMessage.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Scheduled message deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/scheduled-messages/[id]');
  }
}