'use client';

import { useState } from 'react';
import { showToast } from '@/components/Toast';

interface JsonPreviewProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
}

export function JsonPreview({ data, title = 'JSON Preview', defaultExpanded = false }: JsonPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      showToast('JSON copied to clipboard', 'success');
    } catch (error) {
      showToast('Failed to copy JSON', 'error');
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          {title}
        </button>
        <button
          onClick={handleCopy}
          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
        >
          Copy
        </button>
      </div>
      {isExpanded && (
        <pre className="p-4 text-xs overflow-x-auto">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}
