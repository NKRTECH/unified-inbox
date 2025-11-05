/**
 * Presence Statistics API Endpoint
 * Get overall presence statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { presenceService } from '@/lib/services/presence-service';
import { requireAdmin } from '@/lib/middleware/rbac';

/**
 * GET /api/presence/stats
 * Get presence statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

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
