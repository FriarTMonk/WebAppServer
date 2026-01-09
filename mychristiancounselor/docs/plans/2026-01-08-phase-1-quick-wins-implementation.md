# Phase 1: Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 broken user flows with minimal code changes - subscription navigation, task editing, and workflow rules management

**Architecture:** Simple bug fixes and feature completion using existing infrastructure. No new architecture needed.

**Tech Stack:** NestJS, Next.js 14, TypeScript, Prisma, React, class-validator

---

## Task 1: Fix Subscription Button Navigation

**Files:**
- Modify: `packages/web/src/components/UserMenu.tsx:215-216`

**Estimated Time:** 2 minutes

### Step 1: Update subscription button handler

Replace the alert with navigation:

```typescript
// packages/web/src/components/UserMenu.tsx
// Find line 213-217 (the "Subscribe Now" button onClick)
// BEFORE:
onClick={() => {
  setShowSubscriptionModal(false);
  // TODO: Navigate to subscription page when it's ready
  alert('Subscription feature coming soon!');
}}

// AFTER:
onClick={() => {
  setShowSubscriptionModal(false);
  router.push('/settings/subscription');
}}
```

**Manual Testing:**
1. Run web app: `npx nx serve web`
2. Log in as any user
3. Open user menu (click avatar/name)
4. Click "Subscribe Now" button
5. **Expected**: Navigate to `/settings/subscription` page
6. **Verify**: No alert appears, page actually navigates

### Step 2: Commit fix

```bash
git add packages/web/src/components/UserMenu.tsx
git commit -m "fix(web): subscription button now navigates instead of showing alert

- Remove alert('Subscription feature coming soon!')
- Replace with router.push('/settings/subscription')
- Fixes broken user flow where button showed TODO alert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Task Update Endpoint (API)

**Files:**
- Create: `packages/api/src/counsel/dto/update-task.dto.ts`
- Modify: `packages/api/src/counsel/task.controller.ts` (add PATCH endpoint)
- Modify: `packages/api/src/counsel/member-task.service.ts` (add updateTask method)

**Estimated Time:** 20 minutes

### Step 1: Create UpdateTaskDto

Create new file `packages/api/src/counsel/dto/update-task.dto.ts`:

```typescript
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { MemberTaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MemberTaskStatus)
  status?: MemberTaskStatus;
}
```

### Step 2: Add updateTask method to MemberTaskService

In `packages/api/src/counsel/member-task.service.ts`, add this method (add it after the `markComplete` method):

```typescript
async updateTask(id: string, updates: UpdateTaskDto) {
  return this.prisma.memberTask.update({
    where: { id },
    data: {
      ...updates,
      ...(updates.dueDate && { dueDate: new Date(updates.dueDate) }),
      updatedAt: new Date(),
    },
  });
}
```

**Note:** If `UpdateTaskDto` type is not recognized, add the import at the top:
```typescript
import { UpdateTaskDto } from './dto/update-task.dto';
```

### Step 3: Add PATCH endpoint to TaskController

In `packages/api/src/counsel/task.controller.ts`, add this endpoint after the `completeTask` method (around line 149):

```typescript
/**
 * PATCH /counsel/tasks/:id
 * Update task details (member or counselor can update)
 */
