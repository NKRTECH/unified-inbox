import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateMessageSchema } from '@/lib/types/message';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
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

    if (!message) {
      return createErrorResponse('Message not found', 404);
    }

    return NextResponse.json(message);
  } catch (error) {
    return handleApiError(error, 'GET /api/messages/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateMessageSchema.parse(body);

    // Check if message exists
    const existingMessage = await prisma.message.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return createErrorResponse('Message not found', 404);
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // If status is being updated to SENT and sentAt is not set, set it now
    if (validatedData.status === 'SENT' && !existingMessage.sentAt) {
      updateData.sentAt = new Date();
    }

    // Update the message
    const message = await prisma.message.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(message);
  } catch (error) {
    return handleApiError(error, 'PUT /api/messages/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if message exists
    const existingMessage = await prisma.message.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return createErrorResponse('Message not found', 404);
    }

    // Delete the message
    await prisma.message.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/messages/[id]');
  }
}