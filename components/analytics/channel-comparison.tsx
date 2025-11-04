'use client';

/**
 * Channel Comparison Component
 * 
 * Displays side-by-side comparison of channel performance metrics
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChannelMetrics } from '@/lib/services';
import { Channel } from '@prisma/client';

interface ChannelComparisonProps {
  data: ChannelMetrics[];
}

const channelColors: Record<Channel, string> = {
  SMS: 'bg-blue-600 text-white',
  WHATSAPP: 'bg-green-600 text-white',
  EMAIL: 'bg-purple-600 text-white',
  TWITTER: 'bg-sky-600 text-white',
  FACEBOOK: 'bg-blue-700 text-white',
};

const channelLabels: Record<Channel, string> = {
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  TWITTER: 'Twitter',
  FACEBOOK: 'Facebook',
};

export function ChannelComparison({ data }: ChannelComparisonProps) {
  // Filter out channels with no messages
  const activeChannels = data.filter(c => c.totalMessages > 0);

  if (activeChannels.length === 0) {
    return (
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Channel Comparison</h3>
        <div className="flex items-center justify-center h-64 text-gray-600">
          No channel data available for the selected period
        </div>
      </Card>
    );
  }

  const maxMessages = Math.max(...activeChannels.map(c => c.totalMessages));

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Channel Comparison</h3>
      
      <div className="space-y-6">
        {activeChannels.map((channel) => (
          <div key={channel.channel} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${channelColors[channel.channel]} font-semibold`}>
                  {channelLabels[channel.channel]}
                </Badge>
                <span className="text-sm text-gray-900 font-semibold">
                  {channel.totalMessages} messages
                </span>
              </div>
              <div className="text-sm text-gray-900 font-semibold">
                {channel.averageResponseTime.toFixed(1)}m avg response
              </div>
            </div>

            {/* Volume bar */}
            <div className="relative h-8 bg-gray-200 rounded overflow-hidden border border-gray-300">
              <div
                className={`h-full ${channelColors[channel.channel].split(' ')[0]} transition-all duration-500`}
                style={{ width: `${(channel.totalMessages / maxMessages) * 100}%` }}
              />
            </div>

            {/* Metrics row */}
            <div className="flex gap-4 text-sm text-gray-900">
              <div>
                <span className="font-semibold">Delivery Rate:</span>{' '}
                <span className={channel.deliveryRate >= 95 ? 'text-green-700 font-bold' : 'text-orange-700 font-bold'}>
                  {channel.deliveryRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="font-semibold">Failures:</span>{' '}
                <span className={channel.failureCount > 0 ? 'text-red-700 font-bold' : 'text-gray-900 font-bold'}>
                  {channel.failureCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div className="mt-6 pt-6 border-t border-gray-300">
        <h4 className="text-sm font-semibold mb-3 text-gray-900">Performance Summary</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 text-gray-900 font-semibold">Channel</th>
                <th className="text-right py-2 text-gray-900 font-semibold">Messages</th>
                <th className="text-right py-2 text-gray-900 font-semibold">Delivery</th>
                <th className="text-right py-2 text-gray-900 font-semibold">Avg Response</th>
                <th className="text-right py-2 text-gray-900 font-semibold">Failures</th>
              </tr>
            </thead>
            <tbody>
              {activeChannels.map((channel) => (
                <tr key={channel.channel} className="border-b border-gray-200">
                  <td className="py-2 text-gray-900 font-semibold">{channelLabels[channel.channel]}</td>
                  <td className="text-right text-gray-900 font-medium">{channel.totalMessages}</td>
                  <td className="text-right text-gray-900 font-medium">{channel.deliveryRate.toFixed(1)}%</td>
                  <td className="text-right text-gray-900 font-medium">{channel.averageResponseTime.toFixed(1)}m</td>
                  <td className="text-right text-gray-900 font-medium">{channel.failureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
