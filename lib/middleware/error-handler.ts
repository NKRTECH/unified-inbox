/**
 * Global Error Handler Middleware
 * 
 * Provides centralized error handling for the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, logError, AppError, ErrorType } from '@/lib/error-utils';

/**
 * Error handler middleware wrapper
 */
export function withErrorHandler<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      // Log the error
      logError(error, `${request.method} ${request.nextUrl.pathname}`, {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      });

      // Return error response
      return handleApiError(error, `${request.method} ${request.nextUrl.pathname}`);
    }
  };
}

/**
 * Create error throwing utilities
 */
export const throwError = {
  notFound: (message: string = 'Resource not found', details?: any) => {
    throw new AppError(ErrorType.NOT_FOUND, message, 404, details);
  },

  unauthorized: (message: string = 'Authentication required', details?: any) => {
    throw new AppError(ErrorType.AUTHENTICATION, message, 401, details);
  },

  forbidden: (message: string = 'Insufficient permissions', details?: any) => {
    throw new AppError(ErrorType.AUTHORIZATION, message, 403, details);
  },

  validation: (message: string = 'Validation failed', details?: any) => {
    throw new AppError(ErrorType.VALIDATION, message, 400, details);
  },

  conflict: (message: string = 'Resource already exists', details?: any) => {
    throw new AppError(ErrorType.CONFLICT, message, 409, details);
  },

  rateLimit: (message: string = 'Too many requests', details?: any) => {
    throw new AppError(ErrorType.RATE_LIMIT, message, 429, details);
  },

  externalService: (message: string = 'External service error', details?: any) => {
    throw new AppError(ErrorType.EXTERNAL_SERVICE, message, 502, details);
  },

  internal: (message: string = 'Internal server error', details?: any) => {
    throw new AppError(ErrorType.INTERNAL, message, 500, details);
  },
};

/**
 * Assert utilities for common checks
 */
export const assert = {
  exists: <T>(value: T | null | undefined, message?: string): T => {
    if (value === null || value === undefined) {
      throwError.notFound(message || 'Resource not found');
    }
    return value;
  },

  isAuthenticated: (userId: string | null | undefined, message?: string): string => {
    if (!userId) {
      throwError.unauthorized(message || 'Authentication required');
    }
    return userId;
  },

  hasPermission: (condition: boolean, message?: string): void => {
    if (!condition) {
      throwError.forbidden(message || 'Insufficient permissions');
    }
  },

  isValid: (condition: boolean, message?: string, details?: any): void => {
    if (!condition) {
      throwError.validation(message || 'Validation failed', details);
    }
  },

  isOwner: (userId: string, resourceOwnerId: string, message?: string): void => {
    if (userId !== resourceOwnerId) {
      throwError.forbidden(message || 'You do not own this resource');
    }
  },
};

/**
 * Try-catch wrapper with error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorType.INTERNAL,
      errorMessage || 'Operation failed',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { withErrorHandler, assert, throwError } from '@/lib/middleware/error-handler';
 * 
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   const { user } = await requireAuth(request);
 *   
 *   const resource = await prisma.resource.findUnique({
 *     where: { id: params.id }
 *   });
 *   
 *   // Assert resource exists (throws 404 if not)
 *   assert.exists(resource, 'Resource not found');
 *   
 *   // Assert user has permission (throws 403 if not)
 *   assert.hasPermission(user.role === 'ADMIN', 'Admin access required');
 *   
 *   // Or throw custom errors
 *   if (someCondition) {
 *     throwError.validation('Invalid input', { field: 'email' });
 *   }
 *   
 *   return NextResponse.json(resource);
 * });
 * ```
 */
