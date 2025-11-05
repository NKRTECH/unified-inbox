/**
 * Message Templates API
 * 
 * Endpoints for managing message templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateService, CreateTemplateRequest } from '@/lib/services/template-service';
import { requirePermission, requireAuth } from '@/lib/middleware/rbac';
import { z } from 'zod';

// Validation schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
});

/**
 * POST /api/templates
 * Create a new message template
 */
export async function POST(request: NextRequest) {
  try {
    // Require write permission for creating templates
    const authResult = await requirePermission(request, 'write');
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Create template request
    const createRequest: CreateTemplateRequest = {
      ...validatedData,
      createdBy: user.id,
    };

    // Create the template
    const template = await templateService.createTemplate(createRequest);

    return NextResponse.json({
      success: true,
      data: template,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: (error as any).issues || (error as any).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/templates
 * Get all templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication for reading templates
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const isActive = searchParams.get('isActive') === 'true' ? true : 
                     searchParams.get('isActive') === 'false' ? false : undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // Get templates
    const templates = await templateService.getTemplates({
      category,
      isActive,
      search,
      limit,
      offset,
    });

    // Get categories
    const categories = await templateService.getCategories();

    return NextResponse.json({
      success: true,
      data: templates,
      categories,
      pagination: {
        limit: limit || 50,
        offset: offset || 0,
        total: templates.length,
      },
    });

  } catch (error) {
    console.error('Error fetching templates:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 }
    );
  }
}
