# Assessment System

## Overview

Clinical and custom mental health assessments with automated scheduling, scoring, and severity level determination.

## Clinical Assessments

### PHQ-9 (Patient Health Questionnaire - Depression)

**Purpose:** Standardized screening for depression severity

**Format:**
- 9 questions on a 0-3 scale
- Total score range: 0-27
- Takes approximately 3-5 minutes to complete

**Scoring:**
- Method: Sum of all responses
- **none-minimal** (0-4): No or minimal depression
- **mild** (5-9): Mild depression
- **moderate** (10-14): Moderate depression
- **moderately-severe** (15-19): Moderately severe depression
- **severe** (20-27): Severe depression

**Questions Cover:**
- Anhedonia (lack of interest/pleasure)
- Depressed mood
- Sleep disturbances
- Energy levels
- Appetite changes
- Self-worth feelings
- Concentration issues
- Psychomotor changes
- Suicidal ideation

### GAD-7 (Generalized Anxiety Disorder)

**Purpose:** Standardized screening for anxiety severity

**Format:**
- 7 questions on a 0-3 scale
- Total score range: 0-21
- Takes approximately 2-3 minutes to complete

**Scoring:**
- Method: Sum of all responses
- **minimal** (0-4): Minimal anxiety
- **mild** (5-9): Mild anxiety
- **moderate** (10-14): Moderate anxiety
- **severe** (15-21): Severe anxiety

**Questions Cover:**
- Nervousness/anxiety
- Inability to control worrying
- Excessive worry
- Trouble relaxing
- Restlessness
- Irritability
- Fear of something awful happening

### Future Assessments

- **PCL-5** - PTSD Checklist (20 questions, 0-80 score)
- **PSS-10** - Perceived Stress Scale (10 questions, 0-40 score)
- **Custom assessments** - Organization-specific screening tools

## Features

### 1. Assessment Assignment

**Manual Assignment:**
Counselors can manually assign assessments to members through the counselor dashboard:
- Select member
- Choose assessment type (PHQ-9, GAD-7, etc.)
- Set due date (optional)
- Add notes for context

**Automated Assignment:**
System automatically assigns assessments based on schedule rules:
- Frequency-based (e.g., PHQ-9 every 14 days)
- Target all assigned members or specific members
- Runs daily at 9 AM via cron job

**Trigger-Based Assignment (Future):**
- Auto-assign after crisis detection
- Auto-assign on specific events (first session, 30-day milestone, etc.)

### 2. Automated Scheduling

**How It Works:**
1. Counselors/admins create assessment schedules
2. Daily cron job (9 AM) processes active schedules
3. System checks member eligibility based on last assignment date
4. Eligible members automatically receive assignments

**Eligibility Rules:**
- Member must have active counselor assignment
- Frequency period must have elapsed since last assignment
- Example: If schedule is "every 14 days", member must not have received same assessment in last 14 days

**Schedule Configuration:**
```typescript
{
  name: "Bi-weekly PHQ-9",
  assessmentId: "phq-9-uuid",
  targetType: "all_assigned_members",  // or "specific_members"
  frequencyDays: 14,
  organizationId: "org-uuid",  // optional
  createdBy: "counselor-uuid",
  isActive: true
}
```

### 3. Assessment Scoring

**Automatic Scoring:**
When a member submits an assessment, the system:
1. Receives responses (array of questionId/value pairs)
2. Applies appropriate scoring method (sum or average)
3. Determines severity level based on score ranges
4. Stores score and interpretation in database

**Scoring Methods:**
- **Sum:** Add all response values (PHQ-9, GAD-7)
- **Average:** Mean of all response values (custom assessments)
- **Custom:** Future support for complex formulas

**Result Storage:**
- `AssessmentResponse.score` - Numeric score
- `AssessmentResponse.interpretation` - Severity level description
- Available immediately after submission

### 4. Member Experience

**Assignment Notification:**
- Members see assigned assessments in their dashboard
- Due date displayed (if set)
- Clear instructions for completion

