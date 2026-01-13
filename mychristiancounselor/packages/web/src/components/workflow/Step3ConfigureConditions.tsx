'use client';

import { TriggerConfig, ConditionConfig } from './types';
import { ConditionForm } from './shared/ConditionForm';
import { JsonPreview } from './shared/JsonPreview';

interface Step3ConfigureConditionsProps {
  trigger: TriggerConfig | null;
  conditions: ConditionConfig;
  onConditionsChange: (conditions: ConditionConfig) => void;
  error?: string;
}

export function Step3ConfigureConditions({
  trigger,
  conditions,
  onConditionsChange,
  error,
}: Step3ConfigureConditionsProps) {
  if (!trigger) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 3: Configure Conditions</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Please select a trigger in Step 2 before configuring conditions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const buildConditionsJson = () => {
    return {
      trigger: trigger.event,
      ...conditions,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 3: Configure Conditions</h2>
        <p className="text-sm text-gray-600">
          Set the specific conditions for when "{trigger.name}" should trigger this workflow.
        </p>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">
          Trigger: {trigger.name}
        </h3>
        <ConditionForm
          trigger={trigger.event}
          conditions={conditions}
          onChange={onConditionsChange}
        />
        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </div>

      <JsonPreview
        data={buildConditionsJson()}
        title="Conditions JSON Preview"
        defaultExpanded={false}
      />
    </div>
  );
}
