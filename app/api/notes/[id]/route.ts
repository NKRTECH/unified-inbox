/**
 * Individual Note API Endpoint
 * 
 * Handles operations on individual notes (update, delete).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  isPrivate: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
});

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For now, allow editing without strict auth check
    // TODO: Add proper authentication when auth is fully implemented
    const { id: noteId } = await params;

    // Get existing note
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Allow editing for now (in production, check user permissions)
    // if (existingNote.authorId !== currentUserId) {
    //   return NextResponse.json(
    //     { error: 'Forbidden: You can only edit your own notes' },
    //     { status: 403 }
    //   );
    // }

    // Validate request body
    const body = await request.json();
    const validatedData = updateNoteSchema.parse(body);

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(validatedData.content && { content: validatedData.content }),
        ...(validatedData.isPrivate !== undefined && { isPrivate: validatedData.isPrivate }),
        ...(validatedData.mentions && { mentions: validatedData.mentions }),
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

    // Format response
    const formattedNote = {
      id: updatedNote.id,
      content: updatedNote.content,
      isPrivate: updatedNote.isPrivate,
      authorId: updatedNote.authorId,
      authorName: updatedNote.author.name || updatedNote.author.email,
      mentions: updatedNote.mentions,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedNote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For now, allow deletion without strict auth check
    // TODO: Add proper authentication when auth is fully implemented
    const { id: noteId } = await params;

    // Get existing note
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Allow deletion for now (in production, check user permissions)
    // if (existingNote.authorId !== currentUserId && !isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Forbidden: You can only delete your own notes' },
    //     { status: 403 }
    //   );
    // }

    // Delete note
    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