@Patch(':id')
async updateTask(
  @Param('id') id: string,
  @Body() dto: UpdateTaskDto,
  @Request() req,
) {
  // Get task to verify ownership
  const task = await this.memberTaskService.getTaskById(id);

  // Check if user is member or counselor
  const isMember = task.memberId === req.user.id;
  const isCounselor = task.counselorId === req.user.id;

  if (!isMember && !isCounselor) {
    throw new ForbiddenException('Not authorized to edit this task');
  }

  return this.memberTaskService.updateTask(id, dto);
}
```

**Note:** Import UpdateTaskDto at the top of the file:
```typescript
import { UpdateTaskDto } from './dto/update-task.dto';
```

### Step 4: Test API endpoint manually

Run the API:
```bash
npx nx serve api
```

Test with curl (replace TOKEN and IDs):
```bash
# Get a task ID first (as member)
curl http://localhost:3697/counsel/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Try to update it
curl -X PATCH http://localhost:3697/counsel/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "description": "Updated description"}'
```

**Expected:** Returns updated task object with new title/description

### Step 5: Commit API changes

```bash
git add packages/api/src/counsel/dto/update-task.dto.ts
git add packages/api/src/counsel/task.controller.ts
git add packages/api/src/counsel/member-task.service.ts
git commit -m "feat(api): add PATCH /counsel/tasks/:id endpoint for task updates

- Create UpdateTaskDto with optional fields: title, description, dueDate, status
- Add updateTask method to MemberTaskService
- Add PATCH endpoint with authorization (member or counselor)
- Verify ownership before allowing updates

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create EditTaskModal Component (UI)

**Files:**
- Create: `packages/web/src/components/EditTaskModal.tsx`
- Modify: `packages/web/src/components/ViewTasksModal.tsx` (wire up modal)

**Estimated Time:** 30 minutes

### Step 1: Create EditTaskModal component

Create new file `packages/web/src/components/EditTaskModal.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { MemberTask, MemberTaskStatus } from '@/lib/api';
import { showToast } from './Toast';

interface EditTaskModalProps {
  task: MemberTask;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTaskModal({ task, isOpen, onClose, onSuccess }: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    status: task.status,
  });
  const [submitting, setSubmitting] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status,
    });
  }, [task]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${apiUrl}/counsel/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(error.message);
      }

      showToast('Task updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Edit Task</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MemberTaskStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 2: Wire EditTaskModal into ViewTasksModal

In `packages/web/src/components/ViewTasksModal.tsx`:

1. **Import EditTaskModal** (add at top):
```typescript
import EditTaskModal from './EditTaskModal';
```

2. **Add state for edit modal** (add after existing useState declarations):
```typescript
const [editingTask, setEditingTask] = useState<MemberTask | null>(null);
```

3. **Replace handleEdit function** (around line 63-85):
```typescript
// BEFORE:
const handleEdit = async (task: MemberTask) => {
  // TODO: Open edit modal (simplified for now - just show prompt)
  const newTitle = prompt('Edit title:', task.title);
  // ... rest of prompt logic ...
};

// AFTER:
const handleEdit = (task: MemberTask) => {
  setEditingTask(task);
};
```

4. **Add EditTaskModal to JSX** (add before the closing main `</div>` but inside the component return):
```typescript
{/* Add this right before the final </div> closing tag */}
{editingTask && (
  <EditTaskModal
    task={editingTask}
    isOpen={!!editingTask}
    onClose={() => setEditingTask(null)}
    onSuccess={() => {
      setEditingTask(null);
      fetchTasks();
    }}
  />
)}
```

### Step 3: Test the edit modal

1. Run web app: `npx nx serve web`
2. Log in as a member with tasks or counselor viewing member tasks
3. Open tasks modal
4. Click "Edit" button on any task
5. **Expected**: EditTaskModal appears with form pre-filled
6. **Test**: Change title, description, due date, status
7. Click "Save Changes"
8. **Expected**: Modal closes, task list refreshes, toast shows success
9. **Verify**: Changes are saved (click Edit again to confirm)

### Step 4: Commit UI changes

```bash
git add packages/web/src/components/EditTaskModal.tsx
git add packages/web/src/components/ViewTasksModal.tsx
git commit -m "feat(web): add EditTaskModal for proper task editing

- Create EditTaskModal component with full form (title, description, dueDate, status)
- Replace prompt() with modal in ViewTasksModal
- Add form validation and error handling
- Show success/error toasts
- Refresh task list after successful update

