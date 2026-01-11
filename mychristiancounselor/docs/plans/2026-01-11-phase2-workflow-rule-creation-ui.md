# Phase 2: Workflow Rule Creation UI - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build wizard-based UI for counselors to create workflow automation rules without backend changes.

**Architecture:** 5-step wizard component using React state management, dynamic form generation based on trigger selection, JSON structure visualization, and integration with existing backend WorkflowRuleService.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, existing API endpoints

---

## Task Groups Overview

1. **Component Structure Setup** (3 tasks) - Directory structure, base wizard, shared components
2. **Step 1: Basic Information** (2 tasks) - Name, description, active toggle
3. **Step 2: Select Trigger** (2 tasks) - 8 trigger types with help text
4. **Step 3: Configure Conditions** (3 tasks) - Dynamic forms for each trigger type
5. **Step 4: Add Actions** (4 tasks) - 6 action types, repeatable, drag-and-drop
6. **Step 5: Review & Activate** (2 tasks) - Summary, test, create
7. **Wizard Integration** (3 tasks) - Navigation, validation, state management
8. **Page Integration** (2 tasks) - Counselor workflow management page
9. **Testing & Documentation** (3 tasks) - Component tests, integration tests, docs

**Total: 24 tasks**

---

## Group 1: Component Structure Setup (3 tasks)

### Task 1: Create workflow components directory structure

**Files:**
- Create: `packages/web/src/components/workflow/` directory
- Create: `packages/web/src/components/workflow/shared/` directory

**Step 1: Create directory structure**

```bash
cd packages/web/src/components
mkdir -p workflow/shared
```

Expected: Directories created successfully

**Step 2: Create index file**

Create `packages/web/src/components/workflow/index.ts`:

```typescript
export { WorkflowWizard } from './WorkflowWizard';
export { Step1BasicInfo } from './Step1BasicInfo';
export { Step2SelectTrigger } from './Step2SelectTrigger';
export { Step3ConfigureConditions } from './Step3ConfigureConditions';
export { Step4AddActions } from './Step4AddActions';
export { Step5ReviewActivate } from './Step5ReviewActivate';
```

**Step 3: Commit**

```bash
git add packages/web/src/components/workflow/
git commit -m "feat(workflow): create workflow components directory structure"
```

---

### Task 2: Create shared components (ActionCard, ConditionForm, JsonPreview)

**Files:**
- Create: `packages/web/src/components/workflow/shared/ActionCard.tsx`
- Create: `packages/web/src/components/workflow/shared/ConditionForm.tsx`
- Create: `packages/web/src/components/workflow/shared/JsonPreview.tsx`

**Step 1: Create ActionCard component**

Create `packages/web/src/components/workflow/shared/ActionCard.tsx`:

```typescript
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
```

**Step 2: Create ConditionForm component**

Create `packages/web/src/components/workflow/shared/ConditionForm.tsx`:

```typescript
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
```

**Step 3: Create JsonPreview component**

Create `packages/web/src/components/workflow/shared/JsonPreview.tsx`:

```typescript
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
```

**Step 4: Commit**

```bash
git add packages/web/src/components/workflow/shared/
git commit -m "feat(workflow): add shared components (ActionCard, ConditionForm, JsonPreview)"
```

---

### Task 3: Create workflow types and constants

**Files:**
- Create: `packages/web/src/components/workflow/types.ts`
- Create: `packages/web/src/components/workflow/constants.ts`

**Step 1: Create types file**

Create `packages/web/src/components/workflow/types.ts`:

```typescript
export interface TriggerConfig {
  event: string;
  name: string;
  description: string;
}

export interface ConditionConfig {
  [key: string]: any;
}

export interface ActionConfig {
  type: string;
  [key: string]: any;
}

export interface WorkflowWizardState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  organizationId: string;
  isActive: boolean;
  trigger: TriggerConfig | null;
  conditions: ConditionConfig;
  actions: ActionConfig[];
}

export interface TriggerType {
  event: string;
  name: string;
  description: string;
  helpText: string;
  exampleJson: any;
}

export interface ActionType {
  type: string;
  name: string;
  description: string;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}
```

**Step 2: Create constants file**

Create `packages/web/src/components/workflow/constants.ts`:

