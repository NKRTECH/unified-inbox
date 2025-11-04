'use client';

/**
 * Analytics Dashboard Page
 * 
 * Displays comprehensive analytics and reporting for message engagement,
 * response times, and channel performance.
 */

import { useState, useEffect } from 'react';
import { DateRangePicker, DateRange, MetricCard, ResponseTimeChart, ChannelComparison, ExportButton } from '@/components/analytics';
import { AnalyticsMetrics, ChannelMetrics, ResponseTimeDataPoint } from '@/lib/services';

export default function AnalyticsPage() {
  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  });

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      // Fetch overview metrics
      const overviewRes = await fetch(`/api/analytics?${params}&type=overview`);
      if (!overviewRes.ok) throw new Error('Failed to fetch overview metrics');
      const overviewData = await overviewRes.json();
      setMetrics(overviewData);

      // Fetch channel metrics
      const channelsRes = await fetch(`/api/analytics?${params}&type=channels`);
      if (!channelsRes.ok) throw new Error('Failed to fetch channel metrics');
      const channelsData = await channelsRes.json();
      setChannelMetrics(channelsData);

      // Fetch response time data
      const responseTimeRes = await fetch(`/api/analytics?${params}&type=response-time`);
      if (!responseTimeRes.ok) throw new Error('Failed to fetch response time data');
      const responseTimeData = await responseTimeRes.json();
      setResponseTimeData(responseTimeData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-red-900 shadow-sm">
          <h3 className="font-bold text-lg">Error loading analytics</h3>
          <p className="text-sm mt-2 font-medium">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-6 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-700 mt-1 font-medium">
            Track engagement metrics and communication performance across all channels
          </p>
        </div>
        <ExportButton dateRange={dateRange} />
      </div>

      {/* Date Range Picker */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Messages"
                value={metrics.totalMessages.toLocaleString()}
                subtitle={`${metrics.inboundMessages} inbound, ${metrics.outboundMessages} outbound`}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                }
              />

              <MetricCard
                label="Avg Response Time"
                value={`${metrics.averageResponseTime.toFixed(1)}m`}
                subtitle="Time to first response"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <MetricCard
                label="Delivery Rate"
                value={`${metrics.deliveryRate.toFixed(1)}%`}
                subtitle={`${metrics.readRate.toFixed(1)}% read rate`}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <MetricCard
                label="Failure Rate"
                value={`${metrics.failureRate.toFixed(1)}%`}
                subtitle="Failed deliveries"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Response Time Chart */}
          <ResponseTimeChart data={responseTimeData} />

          {/* Channel Comparison */}
          <ChannelComparison data={channelMetrics} />

          {/* Channel Volume Breakdown */}
          {metrics && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Channel Volume Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(metrics.channelVolume).map(([channel, count]) => (
                  <div key={channel} className="text-center p-4 bg-gray-100 rounded border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-800 font-semibold mt-1">{channel}</div>
                    <div className="text-xs text-gray-700 font-medium mt-1">
                      {metrics.totalMessages > 0
                        ? ((count / metrics.totalMessages) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