Fixes: Task editing now uses proper modal instead of browser prompt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Workflow Rule DTOs (API)

**Files:**
- Create: `packages/api/src/workflow/dto/create-workflow-rule.dto.ts`
- Create: `packages/api/src/workflow/dto/update-workflow-rule.dto.ts`
- Modify: `packages/api/src/workflow/workflow.controller.ts` (update types)

**Estimated Time:** 15 minutes

### Step 1: Create CreateWorkflowRuleDto

Create new file `packages/api/src/workflow/dto/create-workflow-rule.dto.ts`:

```typescript
import { IsString, IsEnum, IsObject, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { WorkflowRuleLevel } from '@prisma/client';

export class CreateWorkflowRuleDto {
  @IsString()
  name: string;

  @IsEnum(WorkflowRuleLevel)
  level: WorkflowRuleLevel;

  @IsObject()
  trigger: any; // JSON structure for trigger configuration

  @IsOptional()
  @IsObject()
  conditions?: any; // JSON structure for conditions

  @IsObject()
  actions: any; // JSON structure for actions to perform

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // This will be set by controller, not provided by client
  ownerId?: string;
}
```

### Step 2: Create UpdateWorkflowRuleDto

Create new file `packages/api/src/workflow/dto/update-workflow-rule.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowRuleDto } from './create-workflow-rule.dto';

export class UpdateWorkflowRuleDto extends PartialType(CreateWorkflowRuleDto) {}
```

### Step 3: Update WorkflowController to use DTOs

In `packages/api/src/workflow/workflow.controller.ts`:

1. **Add imports** (at top):
```typescript
import { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { UpdateWorkflowRuleDto } from './dto/update-workflow-rule.dto';
```

2. **Update createRule method** (replace line 70):
```typescript
// BEFORE:
@Post()
async createRule(@Body() dto: any, @Request() req) {

// AFTER:
@Post()
async createRule(@Body() dto: CreateWorkflowRuleDto, @Request() req) {
```

3. **Update updateRule method** (replace line 79):
```typescript
// BEFORE:
@Patch(':id')
async updateRule(@Param('id') id: string, @Body() updates: any) {

// AFTER:
@Patch(':id')
async updateRule(
  @Param('id') id: string,
  @Body() updates: UpdateWorkflowRuleDto,
  @Request() req,
) {
  return this.ruleService.updateRule(id, req.user.id, updates);
}
```

4. **Update deleteRule method** (replace line 84):
```typescript
// BEFORE:
@Delete(':id')
async deleteRule(@Param('id') id: string) {
  return this.ruleService.deleteRule(id);
}

// AFTER:
@Delete(':id')
async deleteRule(@Param('id') id: string, @Request() req) {
  return this.ruleService.deleteRule(id, req.user.id);
}
```

### Step 4: Commit DTO changes

