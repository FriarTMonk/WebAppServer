# Phase 3 UI Implementation Plan: Member Tasks, Assessments & Workflow Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans OR superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build complete UI for Phase 3 backend features - member tasks, assessments, and workflow automation.

**Architecture:** Modal-based interactions within existing dashboards. Counselors manage/assign, members complete, AI auto-detects completion.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, REST API integration

---

## Implementation Strategy

**Development Order:**
1. API Types & Helpers (foundation)
2. Shared Components (reusable UI)
3. Counselor Modals (6 modals)
4. Counselor Dashboard Integration
5. Member Components
6. Member Dashboard Integration

**Testing:** Manual testing after each task with local dev server running

**Commits:** Frequent commits after each task completion

---

## Task 1: API Types & Helper Functions

**Files:**
- Modify: `packages/web/src/lib/api.ts`

**Step 1: Add TypeScript type definitions**

Add these types at the end of `packages/web/src/lib/api.ts` (after line 272):

```typescript
// Task & Assessment Types
export type TaskType = 'conversation_prompt' | 'offline_task' | 'guided_conversation';
export type TaskStatus = 'pending' | 'completed' | 'overdue';
export type AssessmentType = 'phq9' | 'gad7';
export type AssessmentStatus = 'pending' | 'completed';
export type WorkflowRuleLevel = 'platform' | 'organization' | 'counselor';

export interface MemberTask {
  id: string;
  memberId: string;
  type: TaskType;
  title: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  assignedById: string;
  assignedAt: string;
  completedAt?: string;
  completionMethod?: 'manual' | 'auto';
  counselorNotes?: string;
}

export interface TaskTemplate {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  category: string;
}

export interface AssessedAssessment {
  id: string;
  memberId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  assignedAt: string;
  completedAt?: string;
  dueDate?: string;
  score?: number;
  severity?: string;
  noteToMember?: string;
}

export interface WorkflowRule {
  id: string;
  level: WorkflowRuleLevel;
  name: string;
  description: string;
  trigger: string;
  conditions: any;
  actions: any;
  enabled: boolean;
  lastTriggered?: string;
  createdById?: string;
}

export interface WorkflowRuleActivity {
  id: string;
  ruleId: string;
  ruleName: string;
  memberId: string;
  triggeredAt: string;
  triggerReason: string;
  actionsTaken: string;
}

export interface MemberWellbeingHistoryItem {
  id: string;
  status: string;
  recordedAt: string;
  notes?: string;
  overriddenBy?: string;
}

export interface AssessmentHistoryItem {
  id: string;
  type: AssessmentType;
  score: number;
  severity: string;
  completedAt: string;
}
```

**Step 2: Add API helper functions**

Add these helper functions after the type definitions:

```typescript
// Task API
export const taskApi = {
  getTemplates: () => apiGet('/counsel/tasks/templates'),

  create: (data: {
    memberId: string;
    type: TaskType;
    title: string;
    description: string;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
    counselorNotes?: string;
  }) => apiPost('/counsel/tasks', data),

  getMemberTasks: (memberId: string) =>
    apiGet(`/counsel/tasks/member/${memberId}`),

  update: (taskId: string, data: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    counselorNotes?: string;
  }) => apiPatch(`/counsel/tasks/${taskId}`, data),

  delete: (taskId: string) => apiDelete(`/counsel/tasks/${taskId}`),

  sendReminder: (taskId: string) =>
    apiPost(`/counsel/tasks/${taskId}/remind`),

  // Member endpoints
  getMyTasks: () => apiGet('/counsel/tasks/my-tasks'),

  complete: (taskId: string) =>
    apiPost(`/counsel/tasks/${taskId}/complete`),
};

// Assessment API
export const assessmentApi = {
  assign: (data: {
    memberId: string;
    type: AssessmentType;
    dueDate?: string;
    noteToMember?: string;
  }) => apiPost('/counsel/assessments/assign', data),

  getMemberAssessments: (memberId: string) =>
    apiGet(`/counsel/assessments/member/${memberId}`),

  getAssessmentHistory: (memberId: string, type: AssessmentType) =>
    apiGet(`/counsel/assessments/member/${memberId}/history?type=${type}`),

  // Member endpoints
  getMyAssessments: () => apiGet('/counsel/assessments/my-assessments'),

  submit: (assessmentId: string, responses: any) =>
    apiPost(`/counsel/assessments/${assessmentId}/submit`, { responses }),
};

// Workflow Rules API
export const workflowRulesApi = {
  list: () => apiGet('/counsel/workflow-rules'),

  getMemberRules: (memberId: string) =>
    apiGet(`/counsel/workflow-rules/member/${memberId}`),

  getActivity: (memberId: string) =>
    apiGet(`/counsel/workflow-rules/member/${memberId}/activity`),

  create: (data: {
    name: string;
    description: string;
    trigger: string;
    conditions: any;
    actions: any;
    applyTo: 'member' | 'all' | 'organization';
    targetId?: string;
  }) => apiPost('/counsel/workflow-rules', data),

  update: (ruleId: string, data: { enabled?: boolean }) =>
    apiPatch(`/counsel/workflow-rules/${ruleId}`, data),

  delete: (ruleId: string) =>
    apiDelete(`/counsel/workflow-rules/${ruleId}`),
};

// Member History API
export const memberHistoryApi = {
  getWellbeingHistory: (memberId: string, days: number = 90) =>
    apiGet(`/counsel/members/${memberId}/history?days=${days}`),

  getAssessmentHistory: (memberId: string) =>
    apiGet(`/counsel/members/${memberId}/assessment-history`),

  getEventTimeline: (memberId: string) =>
    apiGet(`/counsel/members/${memberId}/events`),
};
```

