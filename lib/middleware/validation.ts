/**
 * Input Validation Middleware
 * 
 * Provides validation utilities and middleware for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: NextResponse };

/**
 * Validate request body against Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const rawDetails = (error as any).issues || (error as any).errors || [];
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation error',
            details: rawDetails.map((err: any) => ({
              path: (err.path || []).join?.('.') || '',
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const rawDetails = (error as any).issues || (error as any).errors || [];
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: rawDetails.map((err: any) => ({
              path: (err.path || []).join?.('.') || '',
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

/**
 * Sanitize plain text to prevent XSS
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  htmlFields: string[] = []
): T {
  const sanitized: any = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Use HTML sanitization for specified fields, text sanitization for others
      sanitized[key] = htmlFields.includes(key)
        ? sanitizeHtml(value)
        : sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item, htmlFields)
          : typeof item === 'string'
          ? sanitizeText(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, htmlFields);
    }
  }

  return sanitized;
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  id: z.string().cuid(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  url: z.string().url(),
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
};

/**
 * Validate pagination parameters
 */
export function validatePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  return {
    limit: limit ? Math.min(Math.max(parseInt(limit), 1), 100) : 50,
    offset: offset ? Math.max(parseInt(offset), 0) : 0,
  };
}

/**
 * Validate and sanitize message content
 */
export function validateMessageContent(content: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Message content cannot be empty',
    };
  }

  if (content.length > 10000) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Message content exceeds maximum length of 10000 characters',
    };
  }

  const sanitized = sanitizeText(content);

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { isValid: true };
}

/**
 * Create a validated API handler
 */
export function createValidatedHandler<TBody = any, TQuery = any>(
  handler: (
    request: NextRequest,
    data: { body?: TBody; query?: TQuery; params?: any }
  ) => Promise<NextResponse>,
  options: {
    bodySchema?: ZodSchema<TBody>;
    querySchema?: ZodSchema<TQuery>;
    sanitizeBody?: boolean;
    htmlFields?: string[];
  } = {}
) {
  return async (
    request: NextRequest,
    context?: { params: any }
  ): Promise<NextResponse> => {
    try {
      let body: TBody | undefined;
      let query: TQuery | undefined;

      // Validate body if schema provided
      if (options.bodySchema) {
        const bodyResult = await validateBody(request, options.bodySchema);
        if (!bodyResult.success) {
          return bodyResult.error;
        }
        body = options.sanitizeBody
          ? sanitizeObject(bodyResult.data as any, options.htmlFields)
          : bodyResult.data;
      }

      // Validate query if schema provided
      if (options.querySchema) {
        const queryResult = validateQuery(request, options.querySchema);
        if (!queryResult.success) {
          return queryResult.error;
        }
        query = queryResult.data;
      }

      // Call handler with validated data
      return await handler(request, {
        body,
        query,
        params: context?.params,
      });
    } catch (error) {
      console.error('Handler error:', error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}
