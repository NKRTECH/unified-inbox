/**
 * Analytics Export API endpoint
 * 
 * Generates downloadable reports in CSV or PDF format
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/analytics/export
 * 
 * Exports analytics data in the specified format
 * 
 * Query parameters:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - format: 'csv' | 'json' (default: 'csv')
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
    const format = searchParams.get('format') || 'csv';

    // Validate parameters
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

    const filter = { startDate, endDate };

    // Fetch all analytics data
    const [metrics, channelMetrics, responseTimeData] = await Promise.all([
      analyticsService.getMetrics(filter),
      analyticsService.getChannelMetrics(filter),
      analyticsService.getResponseTimeChart(filter),
    ]);

    // Generate export based on format
    if (format === 'csv') {
      const csv = generateCSV(metrics, channelMetrics, responseTimeData, startDate, endDate);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'json') {
      const data = {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        overview: metrics,
        channels: channelMetrics,
        responseTimeTrend: responseTimeData,
        generatedAt: new Date().toISOString(),
      };

      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: csv, json' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV format export
 */
function generateCSV(
  metrics: any,
  channelMetrics: any[],
  responseTimeData: any[],
  startDate: Date,
  endDate: Date
): string {
  const lines: string[] = [];

  // Header
  lines.push('Analytics Report');
  lines.push(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Overview Metrics
  lines.push('OVERVIEW METRICS');
  lines.push('Metric,Value');
  lines.push(`Total Messages,${metrics.totalMessages}`);
  lines.push(`Inbound Messages,${metrics.inboundMessages}`);
  lines.push(`Outbound Messages,${metrics.outboundMessages}`);
  lines.push(`Average Response Time (minutes),${metrics.averageResponseTime.toFixed(2)}`);
  lines.push(`Delivery Rate (%),${metrics.deliveryRate.toFixed(2)}`);
  lines.push(`Read Rate (%),${metrics.readRate.toFixed(2)}`);
  lines.push(`Failure Rate (%),${metrics.failureRate.toFixed(2)}`);
  lines.push('');

  // Channel Volume
  lines.push('CHANNEL VOLUME');
  lines.push('Channel,Message Count');
  Object.entries(metrics.channelVolume).forEach(([channel, count]) => {
    lines.push(`${channel},${count}`);
  });
  lines.push('');

  // Channel Performance
  lines.push('CHANNEL PERFORMANCE');
  lines.push('Channel,Total Messages,Delivery Rate (%),Avg Response Time (min),Failures');
  channelMetrics.forEach((channel) => {
    lines.push(
      `${channel.channel},${channel.totalMessages},${channel.deliveryRate.toFixed(2)},${channel.averageResponseTime.toFixed(2)},${channel.failureCount}`
    );
  });
  lines.push('');

  // Response Time Trend
  if (responseTimeData.length > 0) {
    lines.push('RESPONSE TIME TREND');
    lines.push('Date,Avg Response Time (min),Message Count');
    responseTimeData.forEach((point) => {
      lines.push(`${point.date},${point.averageResponseTime.toFixed(2)},${point.messageCount}`);
    });
  }

  return lines.join('\n');
}
