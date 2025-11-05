import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Error types for categorization
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Structured error response
 */
export interface ErrorResponse {
  error: string;
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Safely extracts error message from unknown error type
 * @param err - Unknown error object
 * @returns Error message string or default message
 */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Checks if error message contains specific text
 * @param err - Unknown error object
 * @param searchText - Text to search for in error message
 * @returns Boolean indicating if text is found
 */
export function errorContains(err: unknown, searchText: string): boolean {
  const message = getErrorMessage(err);
  return message.includes(searchText);
}

/**
 * Creates a standardized error response
 * @param message - Error message
 * @param status - HTTP status code
 * @returns NextResponse with error
 */
export function createErrorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create structured error response
 */
export function createStructuredErrorResponse(
  type: ErrorType,
  message: string,
  statusCode: number,
  details?: any,
  requestId?: string
): NextResponse {
  const errorResponse: ErrorResponse = {
    error: type,
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): NextResponse {
  const rawDetails = (error as any).issues || (error as any).errors || [];
  const details = rawDetails.map((err: any) => ({
    path: (err.path || []).join?.('.') || '',
    message: err.message,
    code: err.code,
  }));

  return createStructuredErrorResponse(
    ErrorType.VALIDATION,
    'Validation failed',
    400,
    details
  );
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: any): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return createStructuredErrorResponse(
          ErrorType.CONFLICT,
          'Resource already exists',
          409,
          { field: error.meta?.target }
        );
      
      case 'P2003':
        // Foreign key constraint violation
        return createStructuredErrorResponse(
          ErrorType.VALIDATION,
          'Referenced resource not found',
          400,
          { field: error.meta?.field_name }
        );
      
      case 'P2025':
        // Record not found
        return createStructuredErrorResponse(
          ErrorType.NOT_FOUND,
          'Resource not found',
          404
        );
      
      case 'P2014':
        // Invalid ID
        return createStructuredErrorResponse(
          ErrorType.VALIDATION,
          'Invalid ID provided',
          400
        );
      
      default:
        return createStructuredErrorResponse(
          ErrorType.DATABASE,
          'Database operation failed',
          500,
          { code: error.code }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return createStructuredErrorResponse(
      ErrorType.VALIDATION,
      'Invalid data provided',
      400
    );
  }

  return createStructuredErrorResponse(
    ErrorType.DATABASE,
    'Database error occurred',
    500
  );
}

/**
 * Handle custom AppError
 */
function handleAppError(error: AppError): NextResponse {
  return createStructuredErrorResponse(
    error.type,
    error.message,
    error.statusCode,
    error.details
  );
}

/**
 * Handles API errors with consistent logging and response format
 * @param error - The error to handle
 * @param context - Context information for logging
 * @returns NextResponse with error
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  const requestId = generateRequestId();
  
  // Log error with context
  console.error(`[${requestId}] Error in ${context}:`, {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle custom AppError
  if (error instanceof AppError) {
    return handleAppError(error);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    return handlePrismaError(error);
  }

  // Handle standard errors
  const message = getErrorMessage(error);
  
  // Check for specific error patterns
  if (errorContains(error, 'Unique constraint')) {
    return createStructuredErrorResponse(
      ErrorType.CONFLICT,
      'Resource already exists',
      409,
      undefined,
      requestId
    );
  }
  
  if (errorContains(error, 'Foreign key constraint')) {
    return createStructuredErrorResponse(
      ErrorType.VALIDATION,
      'Referenced resource not found',
      400,
      undefined,
      requestId
    );
  }
  
  if (errorContains(error, 'Record to update not found')) {
    return createStructuredErrorResponse(
      ErrorType.NOT_FOUND,
      'Resource not found',
      404,
      undefined,
      requestId
    );
  }

  if (errorContains(error, 'Unauthorized') || errorContains(error, 'Authentication')) {
    return createStructuredErrorResponse(
      ErrorType.AUTHENTICATION,
      'Authentication required',
      401,
      undefined,
      requestId
    );
  }

  if (errorContains(error, 'Forbidden') || errorContains(error, 'Permission')) {
    return createStructuredErrorResponse(
      ErrorType.AUTHORIZATION,
      'Insufficient permissions',
      403,
      undefined,
      requestId
    );
  }

  // Default internal error
  return createStructuredErrorResponse(
    ErrorType.INTERNAL,
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : message,
    500,
    process.env.NODE_ENV === 'production' ? undefined : { originalError: message },
    requestId
  );
}

/**
 * Error logging utility
 */
export function logError(
  error: unknown,
  context: string,
  additionalInfo?: Record<string, any>
): void {
  const errorInfo = {
    context,
    message: getErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...additionalInfo,
  };

  console.error('Application Error:', errorInfo);

  // In production, you would send this to an error tracking service
  // like Sentry, DataDog, or CloudWatch
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: any, context?: any) => Promise<NextResponse>
) {
  return async (request: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, 'API Handler');
    }
  };
}