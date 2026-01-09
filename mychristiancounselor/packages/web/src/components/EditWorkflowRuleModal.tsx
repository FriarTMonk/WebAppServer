'use client';

import { useState, useEffect } from 'react';
import { apiPatch } from '@/lib/api';

interface WorkflowRule {
  id: string;
  name: string;
  level: string;
  trigger: any;
  conditions?: any;
  actions: any[];
  priority?: number;
  enabled: boolean;
}

interface EditWorkflowRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rule: WorkflowRule;
}

export function EditWorkflowRuleModal({ open, onClose, onSuccess, rule }: EditWorkflowRuleModalProps) {
  const [name, setName] = useState(rule.name);
  const [trigger, setTrigger] = useState(JSON.stringify(rule.trigger, null, 2));
  const [conditions, setConditions] = useState(
    rule.conditions ? JSON.stringify(rule.conditions, null, 2) : ''
  );
  const [actions, setActions] = useState(JSON.stringify(rule.actions, null, 2));
  const [priority, setPriority] = useState(rule.priority?.toString() || '');
  const [enabled, setEnabled] = useState(rule.enabled);
  const [error, setError] = useState('');
  const [jsonErrors, setJsonErrors] = useState<{
    trigger?: string;
    conditions?: string;
    actions?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Sync form state when rule changes
  useEffect(() => {
    setName(rule.name);
    setTrigger(JSON.stringify(rule.trigger, null, 2));
    setConditions(rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '');
    setActions(JSON.stringify(rule.actions, null, 2));
    setPriority(rule.priority?.toString() || '');
    setEnabled(rule.enabled);
  }, [rule]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [open, isLoading, onClose]);

  // JSON validation helper
  const validateJSON = (value: string, fieldName: string): any => {
    if (!value.trim()) {
      if (fieldName === 'conditions') return undefined; // Conditions are optional
      throw new Error(`${fieldName} is required`);
    }

    try {
      const parsed = JSON.parse(value);

      // Validate actions is an array
      if (fieldName === 'actions' && !Array.isArray(parsed)) {
        throw new Error('Actions must be an array');
      }

      // Validate trigger and conditions are objects
      if ((fieldName === 'trigger' || fieldName === 'conditions') &&
          (typeof parsed !== 'object' || Array.isArray(parsed))) {
        throw new Error(`${fieldName} must be an object`);
      }

      return parsed;
    } catch (err: any) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
  };

  // Real-time JSON validation
  const handleTriggerChange = (value: string) => {
    setTrigger(value);
    try {
      if (value.trim()) {
        validateJSON(value, 'trigger');
        setJsonErrors({ ...jsonErrors, trigger: undefined });
      }
    } catch (err: any) {
      setJsonErrors({ ...jsonErrors, trigger: err.message });
    }
  };

  const handleConditionsChange = (value: string) => {
    setConditions(value);
    try {
      if (value.trim()) {
        validateJSON(value, 'conditions');
      }
      setJsonErrors({ ...jsonErrors, conditions: undefined });
    } catch (err: any) {
      setJsonErrors({ ...jsonErrors, conditions: err.message });
    }
  };

  const handleActionsChange = (value: string) => {
    setActions(value);
    try {
      if (value.trim()) {
        validateJSON(value, 'actions');
        setJsonErrors({ ...jsonErrors, actions: undefined });
      }
    } catch (err: any) {
      setJsonErrors({ ...jsonErrors, actions: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all JSON fields
    try {
      const parsedTrigger = validateJSON(trigger, 'trigger');
      const parsedConditions = conditions.trim() ? validateJSON(conditions, 'conditions') : undefined;
      const parsedActions = validateJSON(actions, 'actions');

      setIsLoading(true);

      const updateData: any = {
        name: name.trim(),
        trigger: parsedTrigger,
        actions: parsedActions,
        enabled,
      };

      if (parsedConditions) {
        updateData.conditions = parsedConditions;
      }

      if (priority.trim()) {
        updateData.priority = parseInt(priority, 10);
      }

      const response = await apiPatch(`/workflow/rules/${rule.id}`, updateData);

      if (!response.ok) {
        let errorMessage = 'Failed to update workflow rule';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update workflow rule:', err);
      setError(err.message || 'Failed to update workflow rule');
    } finally {
      setIsLoading(false);
    }
  };

  const hasJsonErrors = !!(jsonErrors.trigger || jsonErrors.conditions || jsonErrors.actions);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            Edit Workflow Rule
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="px-6 py-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter rule name"
                required
                maxLength={200}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="trigger" className="block text-sm font-medium text-gray-700">
                Trigger (JSON) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="trigger"
                value={trigger}
                onChange={(e) => handleTriggerChange(e.target.value)}
                placeholder='{"event": "task_created"}'
                rows={4}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  jsonErrors.trigger ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {jsonErrors.trigger && (
                <p className="text-sm text-red-600">{jsonErrors.trigger}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="conditions" className="block text-sm font-medium text-gray-700">
                Conditions (JSON, optional)
              </label>
              <textarea
                id="conditions"
                value={conditions}
                onChange={(e) => handleConditionsChange(e.target.value)}
                placeholder='{"field": "status", "operator": "equals", "value": "pending"}'
                rows={4}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  jsonErrors.conditions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {jsonErrors.conditions && (
                <p className="text-sm text-red-600">{jsonErrors.conditions}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="actions" className="block text-sm font-medium text-gray-700">
                Actions (JSON Array) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="actions"
                value={actions}
                onChange={(e) => handleActionsChange(e.target.value)}
                placeholder='[{"type": "send_notification", "params": {...}}]'
                rows={6}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  jsonErrors.actions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {jsonErrors.actions && (
                <p className="text-sm text-red-600">{jsonErrors.actions}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority (optional)
              </label>
              <input
                type="number"
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="0"
                min={0}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enabled
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || hasJsonErrors || !name.trim() || !trigger.trim() || !actions.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
