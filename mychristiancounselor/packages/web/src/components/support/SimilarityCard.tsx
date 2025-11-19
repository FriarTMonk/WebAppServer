'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface SimilarityCardProps {
  ticket: {
    id: string;
    title: string;
    description: string;
    status: string;
    resolution?: string;
  };
  score: number;
  badge: 'red' | 'yellow' | 'green';
  resolution?: string;
  actions: ReactNode;
}

export function SimilarityCard({
  ticket,
  score,
  badge,
  resolution,
  actions,
}: SimilarityCardProps) {
  const badgeColors = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_on_user: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_on_user: 'Waiting on User',
    resolved: 'Resolved',
    closed: 'Closed',
    rejected: 'Rejected',
  };

  return (
    <div className="border rounded-lg p-4 mb-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              href={`/support/tickets/${ticket.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              target="_blank"
            >
              #{ticket.id.substring(0, 8)} - {ticket.title}
            </Link>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColors[badge]}`}
            >
              {score}% match
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                statusColors[ticket.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[ticket.status] || ticket.status}
            </span>
          </div>

          {/* Description preview */}
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {ticket.description}
          </p>

          {/* Resolution (if historical) */}
          {resolution && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
              <p className="text-xs font-semibold text-blue-800 mb-1">
                Resolution:
              </p>
              <p className="text-sm text-blue-900">{resolution}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 text-sm">{actions}</div>
        </div>
      </div>
    </div>
  );
}
