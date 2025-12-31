# Member Tasks System

## Overview

Counselor-assigned tasks for members with three types: conversation prompts, offline tasks, and guided conversations. Features auto-completion detection, overdue tracking, and predefined templates.

## Task Types

### 1. Conversation Prompt

**Purpose:** Suggest topics for the member to discuss with the AI counselor

**How it Works:**
- Counselor assigns a conversation prompt with keywords (e.g., "Discuss grief")
- Member sees task in their dashboard
- When member has a conversation, AI analyzes the discussion
- If keywords detected in conversation, task auto-completes
- Member gets immediate feedback that they addressed the topic

**Example:**
```json
{
  "type": "conversation_prompt",
  "title": "Discuss Your Grief",
  "description": "I'd like you to have a conversation with the AI counselor about your recent loss and how you're processing grief.",
  "metadata": {
    "keywords": ["grief", "loss", "mourning", "bereavement"],
    "suggestedScriptures": ["Psalm 23", "Matthew 5:4"]
  }
}
```

**Member Experience:**
1. Sees task: "Discuss Your Grief"
2. Starts conversation with AI counselor
3. Discusses feelings about recent loss
4. Task automatically marks complete
5. Sees confirmation: "You've addressed the grief topic!"

### 2. Offline Task

**Purpose:** Actions for member to complete outside the app

**How it Works:**
- Counselor assigns a task to complete offline
- Member marks complete manually when done
- Counselor can verify completion in next session
- Examples: journaling, exercise, scripture study, prayer

**Example:**
```json
{
  "type": "offline_task",
  "title": "Daily Gratitude Journal",
  "description": "Write down 3 things you're grateful for each day this week.",
  "dueDate": "2025-02-01T00:00:00Z",
  "metadata": {
    "category": "spiritual_practice",
    "scripture": "1 Thessalonians 5:18"
  }
}
```

**Member Experience:**
1. Sees task: "Daily Gratitude Journal" (due Feb 1)
2. Completes journaling offline
3. Clicks "Mark Complete" button
4. Task moves to "Completed" section

### 3. Guided Conversation

**Purpose:** Structured conversation with specific prompts and follow-up questions

**How it Works:**
- Counselor assigns guided conversation
- Member opens task and sees conversation starter
- AI counselor uses follow-up prompts to guide discussion
- Task completes when all prompts addressed
- More structured than open conversation prompts

**Example:**
```json
{
  "type": "guided_conversation",
  "title": "Exploring Anxiety Triggers",
  "description": "Let's explore what situations trigger your anxiety.",
  "metadata": {
    "conversationStarter": "Tell me about a recent time you felt anxious. What was happening?",
    "followUpPrompts": [
      "What physical sensations did you notice?",
      "What thoughts were going through your mind?",
      "How did you respond to the situation?"
    ]
  }
}
```

**Member Experience:**
1. Opens task: "Exploring Anxiety Triggers"
2. Sees conversation starter
3. AI counselor guides through each follow-up prompt
4. Task completes when all prompts discussed

## Task Templates

10 predefined templates counselors can use:

### Conversation Prompts (3 templates)

**1. Discuss Grief and Loss**
- Keywords: grief, loss, mourning, bereavement, death
- Suggested Scriptures: Psalm 23, Matthew 5:4, Revelation 21:4
- Duration: 7 days

**2. Talk About Anxiety**
- Keywords: anxiety, worry, fear, nervousness, stress
- Suggested Scriptures: Philippians 4:6-7, 1 Peter 5:7, Matthew 6:25-34
- Duration: 7 days

**3. Explore Anger and Forgiveness**
- Keywords: anger, forgiveness, resentment, bitterness, reconciliation
- Suggested Scriptures: Ephesians 4:26-27, Colossians 3:13, Matthew 6:14-15
- Duration: 10 days

### Offline Tasks (4 templates)

**4. Daily Gratitude Journal**
- Category: spiritual_practice
- Scripture: 1 Thessalonians 5:18
- Duration: 7 days

**5. Scripture Meditation (Psalm 23)**
- Category: spiritual_practice
- Scripture: Psalm 23
- Duration: 7 days

**6. Exercise 30 Minutes Daily**
- Category: physical_health
- Duration: 7 days

**7. Practice Deep Breathing**
- Category: coping_skill
- Duration: 7 days

### Guided Conversations (3 templates)

**8. Understanding Depression Patterns**
- Starter: "Let's explore when you typically feel most depressed."
- Prompts: Time of day patterns, triggering situations, recent episode
- Duration: 7 days

**9. Building Healthy Boundaries**
- Starter: "Tell me about a relationship where you struggle with boundaries."
- Prompts: Boundary violations, saying no, consequences
- Duration: 10 days

**10. Stress Management Strategies**
- Starter: "Describe a recent stressful situation."
- Prompts: Response patterns, helpful strategies, prevention
- Duration: 7 days

## API Endpoints

All endpoints require JWT authentication.