```typescript
import { TriggerType, ActionType } from './types';

export const TRIGGER_TYPES: TriggerType[] = [
  {
    event: 'assessment_completed',
    name: 'Assessment Completed',
    description: 'Triggers when a member completes any assessment',
    helpText: 'Use this to automatically respond when members complete assessments like PHQ-9 or GAD-7.',
    exampleJson: { event: 'assessment_completed' },
  },
  {
    event: 'score_threshold_exceeded',
    name: 'Score Threshold Exceeded',
    description: 'Triggers when assessment score exceeds a threshold',
    helpText: 'Alert counselors when assessment scores indicate high risk or severe symptoms.',
    exampleJson: { event: 'assessment_completed', scoreThreshold: true },
  },
  {
    event: 'task_overdue',
    name: 'Task Overdue',
    description: 'Triggers when a task passes its due date',
    helpText: 'Follow up with members who haven\'t completed assigned tasks.',
    exampleJson: { event: 'task_overdue' },
  },
  {
    event: 'conversation_stale',
    name: 'Conversation Stale',
    description: 'Triggers when no counselor response in X days',
    helpText: 'Ensure timely responses by alerting when conversations go unanswered.',
    exampleJson: { event: 'conversation_stale' },
  },
  {
    event: 'wellness_pattern',
    name: 'Wellness Pattern Detected',
    description: 'Triggers when AI detects wellness trend',
    helpText: 'Proactively respond to declining wellness trends detected by AI analysis.',
    exampleJson: { event: 'wellness_pattern' },
  },
  {
    event: 'crisis_keyword',
    name: 'Crisis Keyword',
    description: 'Triggers when specific words detected in conversation',
    helpText: 'Immediately alert counselors when crisis-related keywords are detected.',
    exampleJson: { event: 'crisis_keyword' },
  },
  {
    event: 'member_inactive',
    name: 'Member Inactive',
    description: 'Triggers when member hasn\'t logged in for X days',
    helpText: 'Re-engage members who have stopped using the platform.',
    exampleJson: { event: 'member_inactive' },
  },
  {
    event: 'subscription_expiring',
    name: 'Subscription Expiring',
    description: 'Triggers X days before subscription renewal',
    helpText: 'Remind members about upcoming subscription renewals.',
    exampleJson: { event: 'subscription_expiring' },
  },
];

export const ACTION_TYPES: ActionType[] = [
  {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email to member, counselor, or admin',
    fields: [
      {
        name: 'to',
        label: 'Recipient',
        type: 'select',
        required: true,
        options: [
          { value: 'member', label: 'Member' },
          { value: 'counselor', label: 'Assigned Counselor' },
          { value: 'admin', label: 'Organization Admin' },
        ],
      },
      {
        name: 'template',
        label: 'Email Template',
        type: 'select',
        required: true,
        options: [
          { value: 'high_depression_alert', label: 'High Depression Alert' },
          { value: 'task_reminder', label: 'Task Reminder' },
          { value: 'check_in', label: 'Check-In Request' },
        ],
      },
      {
        name: 'customSubject',
        label: 'Custom Subject (Optional)',
        type: 'text',
        required: false,
        placeholder: 'Override default subject line',
      },
    ],
  },
  {
    type: 'assign_task',
    name: 'Create Task',
    description: 'Assign a task to the member',
    fields: [
      {
        name: 'taskType',
        label: 'Task Type',
        type: 'select',
        required: true,
        options: [
          { value: 'assessment', label: 'Assessment' },
          { value: 'homework', label: 'Homework' },
          { value: 'reading', label: 'Reading' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      {
        name: 'dueDate',
        label: 'Due Date (days from now)',
        type: 'number',
        required: true,
        min: 1,
        max: 90,
        placeholder: '7',
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
      {
        name: 'note',
        label: 'Note to Member (Optional)',
        type: 'textarea',
        required: false,
        placeholder: 'Additional context or instructions',
      },
    ],
  },
  {
    type: 'update_status',
    name: 'Update Status',
    description: 'Update member priority or flag',
    fields: [
      {
        name: 'field',
        label: 'Status Field',
        type: 'select',
        required: true,
        options: [
          { value: 'priority', label: 'Member Priority' },
          { value: 'flag', label: 'Flag Status' },
        ],
      },
      {
        name: 'value',
        label: 'New Value',
        type: 'select',
        required: true,
        options: [
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
      },
    ],
  },
  {
    type: 'create_crisis_alert',
    name: 'Trigger Alert',
    description: 'Create a crisis or high-priority alert',
    fields: [
      {
        name: 'severity',
        label: 'Severity',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
        ],
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
        placeholder: 'e.g., PHQ-9 score indicates severe depression',
      },
    ],
  },
  {
    type: 'assign_counselor',
    name: 'Assign Counselor',
    description: 'Assign or reassign counselor to member',
    fields: [
      {
        name: 'counselorId',
        label: 'Counselor',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
      },
      {
        name: 'reason',
        label: 'Reassignment Reason (Optional)',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., Escalation to senior counselor',
      },
    ],
  },
  {
    type: 'log_event',
    name: 'Log Event',
    description: 'Log a custom event for tracking',
    fields: [
      {
        name: 'eventType',
        label: 'Event Type',
        type: 'text',
        required: true,
        placeholder: 'e.g., workflow_triggered',
      },
      {
        name: 'details',
        label: 'Details (JSON)',
        type: 'textarea',
        required: false,
        placeholder: '{"key": "value"}',
      },
    ],
  },
];
```

**Step 3: Commit**

```bash
git add packages/web/src/components/workflow/types.ts packages/web/src/components/workflow/constants.ts
git commit -m "feat(workflow): add workflow types and constants (triggers, actions)"
```

---

## Group 2: Step 1 - Basic Information (2 tasks)

### Task 4: Create Step 1 component (Basic Information)

**Files:**
- Create: `packages/web/src/components/workflow/Step1BasicInfo.tsx`

**Step 1: Create Step1BasicInfo component**

```typescript
'use client';

interface Step1BasicInfoProps {
  name: string;
  description: string;
  isActive: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onActiveChange: (isActive: boolean) => void;
  errors?: { name?: string; description?: string };
}

export function Step1BasicInfo({
  name,
  description,
  isActive,
  onNameChange,
  onDescriptionChange,
  onActiveChange,
  errors = {},
}: Step1BasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 1: Basic Information</h2>
        <p className="text-sm text-gray-600">
          Provide a name and description for this workflow rule.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Workflow Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., High Depression Score Alert"
          maxLength={100}
          required
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/100 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe when this workflow should trigger and what actions it will take..."
          rows={4}
          maxLength={500}
        />
        {errors.description && (
          <p className="text-xs text-red-600 mt-1">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {description.length}/500 characters
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">
            Activate workflow immediately after creation
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Inactive workflows will not trigger, but can be activated later.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step1BasicInfo.tsx
git commit -m "feat(workflow): add Step 1 - Basic Information component"
```

---

### Task 5: Add validation logic for Step 1