**Completion Process:**
1. Member opens assigned assessment
2. Reads question and response options
3. Selects response for each question (0-3 scale)
4. Reviews responses before submission
5. Submits assessment
6. Receives immediate score and interpretation

**Results Access:**
- Members can view their own assessment history
- Scores and severity levels displayed
- Historical trends (future enhancement)

### 5. Counselor Dashboard

**Features:**
- View all assigned assessments across members
- Filter by status (pending/completed/overdue)
- Review member responses and scores
- Track trends over time
- Create ad-hoc assignments
- Manage assessment schedules

## API Endpoints

All endpoints require JWT authentication.

### GET `/counsel/assessments/available`

List all available assessment types.

**Response:**
```json
[
  {
    "id": "phq-9",
    "name": "PHQ-9 (Patient Health Questionnaire)",
    "description": "Standardized assessment for measuring depression severity",
    "type": "clinical",
    "questionCount": 9
  },
  {
    "id": "gad-7",
    "name": "GAD-7 (Generalized Anxiety Disorder)",
    "description": "Standardized assessment for measuring anxiety severity",
    "type": "clinical",
    "questionCount": 7
  }
]
```

### GET `/counsel/assessments/definitions/:assessmentId`

Get full assessment definition including all questions and scoring rules.

**Response:**
```json
{
  "id": "phq-9",
  "name": "PHQ-9 (Patient Health Questionnaire)",
  "description": "Standardized assessment for measuring depression severity",
  "type": "clinical",
  "questions": [
    {
      "id": "phq9_q1",
      "text": "Little interest or pleasure in doing things",
      "type": "scale",
      "options": [
        { "value": 0, "label": "Not at all" },
        { "value": 1, "label": "Several days" },
        { "value": 2, "label": "More than half the days" },
        { "value": 3, "label": "Nearly every day" }
      ],
      "required": true
    }
    // ... 8 more questions
  ],
  "scoringRules": {
    "method": "sum",
    "minScore": 0,
    "maxScore": 27,
    "severityLevels": [...]
  }
}
```

### GET `/counsel/assessments/assigned`

Get assigned assessments for authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (pending/completed/expired)

**Response:**
```json
[
  {
    "id": "uuid",
    "memberId": "uuid",
    "assessmentId": "uuid",
    "assignedBy": "uuid",
    "dueDate": "2025-02-01T00:00:00Z",
    "status": "pending",
    "createdAt": "2025-01-15T09:00:00Z",
    "completedAt": null,
    "score": null,
    "interpretation": null
  }
]
```

### POST `/counsel/assessments/assigned/:assignedId/submit`

Submit assessment responses and receive immediate scoring.

**Request Body:**
```json
{
  "responses": [
    { "questionId": "phq9_q1", "value": 2 },
    { "questionId": "phq9_q2", "value": 1 },
    // ... all 9 questions
  ]
}
```

**Response:**
```json
{
  "message": "Assessment submitted successfully",
  "score": {
    "totalScore": 10,
    "severityLevel": "moderate",
    "interpretation": "Moderate depression"
  }
}
```

### GET `/counsel/assessments/assigned/:assignedId/results`

Get results for a completed assessment.

**Response:**
```json
{
  "responses": {
    "answers": [
      { "questionId": "phq9_q1", "value": 2 },
      // ... all responses
    ],
    "score": 10,
    "interpretation": "Moderate depression"
  }
}
```

## Database Schema

### Assessment

Defines available assessment types.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| type | string | Assessment identifier (phq-9, gad-7, etc.) |
| name | string | Display name |
| description | text | Purpose and context |
| createdAt | timestamp | When created |

### AssignedAssessment

Tracks assessment assignments to members.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| memberId | uuid | Foreign key to User |
| assessmentId | uuid | Foreign key to Assessment |
| assignedBy | uuid | Foreign key to User (counselor) |
| dueDate | timestamp | When due (nullable) |
| status | AssessmentStatus | pending/completed/expired |
| completedAt | timestamp | When completed (nullable) |
| score | decimal | Calculated score (nullable) |
| interpretation | text | Severity level text (nullable) |
| createdAt | timestamp | When assigned |
| updatedAt | timestamp | Last update |

