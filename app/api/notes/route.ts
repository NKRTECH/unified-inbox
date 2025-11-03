import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { CreateNoteSchema, NoteQuerySchema } from '@/lib/types/note';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedQuery = NoteQuerySchema.parse(queryParams);
    const { conversationId, authorId, isPrivate, page, limit } = validatedQuery;

    // Build where clause
    const where: any = {};
    
    if (conversationId) where.conversationId = conversationId;
    if (authorId) where.authorId = authorId;
    if (isPrivate !== undefined) where.isPrivate = isPrivate === 'true';

    // Get total count for pagination
    const total = await prisma.note.count({ where });
    
    // Get notes with relationships
    const notes = await prisma.note.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/notes');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateNoteSchema.parse(body);

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: validatedData.conversationId },
    });

    if (!conversation) {
      return createErrorResponse('Conversation not found', 404);
    }

    // Verify author exists
    const author = await prisma.user.findUnique({
      where: { id: validatedData.authorId },
    });

    if (!author) {
      return createErrorResponse('Author not found', 404);
    }

    // Create the note
    const note = await prisma.note.create({
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

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/notes');
  }
}