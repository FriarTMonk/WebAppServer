'use client';

import { WorkflowWizardState } from './types';
import { JsonPreview } from './shared/JsonPreview';
import { ACTION_TYPES } from './constants';

interface Step5ReviewActivateProps {
  state: WorkflowWizardState;
  onTest?: () => void;
  testing?: boolean;
}

export function Step5ReviewActivate({
  state,
  onTest,
  testing = false,
}: Step5ReviewActivateProps) {
  const buildCompleteWorkflowJson = () => {
    return {
      name: state.name,
      description: state.description,
      organizationId: state.organizationId,
      trigger: {
        event: state.trigger?.event,
        ...state.conditions,
      },
      actions: state.actions,
      isActive: state.isActive,
    };
  };

  const getActionSummary = (action: any) => {
    const actionType = ACTION_TYPES.find(at => at.type === action.type);
    if (!actionType) return 'Unknown action';

    let summary = actionType.name;

    // Add key details based on action type
    switch (action.type) {
      case 'send_email':
        summary += ` to ${action.to} (${action.template})`;
        break;
      case 'assign_task':
        summary += ` (${action.taskType}, due in ${action.dueDate} days, ${action.priority} priority)`;
        break;
      case 'update_status':
        summary += ` (set ${action.field} to ${action.value})`;
        break;
      case 'create_crisis_alert':
        summary += ` (${action.severity} severity)`;
        break;
      case 'log_event':
        summary += ` (${action.eventType})`;
        break;
    }

    return summary;
  };

  const getConditionsSummary = () => {
    if (!state.trigger) return 'No trigger selected';

    const parts: string[] = [state.trigger.name];

    switch (state.trigger.event) {
      case 'assessment_completed':
        if (state.conditions.assessmentType) {
          parts.push(`Assessment: ${state.conditions.assessmentType}`);
        }
        if (state.conditions.minScore || state.conditions.maxScore) {
          parts.push(
            `Score: ${state.conditions.minScore || 0} - ${state.conditions.maxScore || 100}`
          );
        }
        break;

      case 'score_threshold_exceeded':
        parts.push(
          `${state.conditions.assessmentType} ${state.conditions.operator} ${state.conditions.threshold}`
        );
        break;

      case 'task_overdue':
        parts.push(`${state.conditions.daysOverdue} days overdue`);
        break;

      case 'conversation_stale':
        parts.push(`${state.conditions.daysWithoutResponse} days without response`);
        break;

      case 'wellness_pattern':
        parts.push(`${state.conditions.patternType} (${state.conditions.severity} severity)`);
        break;

      case 'crisis_keyword':
        parts.push(`Keywords: ${state.conditions.keywords}`);
        parts.push(`Match: ${state.conditions.matchType}`);
        break;

      case 'member_inactive':
        parts.push(`${state.conditions.daysInactive} days inactive`);
        break;

      case 'subscription_expiring':
        parts.push(`${state.conditions.daysBeforeExpiration} days before expiration`);
        break;
    }

    return parts.join(' • ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 5: Review & Activate</h2>
        <p className="text-sm text-gray-600">
          Review your workflow configuration before creating it.
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex">
            <dt className="font-medium text-gray-700 w-32">Name:</dt>
            <dd className="text-gray-900">{state.name}</dd>
          </div>
          {state.description && (
            <div className="flex">
              <dt className="font-medium text-gray-700 w-32">Description:</dt>
              <dd className="text-gray-900">{state.description}</dd>
            </div>
          )}
          <div className="flex">
            <dt className="font-medium text-gray-700 w-32">Status:</dt>
            <dd className={state.isActive ? 'text-green-600' : 'text-gray-500'}>
              {state.isActive ? 'Active' : 'Inactive'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Trigger & Conditions */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Trigger & Conditions</h3>
        <p className="text-sm text-gray-900">{getConditionsSummary()}</p>
        <div className="mt-3">
          <JsonPreview
            data={{ trigger: state.trigger, conditions: state.conditions }}
            title="Trigger JSON"
            defaultExpanded={false}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Actions ({state.actions.length})
        </h3>
        <ol className="space-y-2 text-sm list-decimal list-inside">
          {state.actions.map((action, index) => (
            <li key={index} className="text-gray-900">
              {getActionSummary(action)}
              <div className="ml-6 mt-2">
                <JsonPreview
                  data={action}
                  title={`Action ${index + 1} JSON`}
                  defaultExpanded={false}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Complete JSON */}
      <JsonPreview
        data={buildCompleteWorkflowJson()}
        title="Complete Workflow JSON"
        defaultExpanded={false}
      />

      {/* Test Button */}
      {onTest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 mb-3">
            Test this workflow to validate the configuration without saving.
          </p>
          <button
            onClick={onTest}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {testing ? 'Testing...' : 'Test Workflow'}
          </button>
        </div>
      )}
    </div>
  );
}
