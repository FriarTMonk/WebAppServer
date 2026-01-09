'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkflowRule, WorkflowRuleActivity, workflowRulesApi, apiDelete } from '@/lib/api';
import { EditWorkflowRuleModal } from './EditWorkflowRuleModal';

interface WorkflowRulesModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface GroupedRules {
  platform: WorkflowRule[];
  organization: WorkflowRule[];
  counselor: WorkflowRule[];
}

export default function WorkflowRulesModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: WorkflowRulesModalProps) {
  const [rules, setRules] = useState<GroupedRules>({
    platform: [],
    organization: [],
    counselor: [],
  });
  const [activity, setActivity] = useState<WorkflowRuleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreActivity, setShowMoreActivity] = useState(false);
  const [togglingRule, setTogglingRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both rules and activity in parallel
      const [rulesResponse, activityResponse] = await Promise.all([
        workflowRulesApi.getMemberRules(memberId),
        workflowRulesApi.getActivity(memberId),
      ]);

      // Handle rules response
      if (!rulesResponse.ok) {
        let errorMessage = 'Failed to load workflow rules';
        try {
          const data = await rulesResponse.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      // Handle activity response
      if (!activityResponse.ok) {
        let errorMessage = 'Failed to load workflow activity';
        try {
          const data = await activityResponse.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      const rulesData = await rulesResponse.json();
      const activityData = await activityResponse.json();

      // Group rules by level
      const grouped: GroupedRules = {
        platform: [],
        organization: [],
        counselor: [],
      };

      rulesData.forEach((rule: WorkflowRule) => {
        if (rule.level === 'platform') {
          grouped.platform.push(rule);
        } else if (rule.level === 'organization') {
          grouped.organization.push(rule);
        } else if (rule.level === 'counselor') {
          grouped.counselor.push(rule);
        }
      });

      setRules(grouped);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleRule = async (rule: WorkflowRule) => {
    setTogglingRule(rule.id);
    try {
      const response = await workflowRulesApi.update(rule.id, { enabled: !rule.enabled });
      if (!response.ok) {
        let errorMessage = 'Failed to update rule';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      await fetchData(); // Refresh data
      onSuccess(); // Notify parent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setTogglingRule(null);
    }
  };

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
  };

  const handleDelete = async (rule: WorkflowRule) => {
    if (!confirm(`Are you sure you want to delete the workflow rule "${rule.name}"?`)) {
      return;
    }

    try {
      const response = await apiDelete(`/workflow/rules/${rule.id}`);
      if (!response.ok) {
        let errorMessage = 'Failed to delete workflow rule';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }
      await fetchData(); // Refresh the rules list
      onSuccess(); // Notify parent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow rule');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTrigger = (trigger: any) => {
    if (!trigger) return 'Not configured';
    if (typeof trigger === 'string') return trigger;
    // If it's an object, try to extract meaningful info
    if (trigger.event) return trigger.event;
    if (trigger.type) return trigger.type;
    return JSON.stringify(trigger);
  };

  const renderRuleSection = (
    title: string,
    rulesList: WorkflowRule[],
    isEditable: boolean
  ) => {
    if (rulesList.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <div className="space-y-3">
          {rulesList.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    {isEditable ? (
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule)}
                            disabled={togglingRule === rule.id}
                            className="sr-only"
                          />
                          <div className={`block w-10 h-6 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${rule.enabled ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{rule.enabled ? 'ON' : 'OFF'}</span>
                      </label>
                    ) : (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.enabled ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Trigger:</span> {formatTrigger(rule.trigger)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Last triggered:</span>{' '}
                    {formatDate(rule.lastTriggered)}
                  </div>
                </div>
                {isEditable && (
                  <div className="flex gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(rule)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const displayedActivity = showMoreActivity ? activity : activity.slice(0, 5);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            Workflow Rules for {memberName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View automation rules and recent activity
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Loading workflow rules...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* Section 1: Applied Rules */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Applied Rules
                </h3>
                {rules.platform.length === 0 &&
                rules.organization.length === 0 &&
                rules.counselor.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                    No workflow rules configured yet
                  </div>
                ) : (
                  <>
                    {renderRuleSection('Platform Rules', rules.platform, false)}
                    {renderRuleSection(
                      'Organization Rules',
                      rules.organization,
                      false
                    )}
                    {renderRuleSection('My Rules', rules.counselor, true)}
                  </>
                )}
              </div>

              {/* Section 2: Recent Activity */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h3>
                {activity.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
                    No recent workflow activity
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {displayedActivity.map((event) => (
                        <div
                          key={event.id}
                          className="border-l-4 border-blue-500 pl-4 py-2"
                        >
                          <div className="text-sm text-gray-500 mb-1">
                            {formatDateTime(event.triggeredAt)}
                          </div>
                          <div className="font-medium text-gray-900 mb-1">
                            {event.ruleName}
                          </div>
                          <div className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">Trigger:</span>{' '}
                            {event.triggerReason}
                          </div>
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Action:</span>{' '}
                            {event.actionsTaken}
                          </div>
                        </div>
                      ))}
                    </div>
                    {activity.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowMoreActivity(!showMoreActivity)}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showMoreActivity
                          ? 'Show Less'
                          : `Show More (${activity.length - 5} more)`}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Section 3: Create Custom Rule - TODO */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The ability to create and edit custom workflow
                  rules will be added in a future update. For now, you can view existing
                  rules and their activity.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>

      {editingRule && (
        <EditWorkflowRuleModal
          open={!!editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => {
            setEditingRule(null);
            fetchData(); // Refresh the rules list
          }}
          rule={editingRule}
        />
      )}
    </div>
  );
}
