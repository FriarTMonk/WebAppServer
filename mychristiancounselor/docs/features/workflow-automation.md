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