**Step 3: Test API types**

Manual test: Check TypeScript compilation

```bash
cd packages/web
npm run type-check
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): add Phase 3 API types and helper functions

Add TypeScript types for:
- Member tasks (TaskType, TaskStatus, MemberTask, TaskTemplate)
- Assessments (AssessmentType, AssessedAssessment)
- Workflow rules (WorkflowRule, WorkflowRuleActivity)
- Member history (wellbeing, assessments, events)

Add API helper functions:
- taskApi (CRUD, templates, reminders, member completion)
- assessmentApi (assign, history, member submission)
- workflowRulesApi (CRUD, member rules, activity)
- memberHistoryApi (wellbeing, assessments, events)

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: TaskCard Shared Component

**Files:**
- Create: `packages/web/src/components/shared/TaskCard.tsx`

**Step 1: Create TaskCard component**

Create `packages/web/src/components/shared/TaskCard.tsx`:

```typescript
'use client';

import { MemberTask } from '@/lib/api';

interface TaskCardProps {
  task: MemberTask;
  showActions?: boolean;
  onEdit?: (task: MemberTask) => void;
  onDelete?: (task: MemberTask) => void;
  onRemind?: (task: MemberTask) => void;
  onComplete?: (task: MemberTask) => void;
  onStartConversation?: (task: MemberTask) => void;
}

