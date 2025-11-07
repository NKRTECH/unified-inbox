import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for auth routes
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    // Get the origin from the request
    const origin = request.headers.get('origin');
    
    // Allow requests from Vercel preview deployments and production
    const allowedOrigins = [
      'http://localhost:3000',
      'https://unified-inbox-nkr.vercel.app',
    ];
    
    // Allow all Vercel preview deployments
    const isVercelPreview = origin?.includes('.vercel.app');
    
    if (request.method === 'OPTIONS') {
      // Handle preflight requests
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // For actual requests, add CORS headers
    const response = NextResponse.next();
    
    if (origin && (allowedOrigins.includes(origin) || isVercelPreview)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/auth/:path*',
};
