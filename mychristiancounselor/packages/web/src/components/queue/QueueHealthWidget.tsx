'use client';

import { QueueHealthMetrics } from '@/utils/queueHealth';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface QueueHealthWidgetProps {
  health: QueueHealthMetrics;
  failureHistory: Array<{ timestamp: string; rate: number }>; // Last 24 hours
  lastUpdateSeconds: number;
  onSettingsClick?: () => void;
}

export function QueueHealthWidget({
  health,
  failureHistory,
  lastUpdateSeconds,
  onSettingsClick,
}: QueueHealthWidgetProps) {
  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  const statusTextColors = {
    healthy: 'text-green-700',
    degraded: 'text-yellow-700',
    critical: 'text-red-700',
  };

  const statusLabels = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    critical: 'Critical',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6" id="queue-health">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColors[health.status]} animate-pulse`} />
            <span className={`font-semibold ${statusTextColors[health.status]}`}>
              {statusLabels[health.status]}
            </span>
          </div>
          <span className="text-sm text-gray-600">•</span>
          <span className="text-sm text-gray-600">{health.message}</span>
        </div>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border rounded"
            title="Notification Settings"
          >
            ⚙️ Settings
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">Processing Rate</div>
          <div className="text-2xl font-semibold">
            {health.processingRate.toFixed(1)}
            <span className="text-sm text-gray-500 ml-1">jobs/min</span>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">Est. Time to Clear</div>
          <div className="text-2xl font-semibold">
            {health.estimatedTimeToClear > 0
              ? `${health.estimatedTimeToClear} min`
              : '—'}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">24h Failure Rate</div>
          <div className="text-2xl font-semibold">
            {health.failureRate.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">24h Trend</div>
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={failureHistory}>
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Last update: {lastUpdateSeconds} seconds ago
      </div>
    </div>
  );
}