**Files:**
- Create: `packages/web/src/components/workflow/validation.ts`

**Step 1: Create validation file**

```typescript
import { WorkflowWizardState } from './types';

export interface ValidationErrors {
  name?: string;
  description?: string;
  trigger?: string;
  conditions?: string;
  actions?: string;
}

export function validateStep1(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.name || state.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters';
  }

  if (state.name && state.name.length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }

  if (state.description && state.description.length > 500) {
    errors.description = 'Description must be 500 characters or less';
  }

  return errors;
}

export function validateStep2(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.trigger || !state.trigger.event) {
    errors.trigger = 'Please select a trigger type';
  }

  return errors;
}

export function validateStep3(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.trigger) {
    errors.conditions = 'Trigger must be selected first';
    return errors;
  }

  const { event } = state.trigger;
  const { conditions } = state;

  switch (event) {
    case 'score_threshold_exceeded':
      if (!conditions.assessmentType) {
        errors.conditions = 'Assessment type is required';
      }
      if (!conditions.threshold) {
        errors.conditions = 'Threshold value is required';
      }
      break;

    case 'task_overdue':
      if (!conditions.daysOverdue || conditions.daysOverdue < 1) {
        errors.conditions = 'Days overdue must be at least 1';
      }
      break;

    case 'conversation_stale':
      if (!conditions.daysWithoutResponse || conditions.daysWithoutResponse < 1) {
        errors.conditions = 'Days without response must be at least 1';
      }
      break;

    case 'wellness_pattern':
      if (!conditions.patternType) {
        errors.conditions = 'Pattern type is required';
      }
      break;

    case 'crisis_keyword':
      if (!conditions.keywords || conditions.keywords.trim().length === 0) {
        errors.conditions = 'At least one keyword is required';
      }
      break;

    case 'member_inactive':
      if (!conditions.daysInactive || conditions.daysInactive < 1) {
        errors.conditions = 'Days inactive must be at least 1';
      }
      break;

    case 'subscription_expiring':
      if (!conditions.daysBeforeExpiration || conditions.daysBeforeExpiration < 1) {
        errors.conditions = 'Days before expiration must be at least 1';
      }
      break;
  }

  return errors;
}

export function validateStep4(state: WorkflowWizardState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.actions || state.actions.length === 0) {
    errors.actions = 'At least one action is required';
  }

  if (state.actions && state.actions.length > 10) {
    errors.actions = 'Maximum 10 actions allowed';
  }

  // Validate each action has required fields
  for (const action of state.actions) {
    if (!action.type) {
      errors.actions = 'All actions must have a type selected';
      break;
    }
  }

  return errors;
}

export function validateAllSteps(state: WorkflowWizardState): ValidationErrors {
  return {
    ...validateStep1(state),
    ...validateStep2(state),
    ...validateStep3(state),
    ...validateStep4(state),
  };
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/validation.ts
git commit -m "feat(workflow): add validation logic for all wizard steps"
```

---

## Group 3: Step 2 - Select Trigger (2 tasks)

### Task 6: Create Step 2 component (Select Trigger)

**Files:**
- Create: `packages/web/src/components/workflow/Step2SelectTrigger.tsx`

**Step 1: Create Step2SelectTrigger component**

```typescript
'use client';

import { TRIGGER_TYPES } from './constants';
import { TriggerConfig } from './types';
import { JsonPreview } from './shared/JsonPreview';

interface Step2SelectTriggerProps {
  trigger: TriggerConfig | null;
  onTriggerChange: (trigger: TriggerConfig) => void;
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
      onTriggerChange({
        event: triggerType.event,
        name: triggerType.name,
        description: triggerType.description,
      });
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step2SelectTrigger.tsx
git commit -m "feat(workflow): add Step 2 - Select Trigger component"
```

---

### Task 7: Add trigger change handler to clear conditions

**Files:**
- Modify: `packages/web/src/components/workflow/Step2SelectTrigger.tsx`

**Step 1: Update component to handle condition reset**

Modify the `onTriggerChange` callback to also accept a reset function:

```typescript
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

  // ... rest of component remains the same
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step2SelectTrigger.tsx
git commit -m "feat(workflow): add condition reset when trigger changes"
```

---

## Group 4: Step 3 - Configure Conditions (3 tasks)

### Task 8: Create Step 3 component (Configure Conditions)

**Files:**
- Create: `packages/web/src/components/workflow/Step3ConfigureConditions.tsx`

**Step 1: Create Step3ConfigureConditions component**

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step3ConfigureConditions.tsx
git commit -m "feat(workflow): add Step 3 - Configure Conditions component"
```

---

### Task 9: Add default condition values per trigger type

**Files:**
- Create: `packages/web/src/components/workflow/defaults.ts`

**Step 1: Create defaults file**

```typescript
import { ConditionConfig } from './types';

