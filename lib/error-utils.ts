import { NextResponse } from 'next/server';

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
 * Handles API errors with consistent logging and response format
 * @param error - The error to handle
 * @param context - Context information for logging
 * @returns NextResponse with error
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  const message = getErrorMessage(error);
  console.error(`Error in ${context}:`, error);
  
  // Handle specific error types
  if (errorContains(error, 'Unique constraint')) {
    return createErrorResponse('Resource already exists', 409);
  }
  
  if (errorContains(error, 'Foreign key constraint')) {
    return createErrorResponse('Referenced resource not found', 400);
  }
  
  if (errorContains(error, 'Record to update not found')) {
    return createErrorResponse('Resource not found', 404);
  }
  
  return createErrorResponse(message, 500);
}