'use client';

import { useState } from 'react';

export interface ActionCardProps {
  index: number;
  action: any;
  onUpdate: (index: number, action: any) => void;
  onRemove: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ActionCard({
  index,
  action,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <h4 className="font-medium">
            Action {index + 1}: {action.type || 'Unconfigured'}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {canMoveUp && onMoveUp && (
            <button
              onClick={() => onMoveUp(index)}
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              title="Move up"
            >
              ↑
            </button>
          )}
          {canMoveDown && onMoveDown && (
            <button
              onClick={() => onMoveDown(index)}
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
              title="Move down"
            >
              ↓
            </button>
          )}
          <button
            onClick={() => onRemove(index)}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Action-specific form fields will be passed as children */}
          <div className="text-sm text-gray-600">
            Configure action details in the wizard
          </div>
        </div>
      )}
    </div>
  );
}
