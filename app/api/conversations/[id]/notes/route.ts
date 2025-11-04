/**
 * Notes API Endpoint
 * 
 * Handles CRUD operations for conversation notes with mention support.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  isPrivate: z.boolean().default(false),
  mentions: z.array(z.string()).optional(),
});

/**
 * GET /api/conversations/[id]/notes
 * Get all notes for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For now, show all notes (both public and private)
    // TODO: Filter by actual user ID when auth is fully implemented
    const { id: conversationId } = await params;

    // Get notes - show all for now
    const notes = await prisma.note.findMany({
      where: {
        conversationId,
        // Show all notes for demo purposes
        // In production, filter: OR: [{ isPrivate: false }, { authorId: currentUserId }]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response
    const formattedNotes = notes.map((note: any) => ({
      id: note.id,
      content: note.content,
      isPrivate: note.isPrivate,
      authorId: note.authorId,
      authorName: note.author.name || note.author.email,
      mentions: note.mentions,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/notes
 * Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the actual user ID from the request body (sent from frontend)
    const body = await request.json();
    const userId = body.userId || 'user-1'; // Fallback to mock if not provided

    const { id: conversationId } = await params;

    // Validate request body (already parsed above)
    const validatedData = createNoteSchema.parse(body);

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        conversationId,
        authorId: userId,
        content: validatedData.content,
        isPrivate: validatedData.isPrivate,
        mentions: validatedData.mentions || [],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // TODO: Send notifications to mentioned users
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      // This would trigger notifications to mentioned users
      console.log('Mentioned users:', validatedData.mentions);
    }

    // Format response
    const formattedNote = {
      id: note.id,
      content: note.content,
      isPrivate: note.isPrivate,
      authorId: note.authorId,
      authorName: note.author.name || note.author.email,
      mentions: note.mentions,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedNote, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
