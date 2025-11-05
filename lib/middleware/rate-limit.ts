/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting functionality for API endpoints to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * In production, use Redis or similar distributed cache
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.get(key);

    if (!entry) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.set(key, newEntry);
      return newEntry;
    }

    entry.count++;
    this.set(key, entry);
    return entry;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest, useUserId?: string): string {
  // Use user ID if authenticated
  if (useUserId) {
    return `user:${useUserId}`;
  }

  // Use IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
  } = config;

  const identifier = getClientIdentifier(request, userId);
  const key = `${request.nextUrl.pathname}:${identifier}`;

  const entry = rateLimitStore.increment(key, windowMs);

  // Add rate limit headers
  const headers = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
  };

  // Check if rate limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
    
    return NextResponse.json(
      {
        error: message,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  return null; // No rate limit exceeded
}

/**
 * Create rate limit middleware with config
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest, userId?: string): Promise<NextResponse | null> => {
    return rateLimit(request, config, userId);
  };
}

/**
 * Predefined rate limiters
 */

/**
 * Strict rate limiter for sensitive operations (e.g., login, password reset)
 * 5 requests per 15 minutes
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many attempts, please try again in 15 minutes',
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes
 */
export const standardRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

/**
 * Relaxed rate limiter for read operations
 * 300 requests per 15 minutes
 */
export const relaxedRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300,
});

/**
 * Message sending rate limiter
 * 50 messages per hour
 */
export const messageSendRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  message: 'Message sending limit exceeded, please try again later',
});

/**
 * Webhook rate limiter
 * 1000 requests per minute (for high-volume webhooks)
 */
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000,
});

/**
 * Per-user rate limiter
 * Different limits based on user role
 */
export async function userRoleBasedRateLimit(
  request: NextRequest,
  userId: string,
  userRole: 'VIEWER' | 'EDITOR' | 'ADMIN'
): Promise<NextResponse | null> {
  const limits = {
    VIEWER: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
    EDITOR: { windowMs: 15 * 60 * 1000, maxRequests: 200 },
    ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 500 },
  };

  const config = limits[userRole];
  return rateLimit(request, config, userId);
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(request: NextRequest, userId?: string): void {
  const identifier = getClientIdentifier(request, userId);
  const key = `${request.nextUrl.pathname}:${identifier}`;
  rateLimitStore.reset(key);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(
  request: NextRequest,
  userId?: string
): { count: number; resetTime: number; remaining: number } | null {
  const identifier = getClientIdentifier(request, userId);
  const key = `${request.nextUrl.pathname}:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  return {
    count: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, entry.count),
  };
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimitStore(): void {
  rateLimitStore.destroy();
}

/**
 * Example usage in API route:
 * 
 * ```typescript
 * import { standardRateLimiter } from '@/lib/middleware/rate-limit';
 * 
 * export async function POST(request: NextRequest) {
 *   // Apply rate limiting
 *   const rateLimitResult = await standardRateLimiter(request);
 *   if (rateLimitResult) {
 *     return rateLimitResult;
 *   }
 *   
 *   // Continue with normal request handling
 * }
 * ```
 * 
 * With user authentication:
 * 
 * ```typescript
 * import { requireAuth } from '@/lib/middleware/rbac';
 * import { userRoleBasedRateLimit } from '@/lib/middleware/rate-limit';
 * 
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAuth(request);
 *   if (authResult instanceof NextResponse) {
 *     return authResult;
 *   }
 *   
 *   const { user } = authResult;
 *   
 *   // Apply role-based rate limiting
 *   const rateLimitResult = await userRoleBasedRateLimit(request, user.id, user.role);
 *   if (rateLimitResult) {
 *     return rateLimitResult;
 *   }
 *   
 *   // Continue with normal request handling
 * }
 * ```
 */