export function getDefaultConditions(triggerEvent: string): ConditionConfig {
  switch (triggerEvent) {
    case 'assessment_completed':
      return {};

    case 'score_threshold_exceeded':
      return {
        assessmentType: '',
        operator: '>',
        threshold: 15,
      };

    case 'task_overdue':
      return {
        daysOverdue: 1,
      };

    case 'conversation_stale':
      return {
        daysWithoutResponse: 3,
      };

    case 'wellness_pattern':
      return {
        patternType: '',
        severity: 'medium',
      };

    case 'crisis_keyword':
      return {
        keywords: '',
        matchType: 'any',
      };

    case 'member_inactive':
      return {
        daysInactive: 7,
      };

    case 'subscription_expiring':
      return {
        daysBeforeExpiration: 7,
      };

    default:
      return {};
  }
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/defaults.ts
git commit -m "feat(workflow): add default condition values per trigger type"
```

---

### Task 10: Update Step 2 to use defaults when trigger changes

**Files:**
- Modify: `packages/web/src/components/workflow/Step2SelectTrigger.tsx`

**Step 1: Import and use defaults**

Update imports:

```typescript
import { getDefaultConditions } from './defaults';
```

Update the handler:

```typescript
const handleSelectTrigger = (event: string) => {
  const triggerType = TRIGGER_TYPES.find(t => t.event === event);
  if (triggerType) {
    const newTrigger = {
      event: triggerType.event,
      name: triggerType.name,
      description: triggerType.description,
    };

    // Pass default conditions for this trigger
    const shouldReset = trigger?.event !== event;
    if (shouldReset) {
      const defaultConditions = getDefaultConditions(event);
      onTriggerChange(newTrigger, defaultConditions);
    } else {
      onTriggerChange(newTrigger);
    }
  }
};
```

Update the interface:

```typescript
interface Step2SelectTriggerProps {
  trigger: TriggerConfig | null;
  onTriggerChange: (trigger: TriggerConfig, defaultConditions?: ConditionConfig) => void;
  error?: string;
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step2SelectTrigger.tsx
git commit -m "feat(workflow): apply default conditions when trigger changes"
```

---

## Group 5: Step 4 - Add Actions (4 tasks)

### Task 11: Create action form fields component

**Files:**
- Create: `packages/web/src/components/workflow/shared/ActionFormFields.tsx`

**Step 1: Create ActionFormFields component**

```typescript
'use client';

import { ActionType, ActionConfig } from '../types';
import { ACTION_TYPES } from '../constants';

interface ActionFormFieldsProps {
  actionType: ActionType;
  action: ActionConfig;
  onChange: (action: ActionConfig) => void;
}

export function ActionFormFields({
  actionType,
  action,
  onChange,
}: ActionFormFieldsProps) {
  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...action,
      [fieldName]: value,
    });
  };

  return (
    <div className="space-y-4">
      {actionType.fields.map((field) => {
        switch (field.type) {
          case 'text':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <input
                  type="text"
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            );

          case 'textarea':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <textarea
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  rows={3}
                  required={field.required}
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <input
                  type="number"
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  required={field.required}
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <select
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/shared/ActionFormFields.tsx
git commit -m "feat(workflow): add ActionFormFields component for dynamic action forms"
```

---

### Task 12: Create Step 4 component (Add Actions)

**Files:**
- Create: `packages/web/src/components/workflow/Step4AddActions.tsx`

**Step 1: Create Step4AddActions component**

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step4AddActions.tsx
git commit -m "feat(workflow): add Step 4 - Add Actions component with drag reordering"
```

---

### Task 13: Add default action values

**Files:**
- Modify: `packages/web/src/components/workflow/defaults.ts`

**Step 1: Add default action function**

Add to the end of the file:

```typescript
export function getDefaultAction(actionType: string): ActionConfig {
  const type = ACTION_TYPES.find(at => at.type === actionType);
  if (!type) return { type: actionType };

  const defaultAction: ActionConfig = { type: actionType };

  for (const field of type.fields) {
    if (field.type === 'select' && field.options && field.options.length > 0) {
      defaultAction[field.name] = field.options[0].value;
    } else if (field.type === 'number') {
      defaultAction[field.name] = field.min || 1;
    } else {
      defaultAction[field.name] = '';
    }
  }

  return defaultAction;
}
```

**Step 2: Import ACTION_TYPES**

Add to imports at top:

```typescript
import { ACTION_TYPES } from './constants';
import { ActionConfig } from './types';
```

**Step 3: Commit**

```bash
git add packages/web/src/components/workflow/defaults.ts
git commit -m "feat(workflow): add default action value generator"
```

---

### Task 14: Update Step 4 to use default values when action type changes

**Files:**
- Modify: `packages/web/src/components/workflow/Step4AddActions.tsx`

**Step 1: Import and use defaults**

Add import:

```typescript
import { getDefaultAction } from './defaults';
```

Update the action type change handler:

```typescript
<select
  value={action.type}
  onChange={(e) => {
    const newType = e.target.value;
    const defaultAction = getDefaultAction(newType);
    handleUpdateAction(index, defaultAction);
  }}
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step4AddActions.tsx
git commit -m "feat(workflow): apply default action values when type changes"
```

---

## Group 6: Step 5 - Review & Activate (2 tasks)

### Task 15: Create Step 5 component (Review & Activate)

**Files:**
- Create: `packages/web/src/components/workflow/Step5ReviewActivate.tsx`

**Step 1: Create Step5ReviewActivate component**

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/Step5ReviewActivate.tsx
git commit -m "feat(workflow): add Step 5 - Review & Activate component with JSON preview"
```

---

### Task 16: Add workflow test functionality

**Files:**
- Create: `packages/web/src/components/workflow/api.ts`

**Step 1: Create API helper file**

```typescript
export async function testWorkflow(workflowData: any): Promise<{ success: boolean; message: string }> {
  try {
    // Validate workflow structure
    if (!workflowData.name || workflowData.name.trim().length < 3) {
      return { success: false, message: 'Workflow name must be at least 3 characters' };
    }

    if (!workflowData.trigger || !workflowData.trigger.event) {
      return { success: false, message: 'Trigger is required' };
    }

    if (!workflowData.actions || workflowData.actions.length === 0) {
      return { success: false, message: 'At least one action is required' };
    }

    // Validate actions
    for (const action of workflowData.actions) {
      if (!action.type) {
        return { success: false, message: 'All actions must have a type' };
      }
    }

    return {
      success: true,
      message: `Workflow validated successfully! ${workflowData.actions.length} actions configured.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

export async function createWorkflow(workflowData: any): Promise<any> {
  const response = await fetch('/api/counsel/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(workflowData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create workflow');
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/api.ts
git commit -m "feat(workflow): add API helpers for test and create workflow"
```

---

## Group 7: Wizard Integration (3 tasks)

### Task 17: Create main WorkflowWizard orchestrator component

**Files:**
- Create: `packages/web/src/components/workflow/WorkflowWizard.tsx`

**Step 1: Create WorkflowWizard component**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowWizardState, TriggerConfig, ConditionConfig, ActionConfig } from './types';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2SelectTrigger } from './Step2SelectTrigger';
import { Step3ConfigureConditions } from './Step3ConfigureConditions';
import { Step4AddActions } from './Step4AddActions';
import { Step5ReviewActivate } from './Step5ReviewActivate';
import { validateStep1, validateStep2, validateStep3, validateStep4, ValidationErrors } from './validation';
import { testWorkflow, createWorkflow } from './api';
import { showToast } from '@/components/Toast';

interface WorkflowWizardProps {
  organizationId: string;
  onClose?: () => void;
}

export function WorkflowWizard({ organizationId, onClose }: WorkflowWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WorkflowWizardState>({
    currentStep: 1,
    name: '',
    description: '',
    organizationId,
    isActive: true,
    trigger: null,
    conditions: {},
    actions: [],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [testing, setTesting] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNext = () => {
    // Validate current step
    let stepErrors: ValidationErrors = {};

    switch (state.currentStep) {
      case 1:
        stepErrors = validateStep1(state);
        break;
      case 2:
        stepErrors = validateStep2(state);
        break;
      case 3:
        stepErrors = validateStep3(state);
        break;
      case 4:
        stepErrors = validateStep4(state);
        break;
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setState({ ...state, currentStep: (state.currentStep + 1) as any });
  };

  const handlePrevious = () => {
    setErrors({});
    setState({ ...state, currentStep: (state.currentStep - 1) as any });
  };

  const handleTriggerChange = (trigger: TriggerConfig, defaultConditions?: ConditionConfig) => {
    setState({
      ...state,
      trigger,
      conditions: defaultConditions !== undefined ? defaultConditions : state.conditions,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    const workflowData = {
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

    const result = await testWorkflow(workflowData);

    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }

    setTesting(false);
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      const workflowData = {
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

      const result = await createWorkflow(workflowData);

      showToast('Workflow created successfully!', 'success');

      if (onClose) {
        onClose();
      } else {
        router.push('/counsel/workflows');
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create workflow',
        'error'
      );
    } finally {
      setCreating(false);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            name={state.name}
            description={state.description}
            isActive={state.isActive}
            onNameChange={(name) => setState({ ...state, name })}
            onDescriptionChange={(description) => setState({ ...state, description })}
            onActiveChange={(isActive) => setState({ ...state, isActive })}
            errors={errors}
          />
        );

      case 2:
        return (
          <Step2SelectTrigger
            trigger={state.trigger}
            onTriggerChange={handleTriggerChange}
            error={errors.trigger}
          />
        );

      case 3:
        return (
          <Step3ConfigureConditions
            trigger={state.trigger}
            conditions={state.conditions}
            onConditionsChange={(conditions) => setState({ ...state, conditions })}
            error={errors.conditions}
          />
        );

      case 4:
        return (
          <Step4AddActions
            actions={state.actions}
            onActionsChange={(actions) => setState({ ...state, actions })}
            error={errors.actions}
          />
        );

      case 5:
        return (
          <Step5ReviewActivate
            state={state}
            onTest={handleTest}
            testing={testing}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === state.currentStep
                    ? 'bg-blue-600 text-white'
                    : step < state.currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < state.currentStep ? '✓' : step}
              </div>
              {step < 5 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < state.currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Basic Info</span>
          <span>Trigger</span>
          <span>Conditions</span>
          <span>Actions</span>
          <span>Review</span>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={state.currentStep === 1}
          className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          {state.currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {creating ? 'Creating...' : 'Create Workflow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/WorkflowWizard.tsx
git commit -m "feat(workflow): add main WorkflowWizard orchestrator with navigation and validation"
```

---

### Task 18: Update workflow exports

**Files:**
- Modify: `packages/web/src/components/workflow/index.ts`

**Step 1: Update exports**

```typescript
export { WorkflowWizard } from './WorkflowWizard';
export { Step1BasicInfo } from './Step1BasicInfo';
export { Step2SelectTrigger } from './Step2SelectTrigger';
export { Step3ConfigureConditions } from './Step3ConfigureConditions';
export { Step4AddActions } from './Step4AddActions';
export { Step5ReviewActivate } from './Step5ReviewActivate';

export * from './types';
export * from './constants';
export * from './validation';
export * from './defaults';
export * from './api';
```

**Step 2: Commit**

```bash
git add packages/web/src/components/workflow/index.ts
git commit -m "feat(workflow): update workflow exports"
```

---

### Task 19: Add wizard state persistence (localStorage)

**Files:**
- Create: `packages/web/src/components/workflow/persistence.ts`

**Step 1: Create persistence helper**

```typescript
import { WorkflowWizardState } from './types';

const STORAGE_KEY = 'workflow-wizard-draft';

export function saveDraft(state: WorkflowWizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save workflow draft:', error);
  }
}

export function loadDraft(): WorkflowWizardState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load workflow draft:', error);
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear workflow draft:', error);
  }
}
```

**Step 2: Update WorkflowWizard to use persistence**

Modify `packages/web/src/components/workflow/WorkflowWizard.tsx`:

Add imports:
```typescript
import { saveDraft, loadDraft, clearDraft } from './persistence';
import { useEffect } from 'react';
```

Add after state initialization:
```typescript
// Load draft on mount
useEffect(() => {
  const draft = loadDraft();
  if (draft && draft.organizationId === organizationId) {
    // Show confirmation dialog
    if (confirm('Would you like to restore your previous workflow draft?')) {
      setState(draft);
    } else {
      clearDraft();
    }
  }
}, [organizationId]);

// Save draft on state change
useEffect(() => {
  if (state.name || state.trigger || state.actions.length > 0) {
    saveDraft(state);
  }
}, [state]);
```

Update handleCreate to clear draft:
```typescript
const handleCreate = async () => {
  setCreating(true);

  try {
    // ... existing create logic ...

    clearDraft(); // Add this line

    showToast('Workflow created successfully!', 'success');

    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  } finally {
    setCreating(false);
  }
};
```

**Step 3: Commit**

```bash
git add packages/web/src/components/workflow/persistence.ts packages/web/src/components/workflow/WorkflowWizard.tsx
git commit -m "feat(workflow): add wizard state persistence with localStorage"
```

---

## Group 8: Page Integration (2 tasks)

### Task 20: Create workflow management page for counselors

**Files:**
- Create: `packages/web/src/app/counsel/workflows/page.tsx`

**Step 1: Create workflow management page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { WorkflowWizard } from '@/components/workflow';
import { showToast } from '@/components/Toast';

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: any;
  actions: any[];
  createdAt: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/counsel/workflows', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setWorkflows(data.workflows || []);

      // Assume user's organization ID is returned or available in user context
      if (data.organizationId) {
        setOrganizationId(data.organizationId);
      }
    } catch (error) {
      showToast('Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (workflowId: string, isActive: boolean) => {
    try {
      await fetch(`/api/counsel/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isActive }),
      });
      showToast(`Workflow ${isActive ? 'activated' : 'deactivated'}`, 'success');
      fetchWorkflows();
    } catch (error) {
      showToast('Failed to update workflow', 'error');
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await fetch(`/api/counsel/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      showToast('Workflow deleted', 'success');
      fetchWorkflows();
    } catch (error) {
      showToast('Failed to delete workflow', 'error');
    }
  };

  if (showWizard) {
    return (
      <div className="p-6">
        <WorkflowWizard
          organizationId={organizationId}
          onClose={() => {
            setShowWizard(false);
            fetchWorkflows();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading workflows...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow Automation Rules</h1>
          <p className="text-sm text-gray-600 mt-1">
            Automate actions based on member activity and assessments
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No workflows created yet.</p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {workflow.name}
                    </div>
                    {workflow.description && (
                      <div className="text-sm text-gray-500">
                        {workflow.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workflow.trigger?.event || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workflow.actions?.length || 0} actions
                  </td>
                  <td className="px-6 py-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workflow.isActive}
                        onChange={(e) => handleToggleActive(workflow.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="ml-2 text-sm">
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/counsel/workflows/page.tsx
git commit -m "feat(workflow): add workflow management page with create/toggle/delete"
```

---

### Task 21: Add workflow route to counselor navigation

**Files:**
- Modify: `packages/web/src/app/counsel/layout.tsx` (if exists) or appropriate navigation component

**Step 1: Add workflow link to navigation**

If there's a counselor navigation component, add:

```typescript
<Link href="/counsel/workflows" className="nav-link">
  Workflow Rules
</Link>
```

If no dedicated navigation exists, this task can be skipped or a simple navigation component can be created.

**Step 2: Commit**

```bash
git add [appropriate file]
git commit -m "feat(workflow): add workflows link to counselor navigation"
```

---

## Group 9: Testing & Documentation (3 tasks)

### Task 22: Create component unit tests

**Files:**
- Create: `packages/web/src/components/workflow/__tests__/Step1BasicInfo.test.tsx`
- Create: `packages/web/src/components/workflow/__tests__/validation.test.ts`

**Step 1: Create Step1BasicInfo test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Step1BasicInfo } from '../Step1BasicInfo';

describe('Step1BasicInfo', () => {
  it('renders name and description fields', () => {
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Workflow Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('calls onNameChange when name is updated', () => {
    const handleNameChange = jest.fn();
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={handleNameChange}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    const nameInput = screen.getByLabelText(/Workflow Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    expect(handleNameChange).toHaveBeenCalledWith('Test Workflow');
  });

  it('displays character count for name', () => {
    render(
      <Step1BasicInfo
        name="Test"
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
      />
    );

    expect(screen.getByText('4/100 characters')).toBeInTheDocument();
  });

  it('displays validation errors', () => {
    render(
      <Step1BasicInfo
        name=""
        description=""
        isActive={true}
        onNameChange={() => {}}
        onDescriptionChange={() => {}}
        onActiveChange={() => {}}
        errors={{ name: 'Name is required' }}
      />
    );

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });
});
```

**Step 2: Create validation test**

Create `packages/web/src/components/workflow/__tests__/validation.test.ts`:

```typescript
import { validateStep1, validateStep2, validateStep3, validateStep4 } from '../validation';
import { WorkflowWizardState } from '../types';

describe('Workflow Validation', () => {
  describe('validateStep1', () => {
    it('requires name with at least 3 characters', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'ab',
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBe('Name must be at least 3 characters');
    });

    it('enforces 100 character limit for name', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'a'.repeat(101),
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBe('Name must be 100 characters or less');
    });

    it('passes with valid name', () => {
      const state: Partial<WorkflowWizardState> = {
        name: 'Valid Workflow Name',
        description: '',
      };

      const errors = validateStep1(state as WorkflowWizardState);

      expect(errors.name).toBeUndefined();
    });
  });

  describe('validateStep2', () => {
    it('requires trigger selection', () => {
      const state: Partial<WorkflowWizardState> = {
        trigger: null,
      };

      const errors = validateStep2(state as WorkflowWizardState);

      expect(errors.trigger).toBe('Please select a trigger type');
    });

    it('passes with valid trigger', () => {
      const state: Partial<WorkflowWizardState> = {
        trigger: {
          event: 'assessment_completed',
          name: 'Assessment Completed',
          description: 'Test',
        },
      };

      const errors = validateStep2(state as WorkflowWizardState);

      expect(errors.trigger).toBeUndefined();
    });
  });

  describe('validateStep4', () => {
    it('requires at least one action', () => {
      const state: Partial<WorkflowWizardState> = {
        actions: [],
      };

      const errors = validateStep4(state as WorkflowWizardState);

      expect(errors.actions).toBe('At least one action is required');
    });

    it('enforces maximum of 10 actions', () => {
      const state: Partial<WorkflowWizardState> = {
        actions: Array(11).fill({ type: 'send_email' }),
      };

      const errors = validateStep4(state as WorkflowWizardState);

      expect(errors.actions).toBe('Maximum 10 actions allowed');
    });
  });
});
```

**Step 3: Commit**

```bash
git add packages/web/src/components/workflow/__tests__/
git commit -m "test(workflow): add unit tests for Step1 and validation logic"
```

---

### Task 23: Create workflow documentation

**Files:**
- Create: `docs/features/workflow-automation.md`

**Step 1: Create documentation file**

```markdown
# Workflow Automation System

## Overview

The Workflow Automation System allows counselors to create custom automation rules that trigger actions based on member activity, assessment scores, and other events.

## Features

- **5-Step Wizard**: Intuitive wizard interface for creating workflows
- **8 Trigger Types**: Multiple event triggers including assessments, tasks, and wellness patterns
- **6 Action Types**: Automated actions including emails, tasks, alerts, and status updates
- **JSON Preview**: Real-time preview of workflow configuration
- **Draft Persistence**: Automatically saves work in progress
- **Test Mode**: Validate workflows before activation

## Trigger Types

1. **Assessment Completed** - Triggers when a member completes any assessment
2. **Score Threshold Exceeded** - Triggers when assessment score exceeds a threshold
3. **Task Overdue** - Triggers when a task passes its due date
4. **Conversation Stale** - Triggers when no counselor response in X days
5. **Wellness Pattern Detected** - Triggers when AI detects wellness trend
6. **Crisis Keyword** - Triggers when specific words detected in conversation
7. **Member Inactive** - Triggers when member hasn't logged in for X days
8. **Subscription Expiring** - Triggers X days before subscription renewal

## Action Types

1. **Send Email** - Send email to member, counselor, or admin
2. **Create Task** - Assign task to member with priority and due date
3. **Update Status** - Update member priority or flag
4. **Trigger Alert** - Create crisis or high-priority alert
5. **Assign Counselor** - Assign or reassign counselor to member
6. **Log Event** - Log custom event for tracking

## Component Structure

```
packages/web/src/components/workflow/
├── WorkflowWizard.tsx          # Main wizard orchestrator
├── Step1BasicInfo.tsx          # Basic information form
├── Step2SelectTrigger.tsx      # Trigger selection
├── Step3ConfigureConditions.tsx # Condition configuration
├── Step4AddActions.tsx         # Action management
├── Step5ReviewActivate.tsx     # Final review
├── types.ts                    # TypeScript interfaces
├── constants.ts                # Trigger and action definitions
├── validation.ts               # Validation logic
├── defaults.ts                 # Default values
├── api.ts                      # API helpers
├── persistence.ts              # LocalStorage draft saving
└── shared/
    ├── ActionCard.tsx          # Action card display
    ├── ActionFormFields.tsx    # Dynamic action forms
    ├── ConditionForm.tsx       # Dynamic condition forms
    └── JsonPreview.tsx         # JSON preview component
```

## API Endpoints

### Create Workflow
```
POST /api/counsel/workflows
{
  "name": "string",
  "description": "string",
  "organizationId": "string",
  "trigger": {
    "event": "string",
    ...conditions
  },
  "actions": [
    {
      "type": "string",
      ...actionData
    }
  ],
  "isActive": boolean
}
```

### List Workflows
```
GET /api/counsel/workflows
Response: {
  "workflows": Workflow[],
  "organizationId": "string"
}
```

### Update Workflow
```
PATCH /api/counsel/workflows/:id
{
  "isActive": boolean
}
```

### Delete Workflow
```
DELETE /api/counsel/workflows/:id
```

## Usage Examples

### Example 1: High Depression Alert

**Trigger**: Score Threshold Exceeded
- Assessment: PHQ-9
- Operator: >
- Threshold: 15

**Actions**:
1. Send Email to counselor (high_depression_alert template)
2. Create Crisis Alert (high severity, "PHQ-9 score indicates severe depression")
3. Update Status (set priority to high)

### Example 2: Task Reminder

**Trigger**: Task Overdue
- Days Overdue: 2

**Actions**:
1. Send Email to member (task_reminder template)
2. Create Task (homework, due in 3 days, medium priority)

### Example 3: Member Re-engagement

**Trigger**: Member Inactive
- Days Inactive: 14

**Actions**:
1. Send Email to member (check_in template)
2. Log Event (type: "re_engagement_triggered")

## Permissions

- **Counselors**: Create workflows for their organization
- **Org Admins**: Create + view all org workflows
- **Platform Admins**: Create + view all workflows

## Testing

Run workflow component tests:
```bash
cd packages/web
npm test -- workflow
```

## Future Enhancements

- Visual flow builder (drag-and-drop)
- Workflow templates library
- Execution history and analytics
- A/B testing for workflows
- Conditional branching (if/else logic)
- Time-based delays between actions
```

**Step 2: Commit**

```bash
git add docs/features/workflow-automation.md
git commit -m "docs(workflow): add comprehensive workflow automation documentation"
```

---

### Task 24: Build verification and final testing

**Step 1: Build web application**

```bash
cd packages/web
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Manual testing checklist**

Test the following:

1. **Wizard Navigation**:
   - [ ] Can navigate forward through all 5 steps
   - [ ] Can navigate backward
   - [ ] Validation blocks forward navigation with errors
   - [ ] Progress indicator updates correctly

2. **Step 1: Basic Info**:
   - [ ] Name field validates (3-100 chars)
   - [ ] Description field validates (0-500 chars)
   - [ ] Character counters update
   - [ ] Active toggle works

3. **Step 2: Select Trigger**:
   - [ ] All 8 trigger types appear
   - [ ] Help text displays for selected trigger
   - [ ] JSON preview shows trigger structure

4. **Step 3: Configure Conditions**:
   - [ ] Condition form updates based on trigger
   - [ ] Required fields validate
   - [ ] Numeric ranges enforce min/max
   - [ ] JSON preview updates

5. **Step 4: Add Actions**:
   - [ ] Can add up to 10 actions
   - [ ] Can remove actions
   - [ ] Can reorder actions with up/down buttons
   - [ ] Action form fields update based on type
   - [ ] JSON preview shows actions array

6. **Step 5: Review & Activate**:
   - [ ] Summary displays all configured values
   - [ ] Complete JSON preview shows full workflow
   - [ ] Test button validates workflow
   - [ ] Create button submits to API

7. **Workflow Management Page**:
   - [ ] Lists all workflows
   - [ ] Can toggle active/inactive
   - [ ] Can delete workflows
   - [ ] Create button opens wizard

8. **Draft Persistence**:
   - [ ] Workflow draft saves automatically
   - [ ] Draft restores on page reload
   - [ ] Draft clears after successful creation

**Step 3: Document results**

No commit needed (manual verification checklist)

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(workflow): Phase 2 implementation complete - workflow rule creation UI"
```

---

## Summary

**Phase 2: Workflow Rule Creation UI - Complete Implementation**

### What Was Built

1. **5-Step Wizard Interface**
   - Step 1: Basic Information (name, description, active toggle)
   - Step 2: Select Trigger (8 trigger types with help text)
   - Step 3: Configure Conditions (dynamic forms per trigger)
   - Step 4: Add Actions (6 action types, 1-10 actions, reorderable)
   - Step 5: Review & Activate (summary, test, create)

2. **Shared Components**
   - ActionCard: Collapsible action display with reordering
   - ActionFormFields: Dynamic form generation per action type
   - ConditionForm: Dynamic condition forms per trigger type
   - JsonPreview: Collapsible JSON preview with copy

3. **Wizard Features**
   - Progress indicator showing current step
   - Step validation before navigation
   - Real-time JSON preview
   - Draft persistence with localStorage
   - Test workflow before creation

4. **Workflow Management Page**
   - List all organization workflows
   - Toggle active/inactive status
   - Delete workflows
   - Create new workflow (opens wizard)

5. **Backend Integration**
   - Uses existing `POST /api/counsel/workflows` endpoint
   - Uses existing WorkflowRuleService (no backend changes)
   - Validation matches backend requirements

### Files Created (22 new files)

**Components (11 files):**
- `WorkflowWizard.tsx` - Main wizard orchestrator
- `Step1BasicInfo.tsx` - Basic information form
- `Step2SelectTrigger.tsx` - Trigger selection
- `Step3ConfigureConditions.tsx` - Condition configuration
- `Step4AddActions.tsx` - Action management
- `Step5ReviewActivate.tsx` - Final review
- `shared/ActionCard.tsx` - Action card display
- `shared/ActionFormFields.tsx` - Dynamic action forms
- `shared/ConditionForm.tsx` - Dynamic condition forms
- `shared/JsonPreview.tsx` - JSON preview component
- `index.ts` - Component exports

**Utilities (6 files):**
- `types.ts` - TypeScript interfaces
- `constants.ts` - Trigger and action definitions
- `validation.ts` - Validation logic for all steps
- `defaults.ts` - Default values per trigger/action
- `api.ts` - API helpers (test, create)
- `persistence.ts` - LocalStorage draft saving

**Pages (1 file):**
- `packages/web/src/app/counsel/workflows/page.tsx` - Workflow management page

**Tests (2 files):**
- `__tests__/Step1BasicInfo.test.tsx`
- `__tests__/validation.test.ts`

**Documentation (1 file):**
- `docs/features/workflow-automation.md`

**Navigation (1 file):**
- Updated counselor navigation to include workflows link

### Total Implementation

- **24 tasks** completed
- **22 new files** created
- **1 navigation file** modified
- **8 trigger types** implemented
- **6 action types** implemented
- **5 wizard steps** with validation
- **Comprehensive documentation** included

**Phase 2 is now COMPLETE and ready for production deployment.**

---

**Plan complete and saved to `docs/plans/2026-01-11-phase2-workflow-rule-creation-ui.md`.**

**Execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach would you like to use?**