### AssessmentResponse

Stores member responses and scoring results.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| assignedAssessmentId | uuid | Foreign key to AssignedAssessment (unique) |
| answers | jsonb | Array of {questionId, value} pairs |
| score | decimal | Calculated score |
| interpretation | text | Severity level interpretation |
| createdAt | timestamp | When submitted |

### AssessmentSchedule

Defines automated assignment schedules.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | string | Schedule name |
| assessmentId | uuid | Foreign key to Assessment |
| targetType | string | all_assigned_members or specific_members |
| frequencyDays | integer | Days between assignments |
| organizationId | uuid | Organization scope (nullable) |
| createdBy | uuid | Creator user ID |
| isActive | boolean | Whether schedule is active |
| createdAt | timestamp | When created |
| updatedAt | timestamp | Last update |

## Services

### AssessmentService

**Purpose:** CRUD operations for assessments

**Key Methods:**
- `assignAssessment(dto)` - Assign assessment to member
- `getAssignedAssessments(memberId, status)` - Get member's assignments
- `submitResponse(assignedId, memberId, responses)` - Submit and save responses
- `getResponses(assignedId)` - Retrieve completed responses

**Location:** `packages/api/src/counsel/assessment.service.ts`

### AssessmentScoringService

**Purpose:** Calculate scores and determine severity levels

**Key Methods:**
- `scoreAssessment(assignedAssessmentId)` - Calculate score using assessment rules
- `getSeverityLevel(assessmentType, score)` - Determine severity level from score

**Location:** `packages/api/src/counsel/assessment-scoring.service.ts`

### AssessmentSchedulingService

**Purpose:** Automated assessment assignment via schedules

**Key Methods:**
- `processScheduledAssessments()` - Cron job (9 AM daily)
- `createSchedule(dto)` - Create new schedule

**Location:** `packages/api/src/counsel/assessment-scheduling.service.ts`

## Configuration

### Environment Variables

No additional environment variables required - uses existing configuration.

### Cron Schedule

Assessment scheduling runs daily at 9 AM server time.

To modify the schedule, update the `@Cron` decorator in `assessment-scheduling.service.ts`:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_9AM)
```

## Clinical Standards

### PHQ-9 References

- Developed by Dr. Robert L. Spitzer et al.
- Public domain
- Widely validated for depression screening
- Source: https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf

### GAD-7 References

- Developed by Dr. Robert L. Spitzer et al.
- Public domain
- Validated for anxiety screening
- Source: https://www.integration.samhsa.gov/clinical-practice/GAD708.19.08Cartwright.pdf

## Best Practices

### For Counselors

1. **Frequency:** Don't over-assess - bi-weekly or monthly is typically sufficient
2. **Context:** Add notes to assignments explaining why the assessment is being given
3. **Follow-up:** Review scores promptly and adjust care plans accordingly
4. **Trends:** Look for patterns over time, not just individual scores
5. **Clinical judgment:** Use assessments to inform, not replace, professional judgment

### For Administrators

1. **Schedules:** Start with conservative frequencies (e.g., monthly) and adjust based on feedback
2. **Target groups:** Consider separate schedules for different member populations
3. **Review data:** Periodically review completion rates and adjust as needed
4. **Training:** Ensure counselors understand how to interpret scores

## Future Enhancements

- [ ] Custom assessment builder UI
- [ ] Graphical score trends over time
- [ ] Comparison charts (member vs population averages)
- [ ] Integration with care plans and interventions
- [ ] Automated workflow rules (e.g., if PHQ-9 > 15, trigger alert)
- [ ] PCL-5 and PSS-10 implementation
- [ ] Multi-language support for assessments
- [ ] Accessibility improvements (screen reader optimization)
- [ ] Mobile app integration
