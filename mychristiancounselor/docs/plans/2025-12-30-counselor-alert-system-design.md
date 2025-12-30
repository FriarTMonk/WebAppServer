# Counselor Alert & Tracking System Design

**Date:** December 30, 2025
**Status:** Initial Design - Ready for Implementation Planning

---

## Executive Summary

A comprehensive counselor support system with five loosely-coupled features connected by a configurable workflow engine. The system enables real-time crisis alerting, longitudinal wellbeing tracking, automated assessments, counselor-assigned tasks, and intelligent automation through configurable rules.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Feature Breakdown](#feature-breakdown)
3. [Architecture Principles](#architecture-principles)
4. [Design Decisions](#design-decisions)
5. [Next Steps](#next-steps)

---

## System Overview

### The Five Features

1. **Crisis Alerting** - High-priority email notifications to assigned counselors when crisis detected
2. **Enhanced Wellbeing Tracking** - Historical status tracking, session summaries, trajectory analysis
3. **Assessment System** - Clinical (PHQ-9, GAD-7) and custom questionnaires with automated scheduling
4. **Counselor Assignments** - Conversation prompts, offline tasks, and guided conversations
5. **Workflow Rules Engine** - Configurable IF-THEN automation connecting all features

### Key Goals

- **Counselor empowerment** - Give counselors tools to proactively support members
- **Early intervention** - Detect and respond to declining wellbeing before crisis
- **Longitudinal tracking** - Measure member progress over time with standardized and custom metrics
- **Intelligent automation** - Reduce manual work while preserving counselor judgment
- **Flexible configuration** - Platform defaults + org overrides + counselor customization

---

## Feature Breakdown

### Feature 1: Crisis Alerting

**Purpose:** Send immediate, high-priority email to assigned counselor when crisis is detected in member conversation.

**Trigger:** Existing `SafetyService.detectCrisis()` returns positive detection.

**Key Decisions:**
- **Timing:** Real-time (immediate email on detection)
- **Recipients:** Assigned counselor only; if no counselor, log only (no email)
- **Email content:** Full detail - member info, crisis type, confidence level, triggering message, link to conversation
- **Priority:** Both `X-Priority: 1` header AND Postmark "crisis" tag
- **Throttling:** 1-hour window per member (prevents alert fatigue from rapid successive messages)

**What Gets Built:**
1. `CrisisAlertService` - Checks for counselor, throttling, triggers email, logs all events
2. Crisis alert email template (HTML + plain text)
3. `CrisisAlertLog` database model - Tracks all detections with/without emails

**Example Flow:**
```
User sends message with suicidal ideation
    ↓
SafetyService.detectCrisis() = true
    ↓
CrisisAlertService.handleCrisisDetected()
    ├─ Check: Does member have assigned counselor? → Yes
    ├─ Check: Last crisis alert sent? → 2 hours ago (outside throttle window)
    ├─ Send email with X-Priority: 1 + "crisis" tag
    └─ Log to CrisisAlertLog (counselor_notified: true)
```

---

### Feature 2: Enhanced Wellbeing Tracking

**Purpose:** Track member wellbeing over time with historical records, trajectory analysis, and session-by-session summaries.

**Current State:**
- `MemberWellbeingStatus` model exists (current status only)
- Nightly AI analysis updates status (green/yellow/red)
- 7-day summary generated
- Manual counselor overrides preserved

**Enhancements Needed:**
1. **Historical tracking** - Keep all status changes over time (not just latest)
2. **Session summaries** - AI summary after each conversation (not just weekly)
3. **Trajectory indicators** - Explicit "improving/stable/declining" flag based on trend

**Key Decisions:**
- Preserve existing nightly analysis (don't break current system)
- Add new `MemberWellbeingHistory` table for longitudinal tracking
- Add `SessionSummary` model for per-conversation summaries
- Trajectory calculation uses both assessment scores and AI analysis

**What Gets Built:**
1. `MemberWellbeingHistory` model - Historical record of all status changes
2. `SessionSummary` model - AI-generated summary per conversation
3. Enhanced `WellbeingAnalysisService` - Calculates trajectory, generates session summaries
4. Trajectory calculation logic (comparing current vs historical status/scores)

**Example Trajectory Logic:**
```
IF last 3 wellbeing statuses = [red, yellow, green] → "improving"
IF last 3 wellbeing statuses = [green, yellow, red] → "declining"
IF last 2 PHQ-9 scores decreased by 5+ → "improving"
ELSE → "stable"
```

---

### Feature 3: Assessment System

**Purpose:** Standardized clinical assessments (PHQ-9, GAD-7) and organization-defined custom questionnaires with automated scheduling and manual assignment.

**Key Decisions:**
- **Assessment types:**
  - Platform-provided clinical (PHQ-9 for depression, GAD-7 for anxiety, etc.)
  - Organization-defined custom (spiritual growth, progress checkpoints, etc.)
- **Assignment:** Automated (scheduled/triggered) with counselor override (manual assignment)
- **Scheduling:** Configurable per assessment (e.g., PHQ-9 every 2 weeks, custom spiritual quarterly)
- **Scoring:** Standardized scoring for clinical, custom scoring rules for org-defined

**What Gets Built:**
1. `Assessment` model - Template for assessments (questions, scoring rules)
2. `AssessmentSchedule` model - Automation rules (who, when, what)
3. `AssignedAssessment` model - Instance assigned to a member
4. `AssessmentResponse` model - Member's answers and calculated scores
5. `AssessmentService` - Create, assign, score, schedule assessments
6. Library of clinical assessments (PHQ-9, GAD-7, PCL-5, etc.)

**Standard Assessments to Include:**
- **PHQ-9** - Depression (9 questions, 0-27 score)
- **GAD-7** - Anxiety (7 questions, 0-21 score)
- **PCL-5** - PTSD (20 questions, 0-80 score)
- **PSS-10** - Perceived Stress (10 questions, 0-40 score)

**Custom Assessment Builder:**
- Organizations can create questionnaires
- Question types: Multiple choice, scale (1-5, 1-10), text, yes/no
- Custom scoring formulas
- Tagging (spiritual, clinical, progress, etc.)

**Example Automation:**
```
Schedule: PHQ-9 every 2 weeks for all assigned members
Trigger: If wellbeing status changes to red → Auto-assign PHQ-9 + GAD-7
```

---

### Feature 4: Counselor Assignments

**Purpose:** Counselors assign tasks, conversation prompts, and guided activities for members to complete.

**Key Decisions:**
- **Assignment types:**
  - **Conversation prompts** - Topics to discuss with AI (e.g., "Talk about forgiveness this week")
  - **Offline tasks** - Activities outside platform (e.g., "Read Psalm 23 daily", "Journal for 10 minutes")
  - **Guided conversations** - Pre-written conversation starters that launch specific AI conversations
- **Flexibility:** All three types supported (counselor chooses per assignment)
- **Tracking:** Members mark tasks complete, AI detects conversation topic completion

**What Gets Built:**
1. `CounselorAssignment` model (NOT to be confused with existing `CounselorAssignment` for counselor-member relationship - need better naming)
   - Rename to `MemberTask` or `CounselorTask` to avoid confusion
2. `MemberTask` model - Tracks assignments given to members
3. Task types: conversation_prompt, offline_task, guided_conversation
4. Completion tracking and verification
5. Task templates library (counselors can create reusable templates)

**Example Assignments:**
```
Type: conversation_prompt
Title: "Discuss forgiveness"
Description: "Have a conversation with the AI about forgiving someone who hurt you"
Due: 1 week
Completion: AI detects "forgiveness" topic in conversation

Type: offline_task
Title: "Daily Bible reading"
Description: "Read Psalm 23 each morning this week"
Due: 1 week
Completion: Member manually marks complete

Type: guided_conversation
Title: "Prayer life reflection"
Description: Pre-written prompts guide member through prayer habits
Due: 3 days
Completion: Conversation completed
```

---

### Feature 5: Workflow Rules Engine

**Purpose:** Configurable IF-THEN automation that connects all features intelligently while keeping code loosely coupled.

**Key Decisions:**
- **Tiered configuration:**
  - **Platform-level** - Default rules (developers define, same for all orgs)
  - **Organization-level** - Org admins override or add rules
  - **Counselor-level** - Individual counselors customize per member
- **Event-driven** - Features publish events, workflow engine subscribes and evaluates rules
- **Non-blocking** - Rules execute asynchronously (don't slow down user experience)

**Example Rules:**

```yaml
# Platform Default Rules
rules:
  - name: "Crisis → PHQ-9"
    trigger:
      event: "crisis_detected"
    conditions:
      - has_assigned_counselor: true
    actions:
      - send_crisis_alert_email
      - auto_assign_assessment: "PHQ-9"
      - log_event: "crisis_alert_log"

  - name: "Declining wellbeing → Check-in"
    trigger:
      event: "wellbeing_status_changed"
      from: "yellow"
      to: "red"
    actions:
      - auto_assign_task: "check_in_conversation"
      - notify_counselor: "Member wellbeing declined"

  - name: "PHQ-9 improving → Update trajectory"
    trigger:
      event: "assessment_completed"
      assessment_type: "PHQ-9"
    conditions:
      - score_decreased_by: 5
    actions:
      - update_trajectory: "improving"
      - notify_counselor: "Member showing improvement"

# Organization Override Example
organization_rules:
  org_id: "abc-123"
  rules:
    - name: "Weekly spiritual check"
      trigger:
        schedule: "weekly"
        day: "Sunday"
      conditions:
        - member_type: "all_assigned"
      actions:
        - auto_assign_assessment: "org_spiritual_growth_v2"
```

**What Gets Built:**
1. `WorkflowRule` model - Stores rules (platform, org, counselor levels)
2. `WorkflowExecution` model - Logs rule executions for debugging
3. `WorkflowEngineService` - Evaluates rules, triggers actions
4. Event system integration - Subscribe to all relevant events
5. Rule builder UI (admin/counselor interface)

**Events Published by Features:**
- `crisis_detected` (Feature 1)
- `wellbeing_status_changed` (Feature 2)
- `wellbeing_trajectory_changed` (Feature 2)
- `assessment_completed` (Feature 3)
- `assessment_score_changed` (Feature 3)
- `task_completed` (Feature 4)
- `task_overdue` (Feature 4)

---

## Architecture Principles

### 1. Loose Coupling

Each feature operates independently:
- No direct dependencies between features
- Communication via events only
- Features can be deployed/updated independently

**Example:**
```typescript
// ❌ BAD (tight coupling)
class CrisisAlertService {
  constructor(
    private assessmentService: AssessmentService,
    private wellbeingService: WellbeingService
  ) {}

  async handleCrisis(memberId: string) {
    await this.sendEmail(memberId);
    await this.assessmentService.assignPHQ9(memberId); // Direct dependency
    await this.wellbeingService.logEvent(memberId);    // Direct dependency
  }
}

// ✅ GOOD (loose coupling)
class CrisisAlertService {
  constructor(private eventEmitter: EventEmitter) {}

  async handleCrisis(memberId: string) {
    await this.sendEmail(memberId);
    this.eventEmitter.emit('crisis_detected', { memberId }); // Emit event only
  }
}
```

### 2. Event-Driven Integration

Features publish events, workflow engine handles coordination:
- Async, non-blocking
- Easy to add new rules without code changes
- Testable in isolation

**Event Flow:**
```
User Action
    ↓
Feature Service (publishes event)
    ↓
Event Bus
    ↓
Workflow Engine (evaluates rules)
    ↓
Actions (email, assign assessment, etc.)
```

### 3. Configuration Hierarchy

Three levels of configuration with clear precedence:

```
Platform Defaults
    ↓ (org can override)
Organization Rules
    ↓ (counselor can override)
Counselor-Specific Rules
```

**Merge Logic:**
- Counselor rules take precedence
- Org rules override platform defaults
- Rules can be "disabled" at lower levels without deletion

### 4. Extensibility

System designed for future growth:
- New event types easily added
- New assessment types plug in
- New workflow actions without code changes
- Custom integrations possible (webhooks, external APIs)

---

## Design Decisions

### Crisis Alerting

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **When to alert** | Real-time | Crisis requires immediate attention |
| **Who gets alerted** | Assigned counselor only | Avoid overwhelming org admins |
| **No counselor fallback** | Log only | Members without counselors are intentional; log for monitoring |
| **Email detail level** | Full context | Counselor needs crisis type, message, confidence to assess urgency |
| **Priority marking** | X-Priority header + Postmark tag | Both for client display and tracking |
| **Throttling** | 1 hour per member | Prevent alert fatigue from rapid messages |

### Wellbeing Tracking

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Historical storage** | All status changes | Enable longitudinal analysis |
| **Session summaries** | After each conversation | More granular than weekly summaries |
| **Trajectory calculation** | Combined (status + scores) | More accurate than single metric |
| **Preserve existing** | Keep nightly analysis | Don't break current system |

### Assessment System

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Assessment types** | Clinical + custom | Platform provides standards, orgs customize |
| **Assignment method** | Automated + manual override | Automation ensures consistency, counselor judgment preserved |
| **Scheduling** | Per-assessment configuration | Different assessments need different cadences |
| **Custom builder** | Full featured | Orgs have unique needs we can't predict |

### Counselor Assignments

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Assignment types** | All 3 (prompts, tasks, guided) | Different counseling styles need different tools |
| **Naming** | Rename to `MemberTask` | Avoid confusion with counselor-member assignment relationship |
| **Completion tracking** | AI detection + manual | Conversation prompts auto-detect, offline tasks manual |
| **Templates** | Reusable library | Counselors don't want to recreate common assignments |

### Workflow Engine

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Configuration levels** | Tiered (platform/org/counselor) | Flexibility with sensible defaults |
| **Integration approach** | Event-driven | Loose coupling, extensibility |
| **Execution** | Async, non-blocking | Don't slow user experience |
| **Rule format** | YAML-like declarative | Easy to understand, version control friendly |

---

## Data Models Summary

### New Models to Create

1. **CrisisAlertLog**
   - Tracks all crisis detections
   - Fields: memberId, counselorId, crisisType, confidence, messageId, emailSent, throttled, createdAt

2. **MemberWellbeingHistory**
   - Historical record of wellbeing status changes
   - Fields: memberId, status, trajectory, summary, overriddenBy, createdAt

3. **SessionSummary**
   - AI-generated summary per conversation
   - Fields: sessionId, memberId, summary, topics, sentiment, createdAt

4. **Assessment** (template)
   - Master template for assessments
   - Fields: id, name, type, questions (JSON), scoringRules (JSON), createdBy, isActive

5. **AssessmentSchedule**
   - Automation rules for assessments
   - Fields: assessmentId, targetType (all/role/individual), schedule, triggers

6. **AssignedAssessment**
   - Instance assigned to member
   - Fields: assessmentId, memberId, assignedBy, dueDate, completedAt, status

7. **AssessmentResponse**
   - Member's answers and scores
   - Fields: assignedAssessmentId, answers (JSON), score, completedAt

8. **MemberTask** (renamed from CounselorAssignment)
   - Tasks assigned by counselors
   - Fields: memberId, counselorId, type, title, description, dueDate, completedAt, status

9. **WorkflowRule**
   - Automation rules
   - Fields: name, level (platform/org/counselor), trigger, conditions, actions, priority, isActive

10. **WorkflowExecution**
    - Audit log of rule executions
    - Fields: ruleId, triggeredBy, actions, success, error, executedAt

---

## Next Steps

### Immediate Actions

1. **Validate this design** - Review with stakeholders for approval
2. **Create detailed implementation plan** - Break into sprint-sized tasks
3. **Database schema design** - Detailed Prisma schema for all new models
4. **API endpoint design** - RESTful routes for each feature
5. **UI/UX wireframes** - Counselor dashboard, assessment builder, rule configurator

### Implementation Order (Recommended)

**Phase 1: Foundation (2-3 weeks)**
- Crisis alerting (simplest, highest value)
- Database models for all features
- Event system infrastructure

**Phase 2: Tracking & Assessments (3-4 weeks)**
- Enhanced wellbeing tracking
- Assessment system (clinical library first, custom builder later)

**Phase 3: Assignments & Automation (3-4 weeks)**
- Counselor assignments (MemberTask)
- Workflow engine basics
- Platform default rules

**Phase 4: Configuration & Polish (2-3 weeks)**
- Organization rule overrides
- Counselor customization
- Admin UIs for configuration
- Analytics and reporting

### Technical Considerations

**Scaling:**
- Event queue (Bull/BullMQ) for async processing
- Redis caching for rule evaluation
- Database indexing on memberId, counselorId, timestamps

**Security:**
- HIPAA compliance for all crisis logs
- Role-based access to assessment responses
- Audit trails for rule changes

**Testing:**
- Unit tests for each service
- Integration tests for workflow engine
- End-to-end tests for critical paths (crisis detection → email)

**Monitoring:**
- Alert delivery rates
- Workflow execution success rates
- Assessment completion rates
- Email open/click tracking

---

## Open Questions

1. **Crisis alert escalation** - If counselor doesn't respond within X hours, escalate to org admin?
2. **Assessment reminders** - Email reminders for overdue assessments?
3. **Bulk operations** - Can counselors assign assessments/tasks to multiple members at once?
4. **Mobile push notifications** - In addition to email for crisis alerts?
5. **Third-party integrations** - Export assessment data to external EHR systems?
6. **Internationalization** - Clinical assessments need validated translations?

---

## Appendix: Current System Context

### Existing Infrastructure We're Building On

- **Email:** Postmark integration (`EmailService`)
- **Counselor assignments:** `CounselorAssignment` model (counselor-member relationship)
- **Crisis detection:** `SafetyService.detectCrisis()` (AI + pattern matching)
- **Topic extraction:** `CounselingAiService.extractTheologicalThemes()` (keyword-based)
- **Wellbeing analysis:** Nightly AI analysis via `WellbeingAnalysisService`
- **Notifications:** `Notification` model exists but unused (opportunity for in-app alerts)

### Key Files to Modify

- `/packages/api/src/counsel/counsel-processing.service.ts` - Add crisis alert trigger
- `/packages/api/src/counsel/wellbeing-analysis.service.ts` - Add trajectory calculation
- `/packages/api/prisma/schema.prisma` - Add all new models
- `/packages/api/src/email/templates/` - Add crisis alert template

### Key Files to Create

- `/packages/api/src/counsel/crisis-alert.service.ts`
- `/packages/api/src/counsel/assessment.service.ts`
- `/packages/api/src/counsel/member-task.service.ts`
- `/packages/api/src/workflow/workflow-engine.service.ts`
- `/packages/api/src/workflow/workflow-rule.service.ts`

---

**End of Design Document**
