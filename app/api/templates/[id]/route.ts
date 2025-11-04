/**
 * Individual Template API
 * 
 * Endpoints for managing individual templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateService, UpdateTemplateRequest } from '@/lib/services/template-service';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updates
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/templates/[id]
 * Get a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await templateService.getTemplate(params.id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get usage stats
    const stats = await templateService.getTemplateStats(params.id);

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        stats,
      },
    });

  } catch (error) {
    console.error('Error fetching template:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch template',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only EDITOR and ADMIN can update templates
    if (session.user.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Update the template
    const updatedTemplate = await templateService.updateTemplate(
      params.id,
      validatedData as UpdateTemplateRequest
    );

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
    });

  } catch (error) {
    console.error('Error updating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only ADMIN can delete templates
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Delete the template
    await templateService.deleteTemplate(params.id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting template:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete template',
      },
      { status: 500 }
    );
  }
}
