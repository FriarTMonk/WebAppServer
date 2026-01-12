'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
  actions?: ReactNode;
}

export function ChartContainer({
  title,
  description,
  isLoading = false,
  error = null,
  children,
  actions,
}: ChartContainerProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {(title || actions) && (
        <div className="flex justify-between items-start mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
          <span className="sr-only">Loading chart data...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-medium">Error loading chart</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && children}
    </div>
  );
}
