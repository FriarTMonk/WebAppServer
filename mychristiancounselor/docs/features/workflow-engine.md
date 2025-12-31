# Workflow Rules Engine

## Overview

Configurable IF-THEN automation that connects all features intelligently. Event-driven architecture with three-tier configuration: platform defaults → organization overrides → counselor customization.

## Architecture

### Event-Driven Integration

```
System Event (e.g., crisis.detected)
    ↓
Event Bus (EventEmitter2)
    ↓
WorkflowEngine.evaluateEvent()
    ↓
Match Trigger → Evaluate Conditions → Execute Actions
    ↓
WorkflowExecution (audit log)
```

### Configuration Hierarchy

```
Platform Rules (developers define, same for all)
    ↓
Organization Rules (org admins override/add)
    ↓
Counselor Rules (individual customization)
```

**Precedence:** Counselor > Organization > Platform

## Rule Structure

```typescript
{
  name: "Crisis Detection → Alert + PHQ-9",
  level: "platform", // platform | organization | counselor
  trigger: {
    event: "crisis.detected"
  },
  conditions: {
    confidence: "high"
  },
  actions: [
    { type: "send_crisis_alert_email" },
    { type: "auto_assign_assessment", assessmentType: "PHQ-9" }
  ],
  priority: 100, // Higher = executed first
  isActive: true
}
```

## Supported Events

From Phases 1-3:

| Event | Trigger | Example Use Case |
|-------|---------|------------------|
| `crisis.detected` | SafetyService detects crisis | Send alert, assign PHQ-9 |
| `wellbeing.status.changed` | Status changes (green/yellow/red) | Notify counselor, assign task |
| `wellbeing.trajectory.changed` | Trajectory changes | Encouragement for improving |
| `assessment.completed` | Member submits assessment | Check score, assign follow-up |
| `assessment.score.changed` | Score significantly changes | Alert if declining |
| `task.completed` | Member completes task | Acknowledge, assign next task |
| `task.overdue` | Task past due date | Remind counselor |
| `session.completed` | User finishes conversation | Generate summary, detect topics |

## Supported Actions

### 1. send_crisis_alert_email

Send high-priority email to counselor.

```json
{ "type": "send_crisis_alert_email" }
```

### 2. auto_assign_assessment

Assign assessment to member.

```json
{
  "type": "auto_assign_assessment",
  "assessmentType": "PHQ-9"
}
```

### 3. auto_assign_task

Assign task to member.

```json
{
  "type": "auto_assign_task",
  "taskType": "conversation_prompt",
  "title": "Check-in conversation",
  "description": "Discuss recent struggles"
}
```

### 4. notify_counselor

Send notification email to counselor.

```json
{
  "type": "notify_counselor",
  "subject": "Member wellbeing declined",
  "message": "Member status changed to red"
}
```

## Platform Default Rules

4 rules created on system initialization:

**1. Crisis Detection → Alert + PHQ-9**
- Trigger: crisis.detected (confidence: high)
- Actions: Send alert, assign PHQ-9
- Priority: 100

**2. Wellbeing Declined → Notify + Task**
- Trigger: wellbeing.status.changed (newStatus: red)
- Actions: Notify counselor, assign check-in task
- Priority: 90

**3. PHQ-9 Improving → Encouragement**
- Trigger: assessment.completed (type: PHQ-9, score decreased)
- Actions: Notify counselor of improvement
- Priority: 50

**4. Task Overdue → Reminder**
- Trigger: task.overdue
- Actions: Notify counselor
- Priority: 30

## API Endpoints

All endpoints require JWT authentication.

### GET `/workflow/rules`

Get workflow rules.

**Query Parameters:**
- `level` (optional): Filter by level (platform, organization, counselor)
- `isActive` (optional): Filter by active status

**Response:**
```json
[
  {
    "id": "rule-123",
    "name": "Crisis Alert Rule",
    "level": "platform",
    "ownerId": null,
    "trigger": { "event": "crisis.detected" },
    "conditions": { "confidence": "high" },
    "actions": [{ "type": "send_crisis_alert_email" }],
    "priority": 100,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### POST `/workflow/rules`

Create new workflow rule.

**Request Body:**
```json
{
  "name": "Custom Alert",
  "level": "counselor",
  "trigger": { "event": "task.overdue" },
  "actions": [{ "type": "notify_counselor", "subject": "Task overdue" }],
  "priority": 5
}
```

**Response:** Created rule object

### PATCH `/workflow/rules/:id`

Update workflow rule.

**Request Body:**
```json
{
  "isActive": false
}
```

### DELETE `/workflow/rules/:id`

Delete workflow rule.

## Services

### WorkflowEngineService

**Purpose:** Evaluate rules and coordinate actions

**Key Methods:**
- `onModuleInit()` - Subscribe to all system events
- `evaluateEvent(eventType, eventData)` - Match rules, execute actions
- `evaluateConditions(conditions, data)` - Check if conditions met

**Location:** `packages/api/src/workflow/workflow-engine.service.ts`

### WorkflowActionService

**Purpose:** Execute workflow actions

**Key Methods:**
- `executeAction(action, eventData)` - Route to specific action handler
- `executeSendCrisisAlert(data)` - Send crisis alert
- `executeAutoAssignAssessment(action, data)` - Assign assessment
- `executeAutoAssignTask(action, data)` - Assign task
- `executeNotifyCounselor(action, data)` - Send counselor email

**Location:** `packages/api/src/workflow/workflow-action.service.ts`

### WorkflowRuleService

**Purpose:** CRUD operations for rules

**Key Methods:**
- `createRule(dto)` - Create new rule
- `getRules(options)` - Get rules with filtering
- `updateRule(ruleId, updates)` - Update rule
- `deleteRule(ruleId)` - Delete rule

**Location:** `packages/api/src/workflow/workflow-rule.service.ts`

## Database Schema

### WorkflowRule

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | string | Rule name |
| level | WorkflowRuleLevel | platform, organization, counselor |
| ownerId | uuid | Owner (org/counselor) if not platform (nullable) |
| trigger | json | Event trigger definition |
| conditions | json | Optional conditions to evaluate (nullable) |
| actions | json | Array of actions to execute |
| priority | integer | Execution priority (higher first) |
| isActive | boolean | Whether rule is active |
| createdAt | timestamp | When created |
| updatedAt | timestamp | Last update |

### WorkflowExecution

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| ruleId | uuid | Foreign key to WorkflowRule |
| triggeredBy | string | Event type that triggered execution |
| context | json | Event data at time of execution |
| actions | json | Actions executed with results |
| success | boolean | Whether all actions succeeded |
| error | text | Error message if failed (nullable) |
| executedAt | timestamp | When executed |

## Future Enhancements

- [ ] Complex conditions (AND/OR logic, comparisons)
- [ ] Templated action parameters (use event data in messages)
- [ ] Rate limiting per rule (max executions per hour)
- [ ] Rule builder UI for counselors/admins
- [ ] Rule testing/simulation mode
- [ ] Webhooks action type (integrate external systems)
- [ ] Scheduled triggers (not just event-driven)
