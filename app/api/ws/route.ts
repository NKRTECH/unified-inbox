/**
 * WebSocket API Route
 * Handles WebSocket upgrade requests
 * 
 * Note: This is a placeholder route. The actual WebSocket server
 * needs to be initialized in a custom server setup (server.ts)
 * because Next.js API routes don't support WebSocket upgrades directly.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'WebSocket endpoint requires upgrade',
      message: 'Use WebSocket client to connect to this endpoint',
      endpoint: '/api/ws',
    },
    { status: 426 } // Upgrade Required
  );
}