### POST `/counsel/tasks`

Create new task for member.

**Request Body:**
```json
{
  "memberId": "member-uuid",
  "type": "conversation_prompt",
  "title": "Discuss Grief",
  "description": "Have a conversation about your recent loss.",
  "dueDate": "2025-02-01T00:00:00Z",
  "metadata": {
    "keywords": ["grief", "loss"],
    "suggestedScriptures": ["Psalm 23"]
  }
}
```

**Response:**
```json
{
  "id": "task-uuid",
  "memberId": "member-uuid",
  "counselorId": "counselor-uuid",
  "type": "conversation_prompt",
  "title": "Discuss Grief",
  "description": "Have a conversation about your recent loss.",
  "dueDate": "2025-02-01T00:00:00Z",
  "status": "pending",
  "completedAt": null,
  "metadata": {
    "keywords": ["grief", "loss"],
    "suggestedScriptures": ["Psalm 23"]
  },
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

### GET `/counsel/tasks/member/:memberId`

Get all tasks for a member (counselor only).

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, overdue)

**Response:**
```json
[
  {
    "id": "task-uuid",
    "memberId": "member-uuid",
    "counselorId": "counselor-uuid",
    "type": "conversation_prompt",
    "title": "Discuss Grief",
    "status": "pending",
    "dueDate": "2025-02-01T00:00:00Z",
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

### GET `/counsel/tasks/my-tasks`

Get authenticated member's tasks.

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, overdue)

**Response:** Same format as member tasks endpoint

### GET `/counsel/tasks/:id`

Get specific task details.

**Response:**
```json
{
  "id": "task-uuid",
  "memberId": "member-uuid",
  "counselorId": "counselor-uuid",
  "type": "conversation_prompt",
  "title": "Discuss Grief",
  "description": "Have a conversation about your recent loss.",
  "dueDate": "2025-02-01T00:00:00Z",
  "status": "pending",
  "completedAt": null,
  "metadata": {
    "keywords": ["grief", "loss"],
    "suggestedScriptures": ["Psalm 23"]
  },
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

### POST `/counsel/tasks/:id/complete`

Mark task as complete.

**Response:**
```json
{
  "id": "task-uuid",
  "status": "completed",
  "completedAt": "2025-01-20T14:30:00Z"
}
```

### GET `/counsel/tasks/templates`

Get all predefined task templates.

**Response:**
```json
[
  {
    "id": "grief-loss",
    "type": "conversation_prompt",
    "title": "Discuss Grief and Loss",
    "description": "...",
    "suggestedDurationDays": 7,
    "metadata": {
      "keywords": ["grief", "loss"],
      "suggestedScriptures": ["Psalm 23"]
    }
  }
]
```

### GET `/counsel/tasks/templates/:id`

Get specific task template.

**Response:** Single template object

## Services

### MemberTaskService

**Purpose:** CRUD operations for tasks

**Key Methods:**
- `createTask(dto)` - Create new task
- `getMemberTasks(memberId, status)` - Get member's tasks
- `getTaskById(taskId)` - Get specific task
- `markComplete(taskId)` - Complete task and emit event

**Location:** `packages/api/src/counsel/member-task.service.ts`

### TaskCompletionDetectionService

**Purpose:** Auto-detect conversation topic completion

**Key Methods:**
- `checkConversationTopicCompletion(memberId, text)` - Check if topics discussed
- `handleSessionCompleted(event)` - Event listener for session.completed

**Location:** `packages/api/src/counsel/task-completion-detection.service.ts`

### TaskOverdueService

**Purpose:** Daily cron job for overdue detection

**Key Methods:**
- `processOverdueTasks()` - Runs at midnight, marks overdue tasks

**Location:** `packages/api/src/counsel/task-overdue.service.ts`

### TaskTemplateService

**Purpose:** Manage predefined task templates

**Key Methods:**
- `getPlatformTemplates()` - Get all templates
- `getTemplateById(id)` - Get specific template
- `getTemplatesByType(type)` - Filter by type

**Location:** `packages/api/src/counsel/task-template.service.ts`

## Database Schema

### MemberTask

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| memberId | uuid | Foreign key to User |
| counselorId | uuid | Foreign key to User (counselor) |
| type | MemberTaskType | conversation_prompt, offline_task, guided_conversation |
| title | string | Task title |
| description | text | Task description |
| dueDate | timestamp | When task is due (nullable) |
| completedAt | timestamp | When completed (nullable) |
| status | MemberTaskStatus | pending, completed, overdue |
| metadata | json | Additional data (keywords, prompts, etc.) |
| createdAt | timestamp | When assigned |
| updatedAt | timestamp | Last update |

## Future Enhancements

- [ ] Task progress tracking for multi-step tasks
- [ ] Recurring tasks (daily, weekly)
- [ ] Task dependencies (complete A before B unlocks)
- [ ] Member-initiated task requests
- [ ] Task analytics (completion rates, time to complete)
