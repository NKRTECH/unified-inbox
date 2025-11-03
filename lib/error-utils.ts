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