```bash
git add packages/api/src/workflow/dto/create-workflow-rule.dto.ts
git add packages/api/src/workflow/dto/update-workflow-rule.dto.ts
git add packages/api/src/workflow/workflow.controller.ts
git commit -m "feat(api): add DTOs for workflow rules with validation

- Create CreateWorkflowRuleDto with class-validator decorators
- Create UpdateWorkflowRuleDto as PartialType
- Update controller to use DTOs instead of 'any'
- Pass userId to updateRule and deleteRule for authorization

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Authorization to Workflow Rule Service (API)

**Files:**
- Modify: `packages/api/src/workflow/workflow-rule.service.ts`

**Estimated Time:** 20 minutes

### Step 1: Add imports

In `packages/api/src/workflow/workflow-rule.service.ts`, add these imports at the top:

```typescript
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateWorkflowRuleDto } from './dto/update-workflow-rule.dto';
```

### Step 2: Update updateRule method signature and add authorization

Find the `updateRule` method and replace it with:

```typescript
async updateRule(id: string, userId: string, updates: UpdateWorkflowRuleDto) {
  // Get existing rule
  const rule = await this.prisma.workflowRule.findUnique({
    where: { id },
  });

  if (!rule) {
    throw new NotFoundException('Workflow rule not found');
  }

  // Authorization check: counselor-level rules can only be edited by owner or platform admin
  if (rule.level === 'counselor' && rule.ownerId !== userId) {
    // Check if user is platform admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (!user || !user.isPlatformAdmin) {
      throw new ForbiddenException('Not authorized to edit this rule');
    }
  }

  // Update the rule
  return this.prisma.workflowRule.update({
    where: { id },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });
}
```

### Step 3: Update deleteRule method signature and add authorization

Find the `deleteRule` method and replace it with:

```typescript
async deleteRule(id: string, userId: string) {
  // Get existing rule
  const rule = await this.prisma.workflowRule.findUnique({
    where: { id },
  });

  if (!rule) {
    throw new NotFoundException('Workflow rule not found');
  }

  // Same authorization check as updateRule
  if (rule.level === 'counselor' && rule.ownerId !== userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (!user || !user.isPlatformAdmin) {
      throw new ForbiddenException('Not authorized to delete this rule');
    }
  }

  // Delete the rule
  return this.prisma.workflowRule.delete({
    where: { id },
  });
}
```

### Step 4: Test authorization

Run API:
```bash
npx nx serve api
```

Test (replace IDs and tokens):
```bash
# Try to update someone else's counselor-level rule (should fail)
curl -X PATCH http://localhost:3697/workflow/rules/RULE_ID \
  -H "Authorization: Bearer OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked Rule"}'

# Expected: 403 Forbidden "Not authorized to edit this rule"

# Try with owner token (should succeed)
curl -X PATCH http://localhost:3697/workflow/rules/RULE_ID \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Rule"}'

# Expected: 200 OK with updated rule
```

### Step 5: Commit authorization changes

```bash
git add packages/api/src/workflow/workflow-rule.service.ts
git commit -m "feat(api): add authorization checks to workflow rule updates/deletes

- Check rule ownership before allowing edit/delete
- Allow platform admins to edit any rule
- Throw NotFoundException if rule doesn't exist
- Throw ForbiddenException if user not authorized
- Update signature to accept userId parameter

Security: Prevents users from editing/deleting others' workflow rules

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create EditWorkflowRuleModal Component (UI)

**Files:**
- Create: `packages/web/src/components/EditWorkflowRuleModal.tsx`

**Estimated Time:** 40 minutes

### Step 1: Create EditWorkflowRuleModal component

Create new file `packages/web/src/components/EditWorkflowRuleModal.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowRule } from '@/lib/api';
import { showToast } from './Toast';

interface EditWorkflowRuleModalProps {
  rule: WorkflowRule;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditWorkflowRuleModal({
  rule,
  isOpen,
  onClose,
  onSuccess,
}: EditWorkflowRuleModalProps) {
  const [formData, setFormData] = useState({
    name: rule.name,
    trigger: JSON.stringify(rule.trigger, null, 2),
    conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '',
    actions: JSON.stringify(rule.actions, null, 2),
    priority: rule.priority,
    isActive: rule.isActive,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when rule changes
  useEffect(() => {
    setFormData({
      name: rule.name,
      trigger: JSON.stringify(rule.trigger, null, 2),
      conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '',
      actions: JSON.stringify(rule.actions, null, 2),
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setError(null);
  }, [rule]);

  if (!isOpen) return null;

  const validateJSON = (json: string): boolean => {
    if (!json.trim()) return true; // Empty is OK for optional fields
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate JSON fields
    if (!validateJSON(formData.trigger)) {
      setError('Trigger must be valid JSON');
      return;
    }
    if (!validateJSON(formData.conditions)) {
      setError('Conditions must be valid JSON');
      return;
    }
    if (!validateJSON(formData.actions)) {
      setError('Actions must be valid JSON');
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${apiUrl}/workflow/rules/${rule.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          trigger: JSON.parse(formData.trigger),
          conditions: formData.conditions ? JSON.parse(formData.conditions) : undefined,
          actions: JSON.parse(formData.actions),
          priority: formData.priority,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update rule' }));
        throw new Error(errorData.message);
      }

      showToast('Workflow rule updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating workflow rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to update workflow rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-xl font-semibold mb-4">Edit Workflow Rule</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger (JSON)
              </label>
              <textarea
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
                placeholder='{"event": "wellbeing_check", "threshold": 5}'
              />
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions (JSON, optional)
              </label>
              <textarea
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"field": "mood", "operator": "lt", "value": 3}'
              />
            </div>

            {/* Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actions (JSON)
              </label>
              <textarea
                value={formData.actions}
                onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
                placeholder='[{"type": "send_notification", "template": "low_mood_alert"}]'
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Higher numbers run first</p>
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active (rule will be executed)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 2: Commit EditWorkflowRuleModal

```bash
git add packages/web/src/components/EditWorkflowRuleModal.tsx
git commit -m "feat(web): create EditWorkflowRuleModal component

