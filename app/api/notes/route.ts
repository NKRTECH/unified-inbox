import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, createErrorResponse } from '@/lib/error-utils';
import { CreateNoteSchema, NoteQuerySchema } from '@/lib/types/note';
import { requireAuth } from '@/lib/middleware/rbac';
import { validateBody, validateQuery, sanitizeObject } from '@/lib/middleware/validation';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Validate query parameters
    const queryResult = validateQuery(request, NoteQuerySchema);
    if (!queryResult.success) {
      return queryResult.error;
    }
    
    const validatedQuery = queryResult.data;
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
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // Validate and sanitize request body
    const bodyResult = await validateBody(request, CreateNoteSchema);
    if (!bodyResult.success) {
      return bodyResult.error;
    }

    // Sanitize content to prevent XSS
    const validatedData = sanitizeObject(bodyResult.data, ['content']);

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