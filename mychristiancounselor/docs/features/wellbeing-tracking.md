# Wellbeing Tracking System

## Overview

Longitudinal tracking of member wellbeing with historical records, trajectory analysis, and AI-generated session summaries.

## Features

### 1. Historical Tracking

All wellbeing status changes are automatically recorded to the `MemberWellbeingHistory` table:
- Captures every status transition (red/yellow/green)
- Preserves context with summary field
- Tracks whether change was AI-determined or counselor-overridden
- Queryable by date range for historical analysis

**When history is recorded:**
- During nightly AI wellbeing analysis (if status changes)
- When counselor manually overrides a member's status
- Automatically via existing workflows

### 2. Trajectory Calculation

Automatically calculates wellbeing trajectory based on recent history:

**Trajectory Types:**
- `improving` - Recent status changes show positive progression
- `declining` - Recent status changes show concerning decline
- `stable` - Status remains consistent
- `insufficient_data` - Less than 2 historical records

**Algorithm:**
- Uses last 3 status records
- Maps red=1, yellow=2, green=3 for comparison
- Compares latest vs previous scores
- Updates automatically with each status change

**Example:**
- Member status history: red (Jan 1) → yellow (Jan 8) → green (Jan 15)
- Calculated trajectory: `improving`

### 3. Session Summaries

AI-generated summaries created automatically after each conversation:

**Summary Contains:**
- 2-3 sentence summary of discussion
- Key topics extracted (array of strings)
- Sentiment analysis (positive/neutral/negative)
- Timestamp of when summary was generated

**Generation:**
- Event-driven: triggered when conversation receives response
- Uses AWS Bedrock (Claude Haiku) for efficient analysis
- Stores in `SessionSummary` table with 1:1 relationship to Session
- Non-blocking: failures logged but don't interrupt user experience

## API Endpoints

All endpoints require JWT authentication.

### GET `/counsel/wellbeing/history`

Get historical wellbeing status changes for authenticated user.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 10)
- `startDate` (optional): Filter records after this date (ISO 8601 format)
- `endDate` (optional): Filter records before this date (ISO 8601 format)

**Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "memberId": "uuid",
      "status": "green",
      "trajectory": "improving",
      "summary": "Member showing positive growth...",
      "overriddenBy": null,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### GET `/counsel/wellbeing/trajectory`

Get current wellbeing trajectory for authenticated user.

**Response:**
```json
{
  "trajectory": "improving",
  "explanation": "Member wellbeing shows positive progression over recent assessments"
}
```

### GET `/counsel/wellbeing/session-summaries`

Get recent AI-generated session summaries for authenticated user.

**Query Parameters:**
- `limit` (optional): Number of summaries to return (default: 5)

**Response:**
```json
{
  "summaries": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "memberId": "uuid",
      "summary": "Member discussed anxiety about work...",
      "topics": ["anxiety", "work", "coping"],
      "sentiment": "neutral",
      "createdAt": "2025-01-15T14:30:00Z"
    }
  ]
}
```

## Database Schema

### MemberWellbeingHistory

Tracks all wellbeing status changes over time with context.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| memberId | uuid | Foreign key to User |
| status | WellbeingStatus | red/yellow/green |
| trajectory | WellbeingTrajectory | improving/declining/stable/insufficient_data |
| summary | text | Context about this status |
| overriddenBy | uuid | Counselor ID if manual override (nullable) |
| createdAt | timestamp | When this record was created |
| updatedAt | timestamp | Last update timestamp |

### SessionSummary

AI-generated summaries of individual conversations.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| sessionId | uuid | Foreign key to Session (unique) |
| memberId | uuid | Foreign key to User |
| summary | text | 2-3 sentence summary |
| topics | text[] | Array of key topics |
| sentiment | SentimentType | positive/neutral/negative |
| createdAt | timestamp | When summary was generated |

## Services

### WellbeingHistoryService

**Purpose:** Record and retrieve wellbeing history

**Key Methods:**
- `recordStatusChange(dto)` - Record status change to history
- `getHistory(memberId, options)` - Retrieve history with filtering
- `getRecentHistory(memberId, count)` - Get recent history for trajectory

**Location:** `packages/api/src/counsel/wellbeing-history.service.ts`

### TrajectoryCalculationService

**Purpose:** Calculate wellbeing trajectory from history

**Key Methods:**
- `calculateTrajectory(memberId)` - Calculate current trajectory
- `getTrajectoryExplanation(trajectory)` - Get human-readable explanation

**Location:** `packages/api/src/counsel/trajectory-calculation.service.ts`

### SessionSummaryService

**Purpose:** Generate and retrieve AI session summaries

**Key Methods:**
- `generateSummary(sessionId, memberId)` - Generate AI summary
- `getSummary(sessionId)` - Get summary by session ID
- `getRecentSummaries(memberId, limit)` - Get recent summaries
- `handleSessionCompleted(event)` - Event listener for auto-generation

**Location:** `packages/api/src/counsel/session-summary.service.ts`

## Integration Points

### Nightly Wellbeing Analysis

The existing `WellbeingAnalysisService` has been enhanced to:
1. Record status changes to history (only when status changes)
2. Calculate trajectory after each analysis
3. Update `MemberWellbeingStatus.trajectory` field

**Scheduler:** Runs at 3 AM daily via `WellbeingAnalysisScheduler`

### Counselor Overrides

When counselors manually override a member's status:
1. Override is recorded to history with `overriddenBy` field set
2. Trajectory is recalculated based on new status
3. Audit trail maintained for accountability

### Event-Driven Architecture

**Event:** `session.completed`

**Flow:**
1. User receives counsel response
2. `CounselProcessingService` emits `session.completed` event
3. `SessionSummaryService` listens for event
4. AI summary generated and stored
5. Non-blocking: failures don't interrupt user

## Configuration

No additional configuration required - all tracking is automatic once Phase 2 is deployed.

**Environment Variables:**
- All existing environment variables remain unchanged
- Uses existing AWS Bedrock configuration for AI summaries

## Future Enhancements

- [ ] Trend reports for counselors (weekly/monthly wellbeing progression)
- [ ] Alert rules based on trajectory (e.g., alert if declining for 2+ weeks)
- [ ] Session summary versioning (update summaries as conversations continue)
- [ ] Debouncing for session.completed events (emit after inactivity period)
- [ ] Export functionality (download member wellbeing history as CSV/PDF)
- [ ] Visualization of trajectory over time (charts/graphs)
