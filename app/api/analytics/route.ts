/**
 * Analytics API endpoint
 * 
 * Provides analytics metrics and data for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/analytics
 * 
 * Retrieves analytics metrics for a specified date range
 * 
 * Query parameters:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - type: 'overview' | 'channels' | 'response-time' (default: 'overview')
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const type = searchParams.get('type') || 'overview';

    // Validate date parameters
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    const filter = { startDate, endDate };

    // Return different data based on type
    switch (type) {
      case 'overview':
        const metrics = await analyticsService.getMetrics(filter);
        return NextResponse.json(metrics);

      case 'channels':
        const channelMetrics = await analyticsService.getChannelMetrics(filter);
        return NextResponse.json(channelMetrics);

      case 'response-time':
        const responseTimeData = await analyticsService.getResponseTimeChart(filter);
        return NextResponse.json(responseTimeData);

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