- Full form for editing workflow rules
- JSON validation for trigger/conditions/actions
- Pre-populate form with existing rule data
- Show validation errors inline
- Support all fields: name, trigger, conditions, actions, priority, isActive

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Wire Edit/Delete to WorkflowRulesModal (UI)

**Files:**
- Modify: `packages/web/src/components/WorkflowRulesModal.tsx`

**Estimated Time:** 20 minutes

### Step 1: Import EditWorkflowRuleModal

In `packages/web/src/components/WorkflowRulesModal.tsx`, add import at top:

```typescript
import EditWorkflowRuleModal from './EditWorkflowRuleModal';
import { showToast } from './Toast';
```

### Step 2: Add state for edit modal

Add this state declaration (around line 30, after existing useState):

```typescript
const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
```

### Step 3: Add handleEdit function

Add this function (around line 60, after fetchActivity):

```typescript
const handleEdit = (rule: WorkflowRule) => {
  setEditingRule(rule);
};
```

### Step 4: Add handleDelete function

Add this function after handleEdit:

```typescript
const handleDelete = async (rule: WorkflowRule) => {
  if (!confirm(`Are you sure you want to delete the workflow rule "${rule.name}"?`)) {
    return;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/workflow/rules/${rule.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete rule' }));
      throw new Error(error.message);
    }

    showToast('Workflow rule deleted successfully', 'success');
    await fetchRules();
  } catch (error) {
    console.error('Error deleting workflow rule:', error);
    showToast(
      error instanceof Error ? error.message : 'Failed to delete workflow rule',
      'error'
    );
  }
};
```

### Step 5: Enable Edit/Delete buttons

Find the disabled Edit/Delete buttons (around lines 225-240) and replace them:

**BEFORE:**
```typescript
<button
  type="button"
  disabled
  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
  title="Edit functionality coming soon"
>
  Edit
</button>
<button
  type="button"
  disabled
  className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
  title="Delete functionality coming soon"
>
  Delete
</button>
```

**AFTER:**
```typescript
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
```

### Step 6: Add EditWorkflowRuleModal to JSX

Add this before the final closing `</div>` in the component return:

```typescript
{/* Edit Rule Modal */}
{editingRule && (
  <EditWorkflowRuleModal
    rule={editingRule}
    isOpen={!!editingRule}
    onClose={() => setEditingRule(null)}
    onSuccess={() => {
      setEditingRule(null);
      fetchRules();
    }}
  />
)}
```

### Step 7: Test edit and delete functionality

