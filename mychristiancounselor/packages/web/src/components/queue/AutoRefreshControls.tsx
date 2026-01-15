'use client';

import { useState } from 'react';

interface AutoRefreshControlsProps {
  enabled: boolean;
  interval: number;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
}

const INTERVAL_OPTIONS = [
  { value: 3000, label: '3s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
];

export function AutoRefreshControls({
  enabled,
  interval,
  onToggle,
  onIntervalChange,
}: AutoRefreshControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          enabled
            ? 'bg-green-50 text-green-700 border border-green-300'
            : 'bg-gray-100 text-gray-700 border border-gray-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium">
          Auto-refresh: {enabled ? 'On' : 'Off'}
        </span>
        <span className="text-xs text-gray-500">
          ({INTERVAL_OPTIONS.find(opt => opt.value === interval)?.label})
        </span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Auto-refresh
                </span>
                <button
                  onClick={() => onToggle(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Interval selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refresh Interval
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {INTERVAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onIntervalChange(option.value)}
                      disabled={!enabled}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        interval === option.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : enabled
                          ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500 border-t pt-3">
                {enabled
                  ? 'Queue data refreshes automatically. Polling slows when tab is inactive.'
                  : 'Enable auto-refresh to keep queue data up-to-date.'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
