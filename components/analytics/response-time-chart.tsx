'use client';

/**
 * Response Time Chart Component
 * 
 * Displays response time trends over time
 */

import { Card } from '@/components/ui/card';
import { ResponseTimeDataPoint } from '@/lib/services';

interface ResponseTimeChartProps {
  data: ResponseTimeDataPoint[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Response Time Trend</h3>
        <div className="flex items-center justify-center h-64 text-gray-600">
          No data available for the selected period
        </div>
      </Card>
    );
  }

  // Find min and max for scaling
  const maxResponseTime = Math.max(...data.map(d => d.averageResponseTime));
  const minResponseTime = Math.min(...data.map(d => d.averageResponseTime));
  const range = maxResponseTime - minResponseTime || 1;

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Response Time Trend</h3>
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-700 font-medium">
          <span>{maxResponseTime.toFixed(1)}m</span>
          <span>{((maxResponseTime + minResponseTime) / 2).toFixed(1)}m</span>
          <span>{minResponseTime.toFixed(1)}m</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 h-full relative border-l-2 border-b-2 border-gray-300">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="33%" x2="100%" y2="33%" stroke="#d1d5db" strokeWidth="1" />
            <line x1="0" y1="66%" x2="100%" y2="66%" stroke="#d1d5db" strokeWidth="1" />

            {/* Line chart */}
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              points={data
                .map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - ((point.averageResponseTime - minResponseTime) / range) * 100;
                  return `${x}%,${y}%`;
                })
                .join(' ')}
            />

            {/* Data points */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.averageResponseTime - minResponseTime) / range) * 100;
              return (
                <circle
                  key={point.date}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="5"
                  fill="#2563eb"
                  className="hover:r-6 cursor-pointer"
                >
                  <title>
                    {point.date}: {point.averageResponseTime.toFixed(1)} minutes
                    ({point.messageCount} responses)
                  </title>
                </circle>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="ml-16 mt-2 flex justify-between text-xs text-gray-700 font-medium">
          <span>{data[0]?.date}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    </Card>
  );
}
