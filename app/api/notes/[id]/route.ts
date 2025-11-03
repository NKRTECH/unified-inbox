import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { UpdateNoteSchema } from '@/lib/types/note';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        author: {
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
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!note) {
      return createErrorResponse('Note not found', 404);
    }

    return NextResponse.json(note);
  } catch (error) {
    return handleApiError(error, 'GET /api/notes/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateNoteSchema.parse(body);

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return createErrorResponse('Note not found', 404);
    }

    // Update the note
    const note = await prisma.note.update({
      where: { id },
      data: validatedData,
      include: {
        author: {
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
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    return handleApiError(error, 'PUT /api/notes/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return createErrorResponse('Note not found', 404);
    }

    // Delete the note
    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/notes/[id]');
  }
}