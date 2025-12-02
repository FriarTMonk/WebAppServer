'use client';

import React from 'react';

export type SLAStatus = 'on_track' | 'approaching' | 'critical' | 'breached' | 'paused';

interface SLABadgeProps {
  status: SLAStatus;
  type?: 'response' | 'resolution';
  className?: string;
}

export function SLABadge({ status, type, className = '' }: SLABadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approaching':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'breached':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500';
      case 'approaching':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-orange-500';
      case 'breached':
        return 'bg-red-500';
      case 'paused':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()} ${className}`}
      title={`${type ? type.charAt(0).toUpperCase() + type.slice(1) + ' ' : ''}SLA: ${status.replace('_', ' ')}`}
    >
      <span className={`w-2 h-2 rounded-full ${getStatusDot()}`}></span>
      {status === 'paused' ? 'Paused' : type === 'response' ? 'Response' : 'Resolution'}
    </span>
  );
}
