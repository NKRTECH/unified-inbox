import { QueryClient } from '@tanstack/react-query';

/**
 * Creates and configures a new QueryClient instance with optimized settings
 * for the unified inbox application with support for optimistic updates
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: how long data is considered fresh (5 minutes)
        staleTime: 5 * 60 * 1000,
        // Cache time: how long inactive data stays in cache (10 minutes)
        gcTime: 10 * 60 * 1000,
        // Retry failed requests up to 3 times with exponential backoff
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,
        // Refetch when reconnecting to network
        refetchOnReconnect: true,
        // Enable network mode for better offline support
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on network errors
        retry: (failureCount, error: any) => {
          // Only retry network errors, not client errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        // Enable network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

/**
 * Global query client instance for server-side rendering
 * This should only be used on the server side
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Gets or creates a QueryClient instance for browser usage
 * Ensures we don't create multiple instances on the client side
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient();
    }
    return browserQueryClient;
  }
}