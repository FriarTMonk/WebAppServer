'use client';

interface ConditionFormProps {
  trigger: string;
  conditions: any;
  onChange: (conditions: any) => void;
}

export function ConditionForm({ trigger, conditions, onChange }: ConditionFormProps) {
  const renderConditionFields = () => {
    switch (trigger) {
      case 'assessment_completed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Type (Optional)
              </label>
              <select
                value={conditions.assessmentType || ''}
                onChange={(e) => onChange({ ...conditions, assessmentType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Any assessment</option>
                <option value="PHQ-9">PHQ-9 (Depression)</option>
                <option value="GAD-7">GAD-7 (Anxiety)</option>
                <option value="custom">Custom Assessment</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Score (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={conditions.minScore || ''}
                  onChange={(e) => onChange({ ...conditions, minScore: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Score (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={conditions.maxScore || ''}
                  onChange={(e) => onChange({ ...conditions, maxScore: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="100"
                />
              </div>
            </div>
          </div>
        );

      case 'score_threshold_exceeded':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Type *
              </label>
              <select
                value={conditions.assessmentType || ''}
                onChange={(e) => onChange({ ...conditions, assessmentType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select assessment...</option>
                <option value="PHQ-9">PHQ-9 (Depression)</option>
                <option value="GAD-7">GAD-7 (Anxiety)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator *
                </label>
                <select
                  value={conditions.operator || '>'}
                  onChange={(e) => onChange({ ...conditions, operator: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value=">">Greater than (&gt;)</option>
                  <option value=">=">Greater than or equal (≥)</option>
                  <option value="<">Less than (&lt;)</option>
                  <option value="<=">Less than or equal (≤)</option>
                  <option value="=">Equal to (=)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Value *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={conditions.threshold || ''}
                  onChange={(e) => onChange({ ...conditions, threshold: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., 15"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'task_overdue':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days Overdue *
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={conditions.daysOverdue || 1}
                onChange={(e) => onChange({ ...conditions, daysOverdue: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Trigger when task is overdue by this many days
              </p>
            </div>
          </div>
        );

      case 'conversation_stale':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Without Response *
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={conditions.daysWithoutResponse || 3}
              onChange={(e) => onChange({ ...conditions, daysWithoutResponse: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Trigger when counselor hasn't responded in this many days
            </p>
          </div>
        );

      case 'wellness_pattern':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern Type *
              </label>
              <select
                value={conditions.patternType || ''}
                onChange={(e) => onChange({ ...conditions, patternType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select pattern...</option>
                <option value="declining_mood">Declining Mood</option>
                <option value="poor_sleep">Poor Sleep</option>
                <option value="reduced_exercise">Reduced Exercise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity *
              </label>
              <select
                value={conditions.severity || 'medium'}
                onChange={(e) => onChange({ ...conditions, severity: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        );

      case 'crisis_keyword':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated) *
              </label>
              <textarea
                value={conditions.keywords || ''}
                onChange={(e) => onChange({ ...conditions, keywords: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="e.g., suicide, self-harm, hopeless"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Match Type *
              </label>
              <select
                value={conditions.matchType || 'any'}
                onChange={(e) => onChange({ ...conditions, matchType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="any">Any keyword (OR)</option>
                <option value="all">All keywords (AND)</option>
              </select>
            </div>
          </div>
        );

      case 'member_inactive':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Inactive *
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={conditions.daysInactive || 7}
              onChange={(e) => onChange({ ...conditions, daysInactive: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Trigger when member hasn't logged in for this many days
            </p>
          </div>
        );

      case 'subscription_expiring':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Before Expiration *
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={conditions.daysBeforeExpiration || 7}
              onChange={(e) => onChange({ ...conditions, daysBeforeExpiration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Trigger this many days before subscription renewal
            </p>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Select a trigger to configure conditions
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderConditionFields()}
    </div>
  );
}