export function TaskCard({
  task,
  showActions = false,
  onEdit,
  onDelete,
  onRemind,
  onComplete,
  onStartConversation,
}: TaskCardProps) {
  const getTypeBadge = (type: string) => {
    const badges = {
      conversation_prompt: 'bg-blue-100 text-blue-800',
      offline_task: 'bg-purple-100 text-purple-800',
      guided_conversation: 'bg-green-100 text-green-800',
    };
    const labels = {
      conversation_prompt: 'Conversation Topic',
      offline_task: 'Offline Task',
      guided_conversation: 'Guided Conversation',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[type as keyof typeof badges]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-500';
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = task.status === 'overdue';
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isOverdue
          ? 'border-red-300 bg-red-50'
          : isCompleted
          ? 'border-gray-200 bg-gray-50'
          : 'border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{task.title}</h4>
            {getTypeBadge(task.type)}
          </div>
          <p className="text-sm text-gray-600">{task.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
        <span className={getPriorityColor(task.priority)}>
          Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        {task.dueDate && (
          <span>
            Due: {formatDate(task.dueDate)}
          </span>
        )}
        <span>
          Assigned: {formatDate(task.assignedAt)}
        </span>
        {isCompleted && task.completedAt && (
          <span className="text-green-600">
            Completed: {formatDate(task.completedAt)}
            {task.completionMethod && ` (${task.completionMethod})`}
          </span>
        )}
      </div>

      {task.counselorNotes && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-700">
          <span className="font-medium">Counselor notes:</span> {task.counselorNotes}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 mt-4">
          {!isCompleted && task.type === 'offline_task' && onComplete && (
            <button
              onClick={() => onComplete(task)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Mark Complete
            </button>
          )}
          {!isCompleted &&
            (task.type === 'conversation_prompt' || task.type === 'guided_conversation') &&
            onStartConversation && (
              <button
                onClick={() => onStartConversation(task)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Start Conversation
              </button>
            )}
          {!isCompleted && onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Edit
            </button>
          )}
          {!isCompleted && onRemind && (
            <button
              onClick={() => onRemind(task)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Send Reminder
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task)}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test component rendering**

Manual test:
1. Server should still be running from earlier
2. Check TypeScript compilation: `cd packages/web && npm run type-check`
3. Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/shared/TaskCard.tsx
git commit -m "feat(web): add TaskCard shared component

Reusable task display card with:
- Type badges (conversation/offline/guided)
- Priority indicators
- Status handling (pending/overdue/completed)
- Conditional actions (complete, edit, delete, remind)
- Completion method display (auto/manual)
- Counselor notes display

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: AssessmentCard Shared Component

**Files:**
- Create: `packages/web/src/components/shared/AssessmentCard.tsx`

**Step 1: Create AssessmentCard component**

Create `packages/web/src/components/shared/AssessmentCard.tsx`:

```typescript
'use client';

import { AssessedAssessment } from '@/lib/api';

interface AssessmentCardProps {
  assessment: AssessedAssessment;
  showActions?: boolean;
  onTakeAssessment?: (assessment: AssessedAssessment) => void;
  onViewHistory?: (assessment: AssessedAssessment) => void;
}

export function AssessmentCard({
  assessment,
  showActions = false,
  onTakeAssessment,
  onViewHistory,
}: AssessmentCardProps) {
  const getAssessmentName = (type: string) => {
    return type === 'phq9' ? 'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Completed</span>;
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;

    const colors: Record<string, string> = {
      minimal: 'bg-green-100 text-green-800',
      mild: 'bg-yellow-100 text-yellow-800',
      moderate: 'bg-orange-100 text-orange-800',
      'moderately severe': 'bg-red-100 text-red-800',
      severe: 'bg-red-200 text-red-900',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severity.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {severity}
      </span>
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">
            {getAssessmentName(assessment.type)}
          </h4>
          <div className="flex items-center gap-2">
            {getStatusBadge(assessment.status)}
            {assessment.score !== undefined && (
              <span className="text-sm font-medium text-gray-700">
                Score: {assessment.score}
              </span>
            )}
            {assessment.severity && getSeverityBadge(assessment.severity)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        <span>Assigned: {formatDate(assessment.assignedAt)}</span>
        {assessment.dueDate && <span>Due: {formatDate(assessment.dueDate)}</span>}
        {assessment.completedAt && (
          <span className="text-green-600">
            Completed: {formatDate(assessment.completedAt)}
          </span>
        )}
      </div>

      {assessment.noteToMember && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
          <span className="font-medium">Note:</span> {assessment.noteToMember}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 mt-4">
          {assessment.status === 'pending' && onTakeAssessment && (
            <button
              onClick={() => onTakeAssessment(assessment)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Take Assessment
            </button>
          )}
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(assessment)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              View History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test component**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/shared/AssessmentCard.tsx
git commit -m "feat(web): add AssessmentCard shared component

Reusable assessment display card with:
- Type display (PHQ-9/GAD-7)
- Status badges (pending/completed)
- Score and severity display
- Due date tracking
- Note to member display
- Conditional actions (take assessment, view history)

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Status Column Badges Component

**Files:**
- Create: `packages/web/src/components/StatusColumnBadges.tsx`

**Step 1: Create StatusColumnBadges component**

Create `packages/web/src/components/StatusColumnBadges.tsx`:

```typescript
'use client';

interface StatusColumnBadgesProps {
  pendingTasks: number;
  overdueTasks: number;
  pendingAssessments: number;
  onTasksClick: () => void;
  onAssessmentsClick: () => void;
}

export function StatusColumnBadges({
  pendingTasks,
  overdueTasks,
  pendingAssessments,
  onTasksClick,
  onAssessmentsClick,
}: StatusColumnBadgesProps) {
  const totalTasks = pendingTasks + overdueTasks;

  if (totalTasks === 0 && pendingAssessments === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {totalTasks > 0 && (
        <button
          onClick={onTasksClick}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            overdueTasks > 0
              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          }`}
          title={overdueTasks > 0 ? `${pendingTasks} pending, ${overdueTasks} overdue` : `${totalTasks} pending`}
        >
          {totalTasks} Task{totalTasks !== 1 ? 's' : ''}
        </button>
      )}
      {pendingAssessments > 0 && (
        <button
          onClick={onAssessmentsClick}
          className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
          title={`${pendingAssessments} pending assessment${pendingAssessments !== 1 ? 's' : ''}`}
        >
          {pendingAssessments} Assessment{pendingAssessments !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Test component**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/StatusColumnBadges.tsx
git commit -m "feat(web): add StatusColumnBadges component

Badge indicators for counselor dashboard status column:
- Task badge (blue for pending, orange for overdue)
- Assessment badge (yellow)
- Clickable to open respective modals
- Shows count and hover tooltip
- Conditional rendering (hidden if no tasks/assessments)

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Assign Task Modal (Part 1 - Step 1: Type Selection)

**Files:**
- Create: `packages/web/src/components/AssignTaskModal.tsx`

**Step 1: Create modal component with Step 1 (type selection)**

Create `packages/web/src/components/AssignTaskModal.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { TaskType } from '@/lib/api';

interface AssignTaskModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select_type' | 'configure';

export default function AssignTaskModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: AssignTaskModalProps) {
  const [step, setStep] = useState<Step>('select_type');
  const [selectedType, setSelectedType] = useState<TaskType | null>(null);

  const taskTypes = [
    {
      type: 'conversation_prompt' as TaskType,
      name: 'Conversation Prompt',
      icon: '💬',
      description: 'Topics for member to discuss with AI counselor',
      examples: 'Coping strategies, Gratitude practice',
    },
    {
      type: 'offline_task' as TaskType,
      name: 'Offline Task',
      icon: '✓',
      description: 'Activities for member to complete outside conversations',
      examples: 'Journal daily, Practice breathing exercises',
    },
    {
      type: 'guided_conversation' as TaskType,
      name: 'Guided Conversation',
      icon: '🗺️',
      description: 'Structured conversation flow with specific prompts',
      examples: 'CBT thought challenge, Goal setting session',
    },
  ];

  const handleTypeSelect = (type: TaskType) => {
    setSelectedType(type);
    setStep('configure');
  };

  if (step === 'configure') {
    // Step 2 will be implemented in next task
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Assign Task - Step 2</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure task for {memberName}
            </p>
          </div>
          <div className="px-6 py-4">
            <p>Step 2 configuration (to be implemented)</p>
            <p>Selected type: {selectedType}</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
            <button
              onClick={() => setStep('select_type')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Assign Task - Step 1</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select task type for {memberName}
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taskTypes.map((taskType) => (
              <button
                key={taskType.type}
                onClick={() => handleTypeSelect(taskType.type)}
                className="flex flex-col items-start p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-4xl mb-3">{taskType.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {taskType.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{taskType.description}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Examples:</span> {taskType.examples}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test modal rendering**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/AssignTaskModal.tsx
git commit -m "feat(web): add AssignTaskModal Step 1 (type selection)

Two-step modal for task assignment:
- Step 1: Three large cards for type selection
  - Conversation Prompt
  - Offline Task
  - Guided Conversation
- Each card shows icon, description, examples
- Hover states for interactivity
- Step 2 placeholder (to be implemented)

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Assign Task Modal (Part 2 - Step 2: Configuration & Submission)

**Files:**
- Modify: `packages/web/src/components/AssignTaskModal.tsx`

**Step 1: Add template fetching and Step 2 implementation**

Replace the `configure` step section in `AssignTaskModal.tsx` with the complete implementation:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TaskType, TaskTemplate, taskApi } from '@/lib/api';

interface AssignTaskModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select_type' | 'configure';

export default function AssignTaskModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: AssignTaskModalProps) {
  const [step, setStep] = useState<Step>('select_type');
  const [selectedType, setSelectedType] = useState<TaskType | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [counselorNotes, setCounselorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch templates when type is selected
  useEffect(() => {
    if (selectedType && step === 'configure') {
      const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
          const response = await taskApi.getTemplates();
          if (response.ok) {
            const data = await response.json();
            // Filter templates by selected type
            const filtered = data.filter((t: TaskTemplate) => t.type === selectedType);
            setTemplates(filtered);
          }
        } catch (err) {
          console.error('Error loading templates:', err);
        } finally {
          setLoadingTemplates(false);
        }
      };
      fetchTemplates();
    }
  }, [selectedType, step]);

  // Update title/description when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      if (selectedTemplate === 'custom') {
        setTitle('');
        setDescription('');
      } else {
        const template = templates.find((t) => t.id === selectedTemplate);
        if (template) {
          setTitle(template.title);
          setDescription(template.description);
        }
      }
    }
  }, [selectedTemplate, templates]);

  const taskTypes = [
    {
      type: 'conversation_prompt' as TaskType,
      name: 'Conversation Prompt',
      icon: '💬',
      description: 'Topics for member to discuss with AI counselor',
      examples: 'Coping strategies, Gratitude practice',
    },
    {
      type: 'offline_task' as TaskType,
      name: 'Offline Task',
      icon: '✓',
      description: 'Activities for member to complete outside conversations',
      examples: 'Journal daily, Practice breathing exercises',
    },
    {
      type: 'guided_conversation' as TaskType,
      name: 'Guided Conversation',
      icon: '🗺️',
      description: 'Structured conversation flow with specific prompts',
      examples: 'CBT thought challenge, Goal setting session',
    },
  ];

  const handleTypeSelect = (type: TaskType) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await taskApi.create({
        memberId,
        type: selectedType!,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || undefined,
        priority,
        counselorNotes: counselorNotes.trim() || undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to assign task');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'configure') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Assign Task - Step 2</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure task for {memberName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4">
            {loadingTemplates ? (
              <div className="text-center text-gray-500 py-4">Loading templates...</div>
            ) : (
              <>
                {/* Template Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                    <option value="custom">Create custom task</option>
                  </select>
                  {selectedTemplate && selectedTemplate !== 'custom' && (
                    <p className="text-xs text-gray-500 mt-1">
                      {templates.find((t) => t.id === selectedTemplate)?.description}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description"
                    required
                  />
                </div>

                {/* Due Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Priority */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <div className="flex gap-4">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <label key={p} className="flex items-center">
                        <input
                          type="radio"
                          value={p}
                          checked={priority === p}
                          onChange={(e) => setPriority(e.target.value as any)}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Counselor Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Counselor Notes (Optional)
                  </label>
                  <textarea
                    value={counselorNotes}
                    onChange={(e) => setCounselorNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Private notes (not visible to member)"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </>
            )}
          </form>

          <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
            <button
              onClick={() => setStep('select_type')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              disabled={submitting}
            >
              Back
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingTemplates}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Assign Task - Step 1</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select task type for {memberName}
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taskTypes.map((taskType) => (
              <button
                key={taskType.type}
                onClick={() => handleTypeSelect(taskType.type)}
                className="flex flex-col items-start p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="text-4xl mb-3">{taskType.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {taskType.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{taskType.description}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Examples:</span> {taskType.examples}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test modal functionality**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/AssignTaskModal.tsx
git commit -m "feat(web): complete AssignTaskModal with Step 2 configuration

Step 2 features:
- Template selector (fetches from API, filters by type)
- Auto-fill title/description from template
- Custom task option
- Form fields: title, description, due date, priority, notes
- Validation (required fields)
- API integration (taskApi.create)
- Error handling and loading states
- Back button to return to type selection

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: View Tasks Modal

**Files:**
- Create: `packages/web/src/components/ViewTasksModal.tsx`

**Step 1: Create ViewTasksModal component**

Create `packages/web/src/components/ViewTasksModal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { MemberTask, taskApi } from '@/lib/api';
import { TaskCard } from './shared/TaskCard';

interface ViewTasksModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ViewTasksModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: ViewTasksModalProps) {
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [memberId]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskApi.getMemberTasks(memberId);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        throw new Error('Failed to load tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (task: MemberTask) => {
    // TODO: Open edit modal (simplified for now - just show alert)
    const newTitle = prompt('Edit title:', task.title);
    if (newTitle && newTitle !== task.title) {
      setActionInProgress(task.id);
      try {
        const response = await taskApi.update(task.id, { title: newTitle });
        if (response.ok) {
          await fetchTasks();
          onSuccess();
        }
      } catch (err) {
        alert('Failed to update task');
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleDelete = async (task: MemberTask) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;

    setActionInProgress(task.id);
    try {
      const response = await taskApi.delete(task.id);
      if (response.ok) {
        await fetchTasks();
        onSuccess();
      }
    } catch (err) {
      alert('Failed to delete task');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemind = async (task: MemberTask) => {
    setActionInProgress(task.id);
    try {
      const response = await taskApi.sendReminder(task.id);
      if (response.ok) {
        alert('Reminder sent successfully');
      }
    } catch (err) {
      alert('Failed to send reminder');
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Tasks for {memberName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage assigned tasks
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading tasks...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No tasks assigned yet
            </div>
          ) : (
            <>
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-3">
                    Overdue ({overdueTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showActions={true}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onRemind={() => handleRemind(task)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Pending ({pendingTasks.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showActions={true}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onRemind={() => handleRemind(task)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 hover:text-gray-700"
                  >
                    Completed ({completedTasks.length})
                    <span className="text-sm">{showCompleted ? '▲' : '▼'}</span>
                  </button>
                  {showCompleted && (
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test component**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/ViewTasksModal.tsx
git commit -m "feat(web): add ViewTasksModal for counselor task management

Modal features:
- Fetches member tasks from API
- Groups by status (overdue, pending, completed)
- Collapsible completed section
- Task actions: edit, delete, send reminder
- Uses TaskCard component for consistent display
- Error handling and loading states
- Counselor cannot mark tasks complete (by design)

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Assign Assessment Modal

**Files:**
- Create: `packages/web/src/components/AssignAssessmentModal.tsx`

**Step 1: Create AssignAssessmentModal component**

Create `packages/web/src/components/AssignAssessmentModal.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { AssessmentType, assessmentApi } from '@/lib/api';

interface AssignAssessmentModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignAssessmentModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: AssignAssessmentModalProps) {
  const [selectedType, setSelectedType] = useState<AssessmentType>('phq9');
  const [dueDate, setDueDate] = useState('');
  const [noteToMember, setNoteToMember] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assessmentTypes = [
    {
      type: 'phq9' as AssessmentType,
      name: 'PHQ-9 (Depression Screening)',
      description: '9-item questionnaire measuring depression severity',
    },
    {
      type: 'gad7' as AssessmentType,
      name: 'GAD-7 (Anxiety Screening)',
      description: '7-item questionnaire measuring anxiety severity',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await assessmentApi.assign({
        memberId,
        type: selectedType,
        dueDate: dueDate || undefined,
        noteToMember: noteToMember.trim() || undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to assign assessment');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign assessment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Assign Assessment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Assign assessment to {memberName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Assessment Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Assessment Type *
            </label>
            <div className="space-y-3">
              {assessmentTypes.map((assessment) => (
                <label
                  key={assessment.type}
                  className={`flex items-start p-3 border-2 rounded cursor-pointer transition-colors ${
                    selectedType === assessment.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    value={assessment.type}
                    checked={selectedType === assessment.type}
                    onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{assessment.name}</div>
                    <div className="text-sm text-gray-600">{assessment.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Note to Member */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note to Member (Optional)
            </label>
            <textarea
              value={noteToMember}
              onChange={(e) => setNoteToMember(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Please complete before our next session"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Assigning...' : 'Assign Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test component**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/AssignAssessmentModal.tsx
git commit -m "feat(web): add AssignAssessmentModal for assessment assignment

Simple assessment assignment modal with:
- Radio button selection (PHQ-9/GAD-7)
- Assessment descriptions
- Optional due date picker
- Optional note to member
- API integration (assessmentApi.assign)
- Error handling and loading states

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: View Assessments Modal

**Files:**
- Create: `packages/web/src/components/ViewAssessmentsModal.tsx`

**Step 1: Create ViewAssessmentsModal component**

Create `packages/web/src/components/ViewAssessmentsModal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AssessedAssessment, AssessmentHistoryItem, AssessmentType, assessmentApi } from '@/lib/api';
import { AssessmentCard } from './shared/AssessmentCard';

interface ViewAssessmentsModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ViewAssessmentsModal({
  memberName,
  memberId,
  onClose,
  onSuccess,
}: ViewAssessmentsModalProps) {
  const [assessments, setAssessments] = useState<AssessedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, AssessmentHistoryItem[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAssessments();
  }, [memberId]);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await assessmentApi.getMemberAssessments(memberId);
      if (response.ok) {
        const data = await response.json();
        setAssessments(data);
      } else {
        throw new Error('Failed to load assessments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = async (assessmentId: string, type: AssessmentType) => {
    const isExpanded = expandedHistory[assessmentId];

    if (isExpanded) {
      setExpandedHistory((prev) => ({ ...prev, [assessmentId]: false }));
    } else {
      setExpandedHistory((prev) => ({ ...prev, [assessmentId]: true }));

      // Fetch history if not already loaded
      if (!historyData[assessmentId]) {
        setLoadingHistory((prev) => ({ ...prev, [assessmentId]: true }));
        try {
          const response = await assessmentApi.getAssessmentHistory(memberId, type);
          if (response.ok) {
            const data = await response.json();
            setHistoryData((prev) => ({ ...prev, [assessmentId]: data }));
          }
        } catch (err) {
          console.error('Failed to load assessment history:', err);
        } finally {
          setLoadingHistory((prev) => ({ ...prev, [assessmentId]: false }));
        }
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTrendArrow = (current: number, previous: number) => {
    if (current > previous) return '↑';
    if (current < previous) return '↓';
    return '→';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Assessments for {memberName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            View assessment history and scores
          </p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading assessments...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No assessments assigned yet
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                  <AssessmentCard assessment={assessment} showActions={false} />

                  {/* View History Button */}
                  {assessment.status === 'completed' && (
                    <button
                      onClick={() => toggleHistory(assessment.id, assessment.type)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {expandedHistory[assessment.id] ? 'Hide History ▲' : 'View History ▼'}
                    </button>
                  )}

                  {/* History Timeline */}
                  {expandedHistory[assessment.id] && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-300">
                      {loadingHistory[assessment.id] ? (
                        <div className="text-sm text-gray-500">Loading history...</div>
                      ) : historyData[assessment.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {historyData[assessment.id].slice(0, 5).map((item, index, array) => (
                            <div key={item.id} className="text-sm">
                              <span className="text-gray-600">{formatDate(item.completedAt)}</span>
                              <span className="mx-2">•</span>
                              <span className="font-medium">Score: {item.score}</span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-700">{item.severity}</span>
                              {index < array.length - 1 && (
                                <span className="ml-2 text-gray-400">
                                  {getTrendArrow(item.score, array[index + 1].score)}
                                </span>
                              )}
                            </div>
                          ))}
                          {historyData[assessment.id].length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              Showing 5 most recent. View Historical Trends for full history.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No previous assessments</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test component**

Manual test: Check TypeScript compilation

```bash
cd packages/web && npm run type-check
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/web/src/components/ViewAssessmentsModal.tsx
git commit -m "feat(web): add ViewAssessmentsModal for assessment history

Modal features:
- Fetches member assessments from API
- Uses AssessmentCard component for display
- Expandable history timeline
- Shows score trends with arrows (↑↓→)
- Lazy-loads history data on expand
- Limits to 5 most recent (links to Historical Trends for full)
- Error handling and loading states

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Remaining Tasks Summary

The implementation plan continues with:

**Task 10:** WorkflowRulesModal - Rule management interface
**Task 11:** HistoricalTrendsModal - Wellbeing/assessment trend charts
**Task 12:** DashboardSummaryWidgets - Three metric cards for counselor dashboard
**Task 13:** Integrate modals into CounselorDashboard - Wire up actions dropdown
**Task 14:** Add status column badges to CounselorDashboard
**Task 15:** MemberTasksCard & MyTasksModal - Member-facing task components
**Task 16:** MemberAssessmentsCard & MyAssessmentsModal - Member-facing assessment components
**Task 17:** Integrate member components into ConversationView
**Task 18:** End-to-end testing and refinement

**Next Step:** Continue with Task 10 or use superpowers:subagent-driven-development to execute remaining tasks in parallel.

