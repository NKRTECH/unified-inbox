'use client';

/**
 * Metric Card Component
 * 
 * Displays a single analytics metric with label and value
 */

import { Card } from '@/components/ui/card';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, subtitle, trend, icon }: MetricCardProps) {
  return (
    <Card className="p-6 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-600 ml-2">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