1. Run web app: `npx nx serve web`
2. Log in as counselor or platform admin
3. Navigate to a member's workflow rules modal
4. **Test Edit:**
   - Click "Edit" on a rule
   - Modal should appear with form pre-filled
   - Modify name or JSON fields
   - Click "Save Changes"
   - **Expected**: Modal closes, rule list refreshes, toast shows success
5. **Test Delete:**
   - Click "Delete" on a rule
   - Confirm dialog appears
   - Click OK
   - **Expected**: Rule disappears from list, toast shows success
6. **Test Authorization:**
   - As counselor, try to edit another counselor's rule
   - **Expected**: Should get 403 error toast

### Step 8: Commit WorkflowRulesModal changes

```bash
git add packages/web/src/components/WorkflowRulesModal.tsx
git commit -m "feat(web): enable edit/delete buttons for workflow rules

- Import and wire EditWorkflowRuleModal
- Add handleEdit function to open modal
- Add handleDelete function with confirmation dialog
- Replace disabled buttons with active buttons
- Show success/error toasts
- Refresh rules list after edit/delete

Fixes: Workflow rules can now be edited and deleted via UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: End-to-End Testing

**Estimated Time:** 15 minutes

### Step 1: Test subscription navigation

1. Start web app: `npx nx serve web`
2. Log in as any user
3. Open user menu
4. Click "Subscribe Now"
5. **Verify:** Navigates to `/settings/subscription` (no alert)

### Step 2: Test task editing

1. Log in as member with tasks
2. Open tasks list
3. Click "Edit" on a task
4. **Verify:** EditTaskModal appears with form
5. Change title, description, due date, status
6. Click "Save Changes"
7. **Verify:** Task updates, modal closes, success toast appears
8. Open edit again to confirm changes persisted

### Step 3: Test workflow rules

1. Log in as counselor
2. Navigate to member with workflow rules
3. **Test Edit:**
   - Click "Edit" on a rule
   - Modify name and JSON
   - Save
   - **Verify:** Changes saved, list refreshes
4. **Test Delete:**
   - Click "Delete" on a rule
   - Confirm
   - **Verify:** Rule removed, list refreshes

### Step 4: Create final summary commit

After all testing passes:

```bash
git log --oneline | head -8
# Should see all 7 commits from this phase

# Create summary in commit message
git commit --allow-empty -m "chore: Phase 1 Quick Wins complete

Summary of changes:
1. ✅ Subscription button navigation fix (2 min)
2. ✅ Task edit modal with API endpoint (50 min)
3. ✅ Workflow rules edit/delete with DTOs (95 min)

Total: 3 features fixed, 9 files created, 6 files modified
Estimated time: 147 minutes (~2.5 hours)
All manual tests passing

Ready for Phase 2: API Completions

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Implementation Complete!

All Phase 1 tasks are now complete. The following broken user flows are now fixed:

✅ **Subscription Navigation** - Button properly navigates to subscription page
✅ **Task Editing** - Full modal with form instead of browser prompt
✅ **Workflow Rules** - Edit and delete buttons now functional with proper authorization

**Files Created:** 4
- `packages/web/src/components/EditTaskModal.tsx`
- `packages/web/src/components/EditWorkflowRuleModal.tsx`
- `packages/api/src/counsel/dto/update-task.dto.ts`
- `packages/api/src/workflow/dto/create-workflow-rule.dto.ts`
- `packages/api/src/workflow/dto/update-workflow-rule.dto.ts`

**Files Modified:** 5
- `packages/web/src/components/UserMenu.tsx`
- `packages/web/src/components/ViewTasksModal.tsx`
- `packages/web/src/components/WorkflowRulesModal.tsx`
- `packages/api/src/counsel/task.controller.ts`
- `packages/api/src/counsel/member-task.service.ts`
- `packages/api/src/workflow/workflow.controller.ts`
- `packages/api/src/workflow/workflow-rule.service.ts`

**Next Phase:** Phase 2 - API Completions (custom assessment assignment, reading list endpoints, CSV export, assessment form data)
