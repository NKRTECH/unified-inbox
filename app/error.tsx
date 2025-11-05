'use client';

/**
 * Global Error Boundary
 * 
 * Catches and displays errors that occur during rendering
 */

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-center text-gray-900">
            Something went wrong
          </h1>

          <p className="mt-2 text-center text-gray-600">
            We encountered an unexpected error. Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
              <p className="font-semibold text-gray-700">Error details:</p>
              <p className="mt-1 text-gray-600 break-words">{error.message}</p>
              {error.digest && (
                <p className="mt-1 text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
