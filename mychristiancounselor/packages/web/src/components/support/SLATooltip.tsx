'use client';

import React from 'react';

interface SLATooltipProps {
  responseSLAStatus: string;
  resolutionSLAStatus: string;
  responseSLADeadline: string | null;
  resolutionSLADeadline: string | null;
  slaPausedAt: string | null;
  className?: string;
}

export function SLATooltip({
  responseSLAStatus,
  resolutionSLAStatus,
  responseSLADeadline,
  resolutionSLADeadline,
  slaPausedAt,
  className = '',
}: SLATooltipProps) {
  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs < 0) {
      // Overdue
      const overdueMins = Math.abs(Math.floor(diffMs / 1000 / 60));
      return `Overdue by ${formatMinutes(overdueMins)}`;
    } else {
      // Time remaining
      const remainingMins = Math.floor(diffMs / 1000 / 60);
      return `${formatMinutes(remainingMins)} remaining`;
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'approaching':
        return 'Approaching';
      case 'critical':
        return 'Critical';
      case 'breached':
        return 'Breached';
      default:
        return status;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-3 ${className}`}>
      {slaPausedAt && (
        <div className="mb-2 pb-2 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">SLA Paused</span> - Waiting on User
          </p>
          <p className="text-xs text-gray-500">
            Since {new Date(slaPausedAt).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {responseSLADeadline && (
          <div>
            <p className="text-xs font-semibold text-gray-700">Response SLA</p>
            <p className="text-xs text-gray-600">
              {getStatusLabel(responseSLAStatus)}:{' '}
              {formatTimeRemaining(responseSLADeadline)}
            </p>
          </div>
        )}

        {resolutionSLADeadline && (
          <div>
            <p className="text-xs font-semibold text-gray-700">Resolution SLA</p>
            <p className="text-xs text-gray-600">
              {getStatusLabel(resolutionSLAStatus)}:{' '}
              {formatTimeRemaining(resolutionSLADeadline)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
