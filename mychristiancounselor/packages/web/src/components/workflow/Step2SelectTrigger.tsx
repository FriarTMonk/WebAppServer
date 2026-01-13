'use client';

import { TRIGGER_TYPES } from './constants';
import { TriggerConfig } from './types';
import { JsonPreview } from './shared/JsonPreview';

interface Step2SelectTriggerProps {
  trigger: TriggerConfig | null;
  onTriggerChange: (trigger: TriggerConfig, resetConditions?: boolean) => void;
  error?: string;
}

export function Step2SelectTrigger({
  trigger,
  onTriggerChange,
  error,
}: Step2SelectTriggerProps) {
  const handleSelectTrigger = (event: string) => {
    const triggerType = TRIGGER_TYPES.find(t => t.event === event);
    if (triggerType) {
      const newTrigger = {
        event: triggerType.event,
        name: triggerType.name,
        description: triggerType.description,
      };

      // Reset conditions if trigger changed
      const shouldReset = trigger?.event !== event;
      onTriggerChange(newTrigger, shouldReset);
    }
  };

  const selectedTriggerType = trigger
    ? TRIGGER_TYPES.find(t => t.event === trigger.event)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 2: Select Trigger</h2>
        <p className="text-sm text-gray-600">
          Choose what event will trigger this workflow.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trigger Type *
        </label>
        <select
          value={trigger?.event || ''}
          onChange={(e) => handleSelectTrigger(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Select a trigger...</option>
          {TRIGGER_TYPES.map((triggerType) => (
            <option key={triggerType.event} value={triggerType.event}>
              {triggerType.name} - {triggerType.description}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      {selectedTriggerType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            {selectedTriggerType.name}
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            {selectedTriggerType.helpText}
          </p>
          <JsonPreview
            data={selectedTriggerType.exampleJson}
            title="Example JSON Structure"
            defaultExpanded={false}
          />
        </div>
      )}
    </div>
  );
}
