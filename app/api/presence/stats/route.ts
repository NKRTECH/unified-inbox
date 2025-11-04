/**
 * Presence Statistics API Endpoint
 * Get overall presence statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { presenceService } from '@/lib/services/presence-service';
import { auth } from '@/lib/auth/auth';

/**
 * GET /api/presence/stats
 * Get presence statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get statistics
    const stats = presenceService.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching presence stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presence statistics' },
      { status: 500 }
    );
  }
}
