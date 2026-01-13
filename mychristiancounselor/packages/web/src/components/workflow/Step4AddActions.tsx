'use client';

import { useState } from 'react';
import { ActionConfig } from './types';
import { ACTION_TYPES } from './constants';
import { JsonPreview } from './shared/JsonPreview';
import { ActionFormFields } from './shared/ActionFormFields';

interface Step4AddActionsProps {
  actions: ActionConfig[];
  onActionsChange: (actions: ActionConfig[]) => void;
  error?: string;
}

export function Step4AddActions({
  actions,
  onActionsChange,
  error,
}: Step4AddActionsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    actions.length > 0 ? 0 : null
  );

  const handleAddAction = () => {
    if (actions.length >= 10) {
      return; // Max 10 actions
    }
    const newAction: ActionConfig = { type: '' };
    onActionsChange([...actions, newAction]);
    setExpandedIndex(actions.length);
  };

  const handleUpdateAction = (index: number, action: ActionConfig) => {
    const updated = [...actions];
    updated[index] = action;
    onActionsChange(updated);
  };

  const handleRemoveAction = (index: number) => {
    const updated = actions.filter((_, i) => i !== index);
    onActionsChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...actions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onActionsChange(updated);
    setExpandedIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return;
    const updated = [...actions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onActionsChange(updated);
    setExpandedIndex(index + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 4: Add Actions</h2>
        <p className="text-sm text-gray-600">
          Define what actions should be taken when this workflow triggers (1-10 actions).
        </p>
      </div>

      <div className="space-y-4">
        {actions.map((action, index) => {
          const actionType = ACTION_TYPES.find(at => at.type === action.type);
          const isExpanded = expandedIndex === index;

          return (
            <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <h4 className="font-medium">
                    Action {index + 1}: {actionType ? actionType.name : 'Select action type'}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <button
                      onClick={() => handleMoveUp(index)}
                      className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                      title="Move up"
                    >
                      ↑
                    </button>
                  )}
                  {index < actions.length - 1 && (
                    <button
                      onClick={() => handleMoveDown(index)}
                      className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                      title="Move down"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveAction(index)}
                    className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type *
                    </label>
                    <select
                      value={action.type}
                      onChange={(e) =>
                        handleUpdateAction(index, { ...action, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="">Select an action...</option>
                      {ACTION_TYPES.map((at) => (
                        <option key={at.type} value={at.type}>
                          {at.name} - {at.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {actionType && (
                    <ActionFormFields
                      actionType={actionType}
                      action={action}
                      onChange={(updated) => handleUpdateAction(index, updated)}
                    />
                  )}

                  {actionType && (
                    <JsonPreview
                      data={action}
                      title="Action JSON"
                      defaultExpanded={false}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {actions.length < 10 && (
          <button
            onClick={handleAddAction}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            + Add Action
          </button>
        )}

        {actions.length >= 10 && (
          <p className="text-sm text-gray-500 text-center">
            Maximum of 10 actions reached
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <JsonPreview
          data={{ actions }}
          title="All Actions JSON Preview"
          defaultExpanded={false}
        />
      )}
    </div>
  );
}
