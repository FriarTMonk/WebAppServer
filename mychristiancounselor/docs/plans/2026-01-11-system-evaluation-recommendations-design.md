# System Evaluation High-Priority Recommendations - Design Document

**Date**: January 11, 2026
**Based On**: System Evaluation (January 10, 2026)
**Implementation Approach**: Sequential phases on master branch

---

## Executive Summary

This design implements all 5 high-priority recommendations from the January 10, 2026 system evaluation. Each phase is independently deployable and delivers immediate value to users.

**Phases Overview:**
1. **Charting Library Integration** (2-3 weeks) - Comprehensive visual analytics with Recharts
2. **Workflow Rule Creation UI** (2-3 weeks) - Wizard-based builder for counselor automation
3. **Real-Time Dashboard Enhancements** (1 week) - Browser notifications for queue monitoring
4. **Scheduled Campaign Execution** (1 week) - Cron job for automatic marketing campaigns
5. **Security & Compliance** (2 weeks) - Optional 2FA (TOTP/Email) + compliance docs

**Total Timeline**: 8-10 weeks

---

## Technology Stack Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Charting | Recharts | React 19 compatible, TypeScript native, declarative API |
| Workflow UI | Wizard pattern | Matches existing Custom Assessment Builder UX |
| Notifications | Browser API | No email fatigue, in-context alerts for admins |
| Scheduling | node-cron | Simple, reliable, no new infrastructure |
| 2FA (TOTP) | speakeasy + qrcode | Industry standard TOTP implementation |
| 2FA (Email) | Existing EmailService | Reuse email infrastructure |

---

## Phase 1: Charting Library Integration

### Goal
Install Recharts and implement comprehensive visual analytics across all platform areas (~20-25 chart types).

### Duration
2-3 weeks

### Chart Implementation Areas

#### 1. Member Experience (Wellness Tracking)
**Location**: `/wellness`, member dashboard

**Charts**:
- Mood trends line chart (7-day, 30-day, 90-day views)
- Sleep quality bar chart with duration overlay
- Exercise frequency chart
- Multi-metric correlation chart (mood + sleep + exercise)
- Weekly summary dashboard with small sparklines

**Data Sources**:
- `WellnessLog` model (mood, sleep, exercise, prayer)
- Aggregated by day/week/month

#### 2. Counselor Experience (Member Progress)
**Location**: `/counsel/members/[id]`

**Charts**:
- PHQ-9 score trends (line chart, clinical thresholds highlighted)
- GAD-7 score trends (line chart, clinical thresholds highlighted)
- Custom assessment score trends (multi-series line chart)
- Task completion rate pie chart
- Assessment completion rate pie chart
- Session frequency bar chart (sessions per week/month)

**Data Sources**:
- `AssessmentResult` model
- `Task` model
- `Conversation` model

#### 3. Admin Experience (Platform Metrics)
**Location**: `/admin`, `/admin/evaluation/costs`

**Charts**:
- Cost analytics: Total spend trend line chart (Phase 4 feature)
- Cost by model pie chart (Sonnet/Opus/Haiku breakdown)
- Evaluation volume bar chart (daily/weekly/monthly)
- Email health: Delivery/bounce/open rates (multi-series line)
- Sales pipeline value trend (line chart)
- User growth chart (new signups over time)
- Subscription MRR/ARR trends

**Data Sources**:
- `EvaluationCostLog` model
- `EmailLog` model
- `SalesOpportunity` model
- `User` model (growth metrics)
- `Subscription` model (MRR/ARR)

#### 4. Marketing Analytics
**Location**: `/admin/marketing/campaigns`

**Charts**:
- Campaign funnel visualization (horizontal bar chart: sent → delivered → opened → clicked → replied → converted)
- Campaign performance comparison (grouped bar chart)
- Conversion rate trends (line chart)
- Lead source effectiveness (pie chart)

**Data Sources**:
- `EmailCampaignRecipient` model
- `SalesOpportunity` model (lead source)

#### 5. Sales Analytics
**Location**: `/admin/sales`

**Charts**:
- Pipeline by stage (stacked bar chart)
- Deal velocity chart (average days to close over time)
- Win rate trends (line chart)
- Rep performance comparison (grouped bar chart)

**Data Sources**:
- `SalesOpportunity` model
- `SalesActivity` model

### Technical Implementation

**Installation**:
```bash
cd packages/web
npm install recharts
```

**Component Pattern**:
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  value: number;
}

export function MoodTrendChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Shared Components**:
- `packages/web/src/components/charts/` directory
- Reusable chart components with consistent styling
- Responsive containers for all chart types
- Loading states and empty state handling

### API Endpoints (New)
- `GET /api/counsel/members/:id/charts/assessments` - Assessment trends data
- `GET /api/wellness/charts/trends` - Wellness trends data
- `GET /api/admin/charts/costs` - Cost analytics data
- `GET /api/admin/charts/platform-metrics` - Platform-wide metrics
- `GET /api/admin/marketing/charts/campaigns` - Campaign analytics
- `GET /api/admin/sales/charts/pipeline` - Sales pipeline data

### Testing Strategy
- Visual regression testing for chart rendering
- Data transformation unit tests
- Responsive layout tests (mobile/tablet/desktop)
- Empty state and error state tests

---

## Phase 2: Workflow Rule Creation UI

### Goal
Build wizard-based UI for counselors to create workflow automation rules without backend changes.

### Duration
2-3 weeks

### Wizard Structure (5 Steps)

#### Step 1: Basic Information
**Fields**:
- Name (required, 3-100 chars)
- Description (optional, textarea, max 500 chars)
- Organization scope (auto-set, display-only)
- Active toggle (default: true)

**Validation**:
- Name uniqueness within organization
- Character limits enforced

#### Step 2: Select Trigger
**Trigger Types** (dropdown with 8 options):

1. **Assessment Completed**
   - Description: "Triggers when a member completes any assessment"
   - JSON: `{ "event": "assessment_completed" }`

2. **Score Threshold Exceeded**
   - Description: "Triggers when assessment score exceeds a threshold"
   - JSON: `{ "event": "assessment_completed", "scoreThreshold": true }`

3. **Task Overdue**
   - Description: "Triggers when a task passes its due date"
   - JSON: `{ "event": "task_overdue" }`

4. **Conversation Stale**
   - Description: "Triggers when no counselor response in X days"
   - JSON: `{ "event": "conversation_stale" }`

5. **Wellness Pattern Detected**
   - Description: "Triggers when AI detects wellness trend"
   - JSON: `{ "event": "wellness_pattern" }`

6. **Crisis Keyword**
   - Description: "Triggers when specific words detected in conversation"
   - JSON: `{ "event": "crisis_keyword" }`

7. **Member Inactive**
   - Description: "Triggers when member hasn't logged in for X days"
   - JSON: `{ "event": "member_inactive" }`

8. **Subscription Expiring**
   - Description: "Triggers X days before subscription renewal"
   - JSON: `{ "event": "subscription_expiring" }`

**UI**:
- Dropdown selection
- Help text with example use case for each trigger
- JSON preview (collapsible, read-only)

#### Step 3: Configure Conditions
**Dynamic form based on selected trigger:**

**For "Assessment Completed":**
- Assessment type dropdown (PHQ-9, GAD-7, or custom assessment list)
- Optional: Score range (min-max)

**For "Score Threshold Exceeded":**
- Assessment type dropdown
- Comparison operator (>, >=, <, <=, =)
- Threshold value (0-100)

**For "Task Overdue":**
- Days overdue threshold (1-90 days)
- Optional: Task type filter

**For "Conversation Stale":**
- Days without response (1-30 days)

**For "Wellness Pattern Detected":**
- Pattern type: declining_mood, poor_sleep, reduced_exercise
- Severity: low, medium, high

**For "Crisis Keyword":**
- Keyword list (comma-separated)
- Match type: any/all keywords

**For "Member Inactive":**
- Days inactive (1-90 days)

**For "Subscription Expiring":**
- Days before expiration (1-30 days)

**Validation**:
- Required fields per trigger type
- Numeric range validation
- JSON preview updates in real-time

#### Step 4: Add Actions (Repeatable)
**Action limit**: 1-10 actions per workflow

**Action Types** (dropdown with 6 options):

1. **Send Email**
   - Recipient: member / counselor / admin / organization admin
   - Template selection (dropdown of email templates)
   - Optional: Custom subject line
   - JSON: `{ "type": "send_email", "to": "member", "template": "high_depression_alert" }`

2. **Create Task**
   - Task type: assessment / homework / reading / custom
   - Due date offset: "in X days" (1-90)
   - Priority: low / medium / high
   - Note to member (optional, textarea)
   - JSON: `{ "type": "assign_task", "taskType": "assessment", "dueDate": "in_7_days", "priority": "high" }`

3. **Update Status**
   - Status field: member priority / flag
   - New value: dropdown based on field type
   - JSON: `{ "type": "update_status", "field": "priority", "value": "high" }`

4. **Trigger Alert**
   - Severity: low / medium / high / critical
   - Reason (textarea, required)
   - JSON: `{ "type": "create_crisis_alert", "severity": "high", "reason": "PHQ-9 score indicates severe depression" }`

5. **Assign Counselor**
   - Counselor selection (dropdown of org counselors)
   - Optional: Reassignment reason
   - JSON: `{ "type": "assign_counselor", "counselorId": "uuid", "reason": "Escalation to senior counselor" }`

6. **Log Event**
   - Event type (text input)
   - Details (JSON textarea)
   - JSON: `{ "type": "log_event", "eventType": "workflow_triggered", "details": {...} }`

**UI Features**:
- Add Action button (repeatable)
- Drag handle to reorder actions
- Remove action button (X)
- Each action in a collapsible card
- JSON preview for entire actions array

#### Step 5: Review & Activate
**Display sections**:
1. Basic information summary
2. Trigger summary (plain English + JSON preview)
3. Conditions summary (plain English + JSON preview)
4. Actions list (plain English + JSON preview for each)
5. Complete JSON preview (collapsible, copy button)

**Actions**:
- Test Workflow button (validates without saving, shows what would happen)
- Save as Inactive checkbox
- Create Workflow button (saves and redirects)

**Validation**:
- All required fields completed
- At least one action defined
- JSON structure valid

### Technical Implementation

**Component Structure**:
```
packages/web/src/components/workflow/
├── WorkflowWizard.tsx (main wizard orchestrator)
├── Step1BasicInfo.tsx
├── Step2SelectTrigger.tsx
├── Step3ConfigureConditions.tsx
├── Step4AddActions.tsx
├── Step5ReviewActivate.tsx
└── shared/
    ├── ActionCard.tsx
    ├── ConditionForm.tsx
    └── JsonPreview.tsx
```

**State Management**:
```typescript
interface WorkflowWizardState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  trigger: TriggerConfig;
  conditions: ConditionConfig;
  actions: ActionConfig[];
  isActive: boolean;
}
```

**Backend Integration**:
- Endpoint: `POST /api/counsel/workflows` (existing)
- Service: `WorkflowRuleService.create()` (existing, no changes)
- Validation: Use existing backend validation

**Permissions**:
- Route guard: `@UseGuards(JwtAuthGuard)`
- Counselors: Create workflows for their organization
- Org Admins: Create + view all org workflows
- Platform Admins: Create + view all workflows

### Testing Strategy
- Wizard navigation (next/previous, validation blocks)
- JSON generation accuracy per trigger/condition/action
- Backend integration (create, validate, activate)
- Permission-based access control

---

## Phase 3: Real-Time Dashboard Enhancements

### Goal
Enhance existing queue monitoring page with browser notifications and real-time alerts (no email).

### Duration
1 week

### Enhancements to `/admin/evaluation/queue`

#### 1. Browser Notification Integration

**Permission Request**:
- On page load: Check `Notification.permission`
- If `"default"`: Show in-app prompt with explanation
- If `"granted"`: Enable notifications
- If `"denied"`: Show warning (cannot enable without browser settings change)
- Store preference in localStorage

**Critical Events for Notifications**:
1. **Queue failures spike**: >10 failed jobs in 5 minutes
   - Title: "Queue Alert: Multiple Failures"
   - Body: "10+ evaluations failed in the last 5 minutes"
   - Icon: Error icon
   - Click: Focus tab and scroll to failed jobs

2. **Queue stalled**: No active jobs for 15+ minutes while waiting jobs exist
   - Title: "Queue Alert: Processing Stalled"
   - Body: "Queue has been idle for 15 minutes with pending jobs"
   - Icon: Warning icon
   - Click: Focus tab and show queue status

3. **Max retries reached**: Individual job failed 3+ times
   - Title: "Evaluation Failed (Max Retries)"
   - Body: "Book evaluation [ID] failed after 3 attempts"
   - Icon: Error icon
   - Click: Focus tab and show job details

4. **Queue manually paused**: Another admin paused the queue
   - Title: "Queue Paused by Admin"
   - Body: "Evaluation queue paused by [Admin Name]"
   - Icon: Info icon
   - Click: Focus tab

**Implementation**:
```typescript
function sendBrowserNotification(title: string, body: string, data: any) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      tag: data.tag, // Replaces notification with same tag
      requireInteraction: data.critical, // Stays until dismissed
      data,
    });

    notification.onclick = () => {
      window.focus();
      // Navigate to relevant section
      handleNotificationClick(data);
    };
  }
}
```

#### 2. Enhanced Real-Time Monitoring

**Polling Improvements**:
- Upgrade from 5-second to 3-second polling when tab is active
- Reduce to 10-second polling when tab is inactive (visibility API)
- Stop polling when queue is empty and idle for 30+ minutes

**Visual Indicators**:
- Pulsing green dot when queue is actively processing
- Red alert badge for failed jobs count
- Yellow warning badge for approaching issues (long wait times)
- Gray indicator when queue is paused

**Sound Alerts** (Optional):
- Toggle in UI (off by default)
- localStorage preference
- Sound on critical failures only
- Uses Web Audio API (short beep, non-intrusive)

#### 3. Queue Health Dashboard Widget

**New section at top of page:**

**Health Status Badge**:
- **Healthy** (green): Active jobs processing, failure rate <5%
- **Degraded** (yellow): Slow processing (>5 min per job), failure rate 5-15%
- **Critical** (red): Stalled or failure rate >15%

**Metrics Display**:
```
┌─────────────────────────────────────────────────────────┐
│ Queue Health: [● Healthy]                    [⚙️ Settings] │
├─────────────────────────────────────────────────────────┤
│ Processing Rate: 12 jobs/min                            │
│ Est. Time to Clear: 8 minutes (95 waiting jobs)         │
│ 24h Failure Rate: 2.3% [Sparkline chart]               │
│ Last Update: 3 seconds ago                              │
└─────────────────────────────────────────────────────────┘
```

**Sparkline Chart** (using Recharts from Phase 1):
- Mini line chart (100px width × 30px height)
- Last 24 hours failure rate
- Hover tooltip with exact time and rate

#### 4. Auto-Refresh Controls

**Controls added to page header:**
```
[🔄 Auto-refresh: ON] [Interval: 3s ▼] [⏸️ Pause]
```

**Interval Selector Dropdown**:
- 3 seconds (default for active monitoring)
- 5 seconds (balanced)
- 10 seconds (reduced frequency)
- 30 seconds (minimal)
- Manual only (off)

**Visual Countdown**:
- Circular progress indicator showing time until next refresh
- Example: "Next refresh in 2s"

**Pause/Resume**:
- Pause button stops auto-refresh
- Resume button restarts with selected interval
- State persists in localStorage

#### 5. Browser Tab Title Updates

**Document Title Pattern**:
```
When tab is active:
  "Queue Monitor - MyChristianCounselor"

When tab is inactive:
  "(5F, 12W) Queue Monitor"

Where:
  F = Failed jobs count
  W = Waiting jobs count
```

**Implementation**:
```typescript
useEffect(() => {
  if (document.hidden) {
    document.title = `(${failedCount}F, ${waitingCount}W) Queue Monitor`;
  } else {
    document.title = 'Queue Monitor - MyChristianCounselor';
  }
}, [document.hidden, failedCount, waitingCount]);
```

### Technical Implementation

**Browser APIs**:
- Notification API: `new Notification()`
- Page Visibility API: `document.hidden`, `visibilitychange` event
- Web Audio API: `AudioContext` for sound alerts
- LocalStorage: User preferences

**No Backend Changes**:
- Uses existing endpoints:
  - `GET /api/admin/evaluation/queue/status`
  - `GET /api/admin/evaluation/queue/jobs`

**Component Updates**:
- `packages/web/src/app/admin/evaluation/queue/page.tsx`
- New components:
  - `QueueHealthWidget.tsx`
  - `NotificationSettings.tsx`
  - `AutoRefreshControls.tsx`

### Testing Strategy
- Notification permission flow (grant/deny/default)
- Polling interval changes
- Sound alerts (user preference)
- Tab visibility state changes
- localStorage persistence

---

## Phase 4: Scheduled Campaign Execution

### Goal
Implement automatic execution of scheduled marketing campaigns using cron job.

### Duration
1 week

### Cron Job Architecture

#### 1. Campaign Scheduler Service

**File**: `packages/api/src/marketing/services/campaign-scheduler.service.ts`

**Responsibilities**:
- Run every 5 minutes
- Find campaigns due for execution
- Execute campaigns via existing service
- Handle errors gracefully

**Implementation**:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignService } from './campaign.service';

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private campaignService: CampaignService,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async executeScheduledCampaigns() {
    this.logger.log('Checking for scheduled campaigns...');

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const campaigns = await this.prisma.emailCampaign.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now, // Due now or in the past
          gte: tenMinutesAgo, // Safety: not older than 10 minutes
        },
      },
    });

    if (campaigns.length === 0) {
      this.logger.log('No campaigns due for execution');
      return;
    }

    this.logger.log(`Found ${campaigns.length} campaigns to execute`);

    for (const campaign of campaigns) {
      try {
        await this.executeCampaign(campaign.id);
      } catch (error) {
        this.logger.error(
          `Failed to execute campaign ${campaign.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async executeCampaign(campaignId: string) {
    // Update status to prevent duplicate execution
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    try {
      // Execute via existing service
      const result = await this.campaignService.executeCampaign(campaignId);

      // Update status based on result
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: result.success ? 'sent' : 'failed',
          sentAt: result.success ? new Date() : null,
        },
      });

      this.logger.log(
        `Campaign ${campaignId} executed: ${result.queued} emails sent`,
      );
    } catch (error) {
      // Mark as failed
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }
}
```

#### 2. Cron Integration

**Install dependency**:
```bash
cd packages/api
npm install @nestjs/schedule
```

**Register in MarketingModule**:
```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CampaignSchedulerService } from './services/campaign-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron
  ],
  providers: [
    CampaignService,
    CampaignSchedulerService, // Register scheduler
  ],
})
export class MarketingModule {}
```

#### 3. Execution Safety

**Distributed Lock** (if multiple API instances):
```typescript
import { RedisService } from '../../redis/redis.service';

async executeScheduledCampaigns() {
  const lockKey = 'campaign-scheduler-lock';
  const lockTTL = 300; // 5 minutes

  // Try to acquire lock
  const acquired = await this.redis.set(lockKey, '1', 'NX', 'EX', lockTTL);

  if (!acquired) {
    this.logger.log('Another instance is executing campaigns, skipping');
    return;
  }

  try {
    // Execute campaigns
    await this.executeCampaignsInternal();
  } finally {
    // Release lock
    await this.redis.del(lockKey);
  }
}
```

**Idempotency**:
- Check `status = 'scheduled'` before execution
- Atomic update to `'sending'` prevents duplicate execution
- 10-minute safety window prevents re-processing stale campaigns

**Error Handling**:
- Campaign-level try-catch (one failure doesn't block others)
- Failed campaigns marked as `'failed'`
- Error logged with stack trace
- No automatic retry (requires manual admin intervention)

#### 4. Admin Visibility

**Scheduled Campaigns Section** (add to `/admin/marketing/campaigns`):

```
┌─────────────────────────────────────────────────────────┐
│ Upcoming Scheduled Campaigns (Next 24 Hours)            │
├─────────────────────────────────────────────────────────┤
│ Campaign Name          Scheduled For      Recipients    │
│ Spring Outreach        Jan 12, 2:00 PM    45           │
│ Trial Follow-up        Jan 12, 4:30 PM    12           │
│ Q1 Newsletter          Jan 13, 9:00 AM    178          │
└─────────────────────────────────────────────────────────┘
```

**Execution Log Section**:
```
┌─────────────────────────────────────────────────────────┐
│ Recent Executions (Last 100)                            │
├─────────────────────────────────────────────────────────┤
│ Campaign Name      Executed At        Status   Sent     │
│ Winter Event       Jan 11, 10:05 AM   ✓ Sent   34       │
│ Demo Follow-up     Jan 11, 9:00 AM    ✓ Sent   8        │
│ Fall Newsletter    Jan 10, 3:05 PM    ✗ Failed 0        │
└─────────────────────────────────────────────────────────┘
```

**Manual Trigger Button**:
- "Execute Now" button on scheduled campaigns
- Confirmation dialog: "Execute [Campaign Name] immediately?"
- Calls existing `POST /api/admin/marketing/campaigns/:id/execute`
- Updates `scheduledFor` to now and lets cron pick it up

#### 5. Campaign Validation

**At Schedule Time** (preview):
- Validate 90-day cooldown for all recipients
- Return: `{ eligible: X, ineligible: Y, reasons: [...] }`
- Show warning if many ineligible

**At Execution Time** (double-check):
- Re-validate 90-day cooldown
- Skip ineligible recipients
- Log skipped recipients with reasons
- Only send to eligible recipients

### Technical Implementation

**Database Model** (no changes needed):
```prisma
model EmailCampaign {
  id           String    @id @default(uuid())
  name         String
  subject      String
  htmlBody     String    @db.Text
  textBody     String    @db.Text
  status       String    // draft, scheduled, sending, sent, failed, cancelled
  scheduledFor DateTime?
  sentAt       DateTime?
  // ... rest of fields
}
```

**New API Endpoints**:
- `GET /api/admin/marketing/campaigns/scheduled` - List upcoming campaigns
- `GET /api/admin/marketing/campaigns/execution-log` - Recent executions

**Existing Endpoints** (reused):
- `POST /api/admin/marketing/campaigns/:id/execute` - Manual trigger

### Testing Strategy
- Cron execution timing (mock clock)
- Distributed lock behavior (multiple instances)
- Failure handling (campaign-level isolation)
- 90-day cooldown validation at execution time
- Manual trigger flow

---

## Phase 5: Security & Compliance

### Goal
Implement optional 2FA (TOTP or Email) with gentle encouragement, plus create HIPAA/GDPR compliance documentation.

### Duration
2 weeks

---

## Part A: Two-Factor Authentication (Optional 2FA)

### Two-Tier 2FA Approach

**Tier 1 (Recommended)**: Authenticator App (TOTP)
- Setup once, use forever
- Works offline
- 30-second rotating codes
- Most secure option

**Tier 2 (Always Available)**: Email Verification
- No setup required
- 6-digit code sent every login
- Works on any device
- Convenient for less technical users

### User States

**State A: No 2FA** (`twoFactorEnabled = false`)
- Login: Email + Password only
- See encouragement banner every 9 days
- Fully functional, no restrictions

**State B: Email 2FA** (`twoFactorEnabled = true`, `twoFactorMethod = "email"`)
- Login: Email + Password → Email code verification
- See upgrade banner every 9 days (encourage authenticator app)

**State C: Authenticator App (TOTP)** (`twoFactorEnabled = true`, `twoFactorMethod = "totp"`)
- Login: Email + Password → TOTP code from app
- No banners (fully secured)
- Optional backup codes for lost device

### Database Schema

**Migration**: `packages/api/prisma/migrations/YYYYMMDDHHMMSS_add_two_factor_auth/migration.sql`

```prisma
model User {
  // ... existing fields ...

  // 2FA fields
  twoFactorEnabled       Boolean   @default(false)
  twoFactorMethod        String?   // "email" or "totp"
  twoFactorSecret        String?   // Encrypted TOTP secret (only for TOTP users)
  twoFactorBackupCodes   String[]  // Encrypted backup codes (only for TOTP users)
  twoFactorEnabledAt     DateTime?

  // Email code (for email 2FA users)
  emailVerificationCode     String?   // 6-digit code
  emailCodeExpiresAt        DateTime?
  emailCodeUsedAt           DateTime? // Single-use enforcement

  // Banner tracking
  lastSecurityBannerShown   DateTime?
  deploymentBannerDismissed Boolean   @default(false)

  @@index([twoFactorEnabled, twoFactorMethod])
}
```

### Initial Deployment Banner (One-Time)

**Display**: On first login after deployment, before dismissal

```
╔═══════════════════════════════════════════════════════════╗
║ [!] Enhanced Security Now Available                       ║
╠═══════════════════════════════════════════════════════════╣
║ Two-factor authentication is now available to protect     ║
║ your account and comply with HIPAA security standards.    ║
║                                                            ║
║ Choose the option that works best for you:                ║
║                                                            ║
║ • Authenticator App (Recommended)                         ║
║   Most secure, works offline, faster login                ║
║                                                            ║
║ • Email Verification                                      ║
║   Convenient, works on any device, no setup required      ║
║                                                            ║
║ [Set Up 2FA]  [Remind Me Later]                    [×]    ║
║                                                            ║
║ Note: Dismissing this banner will show reminders every    ║
║ 9 days. You can enable 2FA anytime in your profile.       ║
╚═══════════════════════════════════════════════════════════╝
```

**Actions**:
- **Set Up 2FA**: Redirect to Profile → Security → Choose 2FA method
- **Remind Me Later**: Dismiss banner, set `deploymentBannerDismissed = true`, show again in 9 days
- **[×]**: Same as "Remind Me Later"

### Login Flows

#### State A: No 2FA Enabled

```
┌─────────────────────────────────┐
│ Email: [user@example.com]      │
│ Password: [••••••••••]         │
│ [Log In]                        │
└─────────────────────────────────┘
           ↓
    Credentials valid?
           ↓ Yes
    Grant access immediately
```

#### State B: Email 2FA

```
┌─────────────────────────────────┐
│ Email: [user@example.com]      │
│ Password: [••••••••••]         │
│ [Log In]                        │
└─────────────────────────────────┘
           ↓
    Credentials valid?
           ↓ Yes
    Generate 6-digit code
    Send email with code
           ↓
┌─────────────────────────────────┐
│ Check your email for a          │
│ verification code.              │
│                                 │
│ Code: [______]                  │
│ [Verify]                        │
│                                 │
│ [Resend Code] [Back to Login]  │
└─────────────────────────────────┘
           ↓
    Validate code
           ↓ Valid
    Grant access
```

**Email Code Details**:
- 6-digit numeric (easy to type)
- Single-use only
- Expires in 30 minutes
- Max 3 resends per hour (throttling)
- Email subject: "Your MyChristianCounselor Verification Code"

**Email Template**:
```
Subject: Your MyChristianCounselor Verification Code

Hi [Name],

Your verification code is: 847293

This code will expire in 30 minutes and can only be used once.

If you didn't request this code, please contact support immediately.

Security Tip: Never share this code with anyone.

---
MyChristianCounselor Support
support@mychristiancounselor.online
```

#### State C: TOTP (Authenticator App)

```
┌─────────────────────────────────┐
│ Email: [user@example.com]      │
│ Password: [••••••••••]         │
│ [Log In]                        │
└─────────────────────────────────┘
           ↓
    Credentials valid?
           ↓ Yes
┌─────────────────────────────────┐
│ Enter the code from your        │
│ authenticator app               │
│                                 │
│ Code: [______]                  │
│ [Verify]                        │
│                                 │
│ [Use Backup Code] [Back]       │
└─────────────────────────────────┘
           ↓
    Validate TOTP code
    (30-second window)
           ↓ Valid
    Grant access
```

**TOTP Details**:
- 6-digit code
- Changes every 30 seconds
- Time-based verification
- Supports standard authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)

**Backup Code Flow**:
- Click "Use Backup Code"
- Enter 8-character alphanumeric code
- Validate against stored backup codes
- Mark code as used
- Grant access
- Show warning: "X backup codes remaining"

### 2FA Setup Options

#### Option 1: Enable Email Verification

**Location**: Profile → Security → Two-Factor Authentication

**Flow**:
```
1. Click "Enable Email Verification"
   ↓
2. Show confirmation modal:
   "Email verification will be required at every login.
    A 6-digit code will be sent to [user@example.com].
    Continue?"
   ↓
3. User confirms
   ↓
4. Send test email with code
   ↓
5. User enters test code
   ↓
6. Validate code
   ↓
7. Set: twoFactorEnabled = true, twoFactorMethod = "email"
   ↓
8. Show success: "Email verification enabled! You'll receive a code at every login."
   ↓
9. Show upgrade tip banner: "For better security, consider upgrading to Authenticator App"
```

**UI**:
```
┌──────────────────────────────────────────────────┐
│ Two-Factor Authentication                        │
├──────────────────────────────────────────────────┤
│ Current Status: Disabled                         │
│                                                  │
│ Choose a 2FA method to protect your account:    │
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ Email Verification (Convenient)            │ │
│ │                                            │ │
│ │ ✓ No setup required                        │ │
│ │ ✓ Works on any device                      │ │
│ │ ✓ Familiar and easy to use                 │ │
│ │                                            │ │
│ │ [Enable Email Verification]                │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ Authenticator App (Recommended)            │ │
│ │                                            │ │
│ │ ✓ Most secure option                       │ │
│ │ ✓ Works offline                            │ │
│ │ ✓ Faster login (no waiting for email)     │ │
│ │                                            │ │
│ │ [Enable Authenticator App]                 │ │
│ └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

#### Option 2: Enable Authenticator App (TOTP)

**Flow**:
```
1. Click "Enable Authenticator App"
   ↓
2. Generate TOTP secret using speakeasy
   ↓
3. Display setup wizard:

   Step 1: Scan QR Code
   ┌────────────────────────────┐
   │ [QR Code Image]            │
   │                            │
   │ Or enter manually:         │
   │ JBSWY3DPEHPK3PXP          │
   │                            │
   │ [Next]                     │
   └────────────────────────────┘

   Step 2: Verify Setup
   ┌────────────────────────────┐
   │ Open your authenticator    │
   │ app and enter the code:    │
   │                            │
   │ Code: [______]             │
   │ [Verify]                   │
   │                            │
   │ [Back]                     │
   └────────────────────────────┘

   Step 3: Save Backup Codes
   ┌────────────────────────────┐
   │ Save these backup codes    │
   │ in a safe place:           │
   │                            │
   │ 1. A7B2C9D4                │
   │ 2. E3F8G1H5                │
   │ 3. J6K4L9M2                │
   │ 4. N8P5Q1R7                │
   │ 5. S3T9U6V2                │
   │ 6. W4X8Y1Z5                │
   │ 7. A9B3C7D2                │
   │ 8. E6F1G5H8                │
   │ 9. J2K7L4M9                │
   │ 10. N5P8Q3R6               │
   │                            │
   │ [Download] [Copy]          │
   │ [✓] I've saved these codes │
   │ [Complete Setup]           │
   └────────────────────────────┘

   Step 4: Success
   ┌────────────────────────────┐
   │ ✓ Authenticator app        │
   │   enabled!                 │
   │                            │
   │ Your account is now        │
   │ protected with two-factor  │
   │ authentication.            │
   │                            │
   │ [Done]                     │
   └────────────────────────────┘
```

**Technical Implementation**:
```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate secret
const secret = speakeasy.generateSecret({
  name: `MyChristianCounselor (${user.email})`,
  issuer: 'MyChristianCounselor',
  length: 32,
});

// Generate QR code
const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

// Store encrypted secret
await prisma.user.update({
  where: { id: user.id },
  data: {
    twoFactorSecret: encrypt(secret.base32),
  },
});

// Generate backup codes
const backupCodes = Array.from({ length: 10 }, () =>
  generateRandomString(8).toUpperCase()
);

await prisma.user.update({
  where: { id: user.id },
  data: {
    twoFactorBackupCodes: backupCodes.map(code => encrypt(code)),
  },
});

// Verify TOTP code
const verified = speakeasy.totp.verify({
  secret: decrypt(user.twoFactorSecret),
  encoding: 'base32',
  token: userEnteredCode,
  window: 1, // Allow 1 step before/after for clock skew
});
```

### Upgrade Path: Email → TOTP

**Location**: Profile → Security (when email 2FA is enabled)

**UI**:
```
┌──────────────────────────────────────────────────┐
│ Two-Factor Authentication                        │
├──────────────────────────────────────────────────┤
│ Current Status: Email Verification Enabled       │
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ [i] Upgrade to Authenticator App           │ │
│ │                                            │ │
│ │ Get faster logins and enhanced security:   │ │
│ │ • No waiting for email                     │ │
│ │ • Works offline                            │ │
│ │ • More secure (TOTP standard)              │ │
│ │                                            │ │
│ │ [Upgrade to Authenticator App]             │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ [Disable 2FA]                                   │
└──────────────────────────────────────────────────┘
```

**Flow**:
- Click "Upgrade to Authenticator App"
- Follow TOTP setup wizard (same as Option 2)
- After completion: Switch from email to TOTP
- Update: `twoFactorMethod = "totp"`, `twoFactorSecret` set
- Disable banner reminders

### Encouragement Banners (Every 9 Days)

#### For State A Users (No 2FA)

**Display**: Dashboard, top of page, dismissible

```
╔═══════════════════════════════════════════════════════════╗
║ [ℹ] Security Recommendation                               ║
╠═══════════════════════════════════════════════════════════╣
║ Protect your account with two-factor authentication.     ║
║ Choose the option that works best for you:               ║
║                                                           ║
║ • Authenticator App (Most secure)                        ║
║   Works offline, faster login                            ║
║                                                           ║
║ • Email Verification (Convenient)                        ║
║   No setup required, works on any device                 ║
║                                                           ║
║ [Set Up 2FA]  [Dismiss]                                  ║
╚═══════════════════════════════════════════════════════════╝
```

**Actions**:
- **Set Up 2FA**: Redirect to Profile → Security
- **Dismiss**: Update `lastSecurityBannerShown = now()`, hide for 9 days

#### For State B Users (Email 2FA)

**Display**: Dashboard, top of page, dismissible

```
╔═══════════════════════════════════════════════════════════╗
║ [ℹ] Security Tip                                          ║
╠═══════════════════════════════════════════════════════════╣
║ You're using email verification. For enhanced security   ║
║ and faster logins, consider upgrading to an               ║
║ Authenticator App.                                        ║
║                                                           ║
║ Benefits:                                                 ║
║ • Works without internet connection                       ║
║ • No waiting for email                                    ║
║ • More secure (codes change every 30 seconds)            ║
║                                                           ║
║ [Upgrade to Authenticator App]  [Dismiss]                ║
╚═══════════════════════════════════════════════════════════╝
```

### Banner Display Logic

```typescript
function shouldShowSecurityBanner(user: User): boolean {
  // Initial deployment banner (once per user)
  if (!user.deploymentBannerDismissed) {
    return true;
  }

  // Fully secured users (TOTP) - no banners
  if (user.twoFactorMethod === 'totp') {
    return false;
  }

  // No 2FA or email-only users - show every 9 days
  if (!user.lastSecurityBannerShown) {
    return true;
  }

  const daysSinceLastShown = Math.floor(
    (Date.now() - user.lastSecurityBannerShown.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastShown >= 9;
}

function getSecurityBannerContent(user: User) {
  if (!user.deploymentBannerDismissed) {
    return 'deployment'; // One-time deployment banner
  }

  if (!user.twoFactorEnabled) {
    return 'no-2fa'; // Encourage any 2FA
  }

  if (user.twoFactorMethod === 'email') {
    return 'upgrade-totp'; // Encourage TOTP upgrade
  }

  return null; // No banner (TOTP users)
}
```

### Admin Dashboard - 2FA Status Report

**Location**: `/admin` (main dashboard)

**Widget**:
```
┌────────────────────────────────────────────────┐
│ Two-Factor Authentication Status               │
├────────────────────────────────────────────────┤
│ TOTP (Authenticator App):    45 users (23%)   │
│ Email Verification:           78 users (39%)   │
│ No 2FA:                       75 users (38%)   │
│                                                │
│ Total Users: 198                               │
│                                                │
│ [Send Reminder Email to No-2FA Users]         │
└────────────────────────────────────────────────┘
```

**Actions**:
- **Send Reminder Email**: Bulk email to all State A users
  - Subject: "Enhance Your Account Security"
  - Body: Explanation of 2FA options, links to setup
  - Throttle: Max once per week

**Detail View** (`/admin/users/2fa-status`):
```
┌────────────────────────────────────────────────┐
│ Two-Factor Authentication - User Details      │
├────────────────────────────────────────────────┤
│ Filter: [All ▼] [TOTP] [Email] [None]        │
│                                                │
│ Name            Email             2FA Status   │
│ John Smith      john@...          TOTP        │
│ Jane Doe        jane@...          Email       │
│ Bob Johnson     bob@...           None        │
│ ...                                            │
└────────────────────────────────────────────────┘
```

### Technical Implementation

**Libraries**:
```bash
cd packages/api
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

**Encryption** (for secrets and backup codes):
```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = process.env.ENCRYPTION_KEY; // 32-byte key from env

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**API Endpoints** (new):
- `POST /api/auth/2fa/email/enable` - Enable email 2FA
- `POST /api/auth/2fa/email/verify` - Verify email code during login
- `POST /api/auth/2fa/email/resend` - Resend email code
- `POST /api/auth/2fa/totp/setup` - Start TOTP setup (get QR code)
- `POST /api/auth/2fa/totp/verify-setup` - Verify TOTP during setup
- `POST /api/auth/2fa/totp/verify-login` - Verify TOTP during login
- `POST /api/auth/2fa/backup-codes/use` - Use backup code
- `POST /api/auth/2fa/backup-codes/regenerate` - Regenerate backup codes
- `POST /api/auth/2fa/disable` - Disable 2FA (requires password confirmation)
- `GET /api/admin/2fa/status` - Get platform-wide 2FA adoption stats

**Frontend Components**:
```
packages/web/src/components/auth/
├── TwoFactorSetup.tsx (main setup wizard)
├── EmailVerificationSetup.tsx
├── TotpSetup.tsx
├── QRCodeDisplay.tsx
├── BackupCodesDisplay.tsx
├── TwoFactorLogin.tsx
├── EmailCodeInput.tsx
├── TotpCodeInput.tsx
└── SecurityBanner.tsx
```

### Testing Strategy
- TOTP generation and verification (time-based)
- Email code generation, expiration, single-use
- Backup codes usage and depletion
- Banner display logic (9-day intervals)
- Upgrade path (email → TOTP)
- Admin dashboard statistics
- Encryption/decryption of secrets

---

## Part B: Compliance Documentation

### Goal
Create comprehensive HIPAA/GDPR compliance documentation for legal and audit purposes.

### Document 1: Business Associate Agreements (BAAs)

**File**: `docs/compliance/business-associate-agreements.md`

**Content Structure**:
```markdown
# Business Associate Agreements (BAAs)

**Last Updated**: January 11, 2026
**Next Review**: January 11, 2027
**Responsible Party**: [Compliance Officer Name]

---

## Overview

Under HIPAA, any third-party service that processes Protected Health Information (PHI) on behalf of MyChristianCounselor must sign a Business Associate Agreement (BAA).

---

## Third-Party Services Processing PHI

| Service | Description | PHI Processed | BAA Status | Signed Date | Review Date |
|---------|-------------|---------------|------------|-------------|-------------|
| AWS (RDS) | PostgreSQL database hosting | All patient data | ✓ Signed | 2025-03-15 | 2026-03-15 |
| AWS (Lightsail) | Container hosting (API/Web) | Runtime access to PHI | ✓ Signed | 2025-03-15 | 2026-03-15 |
| AWS (Bedrock) | AI model processing (book eval) | Book content only (no PHI) | ✓ Signed | 2025-11-01 | 2026-11-01 |
| Postmark | Email delivery service | Member emails (contact info) | ✓ Signed | 2025-02-10 | 2026-02-10 |

---

## Services NOT Requiring BAAs

| Service | Reason |
|---------|--------|
| GitHub | No PHI (source code only) |
| npm Registry | No PHI (dependencies) |
| Sentry | Error logs exclude PHI by design |

---

## BAA Execution Process

1. Identify new service that will process PHI
2. Request BAA from vendor (use template if needed)
3. Legal review of BAA terms
4. Executive approval and signature
5. Store signed BAA in secure location
6. Add to tracking table above
7. Set annual review reminder

---

## BAA Template (for vendors without standard BAA)

[Attached: BAA-Template.pdf]

Key clauses:
- Permitted uses and disclosures of PHI
- Safeguards to protect PHI
- Breach notification requirements (within 60 days)
- Termination conditions
- Subcontractor BAA requirements

---

## Annual Review Checklist

- [ ] Verify all BAAs are current (not expired)
- [ ] Confirm all services still in use
- [ ] Remove BAAs for discontinued services
- [ ] Update BAA table with any changes
- [ ] Review BAA terms for compliance with current regulations

---

## Contact Information

**Vendor BAA Contacts**:
- AWS: aws-baa@amazon.com
- Postmark: legal@postmarkapp.com

**Internal Compliance**:
- Compliance Officer: [Name, Email]
- Legal Counsel: [Name, Email]
```

### Document 2: Incident Response Plan

**File**: `docs/compliance/incident-response-plan.md`

**Content Structure**:
```markdown
# Incident Response Plan

**Last Updated**: January 11, 2026
**Next Review**: January 11, 2027
**Responsible Party**: [Security Officer Name]

---

## Purpose

This plan establishes procedures for detecting, responding to, and recovering from security incidents involving Protected Health Information (PHI) under HIPAA and personal data under GDPR.

---

## Incident Severity Classification

| Severity | Definition | Examples | Response Time |
|----------|------------|----------|---------------|
| **Critical** | Widespread PHI breach affecting 500+ individuals | Database dump leaked, ransomware attack | Immediate (<1 hour) |
| **High** | PHI breach affecting 50-499 individuals | Email list exposed, unauthorized access to member records | <4 hours |
| **Medium** | PHI breach affecting <50 individuals | Single member record accessed by wrong counselor | <24 hours |
| **Low** | Security issue with no PHI exposure | Failed login attempts, DoS attempt | <72 hours |

---

## Incident Detection

**Detection Methods**:
1. **Automated Monitoring**
   - CloudWatch alarms (database access spikes, API errors)
   - Audit log anomalies (bulk data exports, unusual access patterns)
   - Sentry error tracking (security exceptions)

2. **Manual Reporting**
   - User reports suspicious activity
   - Staff discovers unauthorized access
   - Third-party notification (vendor breach)

3. **Regular Audits**
   - Monthly audit log review
   - Quarterly security assessments
   - Annual penetration testing

---

## Incident Response Team

| Role | Name | Contact | Responsibilities |
|------|------|---------|------------------|
| Security Officer | [Name] | [Phone/Email] | Incident commander, decision-making |
| Technical Lead | [Name] | [Phone/Email] | Technical investigation, remediation |
| Compliance Officer | [Name] | [Phone/Email] | Legal compliance, breach notification |
| Communications | [Name] | [Phone/Email] | Member communication, PR |
| Executive Sponsor | [Name] | [Phone/Email] | Final approval for major decisions |

---

## Response Procedures

### Phase 1: Detection & Assessment (0-1 hour)

1. **Receive Incident Report**
   - Log incident in tracking system
   - Assign severity level (preliminary)

2. **Initial Assessment**
   - Confirm incident is real (not false positive)
   - Identify affected systems and data
   - Estimate number of affected individuals
   - Reassess severity classification

3. **Activate Response Team**
   - Notify Security Officer immediately
   - For Critical/High: Activate full response team
   - For Medium/Low: Security Officer + Technical Lead

### Phase 2: Containment (1-4 hours)

1. **Immediate Containment**
   - Isolate affected systems (disable accounts, block IPs)
   - Prevent further unauthorized access
   - Preserve evidence (logs, snapshots)

2. **Short-Term Containment**
   - Apply temporary fixes (password resets, access revocation)
   - Monitor for continued suspicious activity
   - Document all containment actions

3. **Evidence Collection**
   - Collect audit logs (before/during/after incident)
   - Take database snapshots
   - Screenshot error messages or unauthorized access
   - Document timeline of events

### Phase 3: Investigation (4-24 hours)

1. **Root Cause Analysis**
   - How did attacker gain access?
   - What vulnerability was exploited?
   - What data was accessed/exfiltrated?
   - How many individuals affected?

2. **Impact Assessment**
   - List all PHI/personal data exposed
   - Determine if data was actually accessed vs. potentially accessed
   - Assess risk to affected individuals

3. **Technical Forensics**
   - Review database query logs
   - Analyze API access logs
   - Check for data exfiltration (large exports, unusual queries)
   - Identify all compromised accounts/systems

### Phase 4: Eradication (24-48 hours)

1. **Remove Threat**
   - Close vulnerability (patch, config change)
   - Remove attacker access completely
   - Verify no backdoors remain

2. **Strengthen Defenses**
   - Implement additional security controls
   - Update access policies
   - Reset credentials as needed

### Phase 5: Recovery (48-72 hours)

1. **Restore Normal Operations**
   - Bring systems back online
   - Verify security controls effective
   - Monitor for reinfection

2. **Validation**
   - Run security scans
   - Review audit logs for anomalies
   - Confirm incident fully resolved

### Phase 6: Notification (0-72 hours, depending on severity)

#### HIPAA Breach Notification Requirements

**Trigger**: Breach of unsecured PHI affecting 1+ individuals

**Timelines**:
- **500+ individuals**: Notify HHS immediately, notify media within 60 days
- **<500 individuals**: Notify within 60 days, annual HHS report

**Notification Must Include**:
1. Brief description of breach
2. Types of PHI involved
3. Steps individuals should take to protect themselves
4. What organization is doing to investigate and prevent recurrence
5. Contact information for questions

**Notification Methods**:
- Affected individuals: Written notice (email or mail)
- HHS: Online portal submission
- Media: Press release (if 500+ in same state)

#### GDPR Breach Notification Requirements

**Trigger**: Personal data breach likely to result in risk to individuals' rights and freedoms

**Timelines**:
- **Supervisory Authority**: Within 72 hours of becoming aware
- **Data Subjects**: Without undue delay (if high risk to their rights)

**Notification Must Include**:
1. Nature of breach
2. Categories and approximate number of data subjects affected
3. Likely consequences
4. Measures taken or proposed to address breach
5. Contact point for more information

---

## Breach Notification Templates

### Template 1: Member Notification Email

**Subject**: Important Security Notice About Your MyChristianCounselor Account

```
Dear [Member Name],

We are writing to inform you of a recent security incident that may have affected your personal information.

**What Happened**
On [Date], we discovered [brief description of incident]. We immediately took action to [containment steps].

**What Information Was Involved**
The following information may have been accessed:
- [List data types: name, email, dates of service, etc.]
- [Note: Counseling session notes were/were not affected]

**What We Are Doing**
We have taken the following steps:
- [List actions: closed vulnerability, enhanced monitoring, etc.]
- Notified law enforcement (if applicable)
- Conducting thorough investigation

**What You Can Do**
We recommend you take the following precautions:
- Change your password immediately
- Monitor your accounts for suspicious activity
- Enable two-factor authentication (now available)
- Review our updated security features

**Contact Us**
If you have questions or concerns, please contact us:
- Email: security@mychristiancounselor.online
- Phone: [Support Number]

We sincerely apologize for this incident and any inconvenience it may cause. Protecting your information is our highest priority.

Sincerely,
[Executive Name]
[Title]
MyChristianCounselor
```

### Template 2: HHS Breach Report

(See HHS breach notification form on HHS website)

### Template 3: GDPR Supervisory Authority Notification

(Use standard GDPR breach notification form for relevant data protection authority)

---

## Post-Incident Review

**Within 7 Days of Resolution**:

1. **Conduct Post-Mortem Meeting**
   - All response team members attend
   - Review timeline of events
   - Assess response effectiveness
   - Identify lessons learned

2. **Document Lessons Learned**
   - What worked well?
   - What could be improved?
   - Were procedures followed?
   - Were procedures adequate?

3. **Update Incident Response Plan**
   - Incorporate lessons learned
   - Update contact information
   - Revise procedures as needed
   - Update detection mechanisms

4. **Implement Preventive Measures**
   - Add security controls
   - Update policies
   - Provide staff training
   - Schedule follow-up security audit

5. **Archive Incident Report**
   - Store in secure location
   - Retain for 7 years (HIPAA requirement)
   - Include all documentation, logs, and evidence

---

## Annual Incident Response Drill

**Schedule**: Every 12 months

**Drill Scenario**: Simulated breach (e.g., unauthorized database access, phishing attack)

**Drill Procedure**:
1. Incident Response Team receives simulated breach notification
2. Team follows response procedures as written
3. Document all actions taken and time elapsed
4. Debrief after drill (what went well, what needs improvement)
5. Update plan based on drill findings

**Last Drill**: [Date]
**Next Drill**: [Date]

---

## Training Requirements

**All Staff**:
- Annual HIPAA security awareness training
- Incident reporting procedures
- Recognize and report suspicious activity

**Technical Staff**:
- Incident response procedures (detailed)
- Forensic investigation techniques
- Secure evidence handling

**Response Team**:
- Quarterly incident response tabletop exercises
- Review of updated procedures
- Communication protocols

---

## Regulatory References

- HIPAA Breach Notification Rule (45 CFR §§ 164.400-414)
- GDPR Article 33 (Notification of breach to supervisory authority)
- GDPR Article 34 (Communication of breach to data subject)

---

## Appendices

**Appendix A**: Incident Tracking Log Template
**Appendix B**: Evidence Collection Checklist
**Appendix C**: Communication Scripts
**Appendix D**: External Contacts (Law Enforcement, Legal Counsel, PR Firm)
```

### Document 3: Two-Factor Authentication Policy

**File**: `docs/compliance/two-factor-authentication-policy.md`

**Content Structure**:
```markdown
# Two-Factor Authentication (2FA) Policy

**Effective Date**: [Deployment Date]
**Last Updated**: January 11, 2026
**Policy Owner**: [Security Officer Name]

---

## Purpose

This policy establishes the use of two-factor authentication (2FA) as a security control to protect user accounts and comply with HIPAA Security Rule requirements for secure access to Protected Health Information (PHI).

---

## Scope

This policy applies to:
- All user accounts with access to the MyChristianCounselor platform
- Members (clients receiving counseling services)
- Counselors (providing counseling services)
- Organization Administrators
- Platform Administrators

---

## Policy Statement

MyChristianCounselor **strongly recommends** (but does not mandate) two-factor authentication for all user accounts to enhance security and protect sensitive information.

---

## Two-Factor Authentication Methods

### Method 1: Authenticator App (TOTP) - Recommended

**Description**: Time-based One-Time Password (TOTP) using a smartphone authenticator app.

**Supported Apps**:
- Google Authenticator
- Microsoft Authenticator
- Authy
- Any TOTP-compliant authenticator

**Benefits**:
- Most secure method
- Works offline (no internet required)
- Faster login (no waiting for email)
- Industry standard (RFC 6238)

**How It Works**:
1. User scans QR code with authenticator app during setup
2. App generates 6-digit code that changes every 30 seconds
3. User enters current code during login
4. System verifies code matches expected value

**Recovery**: 10 backup codes provided during setup for lost device scenarios.

### Method 2: Email Verification - Convenient

**Description**: 6-digit code sent via email for each login.

**Benefits**:
- No setup required
- Works on any device
- Familiar process for users

**How It Works**:
1. User logs in with email + password
2. System sends 6-digit code to user's email
3. User retrieves code from email
4. User enters code to complete login
5. Code valid for 30 minutes, single-use

**Limitations**:
- Requires internet access to receive email
- Slower login process (wait for email delivery)
- Less secure than TOTP (email account compromise = 2FA bypass)

---

## User Encouragement Strategy

### Deployment Banner (One-Time)

Upon first login after 2FA deployment, users see a dismissible banner explaining the new security feature and available options.

### Ongoing Reminders (Every 9 Days)

Users without TOTP-based 2FA receive gentle reminder banners every 9 days encouraging them to:
- Enable 2FA (if none)
- Upgrade from email to TOTP (if using email 2FA)

### No Enforcement

- 2FA is **optional** for all users
- No accounts are locked or restricted for not enabling 2FA
- Users can choose the 2FA method that best fits their needs
- Users can disable 2FA at any time (with password confirmation)

---

## Rationale for Optional (Not Mandatory) 2FA

1. **User Diversity**: Platform serves users with varying technical comfort levels, including elderly and less tech-savvy individuals
2. **Accessibility**: Mandatory 2FA could create barriers to accessing mental health services
3. **Baseline Security**: Email-based 2FA provides adequate security for most threat models
4. **User Choice**: Respecting user autonomy while providing secure options
5. **Gradual Adoption**: Encouragement strategy drives adoption without forcing immediate compliance

---

## Security Considerations

### For Counselors (Recommended: TOTP Required)

While 2FA is optional platform-wide, **counselors handling PHI are strongly encouraged to use TOTP-based 2FA** due to:
- Access to sensitive patient information
- Higher risk target for attackers
- HIPAA Security Rule expectations for access controls

Organization administrators may choose to **recommend or require** TOTP for counselors within their organization.

### For Members

Members have full autonomy to choose their preferred 2FA method or opt-out entirely. The encouragement strategy respects their choice while promoting security awareness.

---

## Implementation Details

### Setup Process

**Authenticator App (TOTP)**:
1. Navigate to Profile → Security → Two-Factor Authentication
2. Click "Enable Authenticator App"
3. Scan QR code with authenticator app
4. Enter verification code from app
5. Download and save 10 backup codes
6. Confirm backup codes saved
7. 2FA enabled

**Email Verification**:
1. Navigate to Profile → Security → Two-Factor Authentication
2. Click "Enable Email Verification"
3. Receive test code via email
4. Enter test code to confirm
5. 2FA enabled

### Login Process

**With TOTP**:
1. Enter email + password
2. Prompted for 6-digit code from authenticator app
3. Enter current code
4. Login complete

**With Email Verification**:
1. Enter email + password
2. System sends 6-digit code to email
3. Retrieve code from email inbox
4. Enter code
5. Login complete

**Backup Codes** (TOTP users only):
- Click "Use Backup Code" on login screen
- Enter 8-character backup code
- Code is marked as used (single-use)
- Login complete
- Warning shown: "X backup codes remaining"

### Account Recovery

**Lost Authenticator Device**:
- Use backup code to login
- Regenerate new backup codes
- Optionally: Disable and re-enable TOTP (new QR code)

**Lost Backup Codes**:
- Contact support for identity verification
- Admin can temporarily disable 2FA
- User must re-enable with new setup

**Lost Email Access**:
- Contact support for identity verification
- Update email address with admin assistance
- Re-enable email 2FA with new email

---

## Administrative Controls

### Admin Dashboard

Platform administrators can view 2FA adoption statistics:
- Number/percentage of users with TOTP
- Number/percentage of users with Email 2FA
- Number/percentage of users without 2FA

### Admin Actions

Platform administrators can:
- View user's 2FA status
- Temporarily disable 2FA for account recovery (with audit logging)
- Send reminder emails to users without 2FA

Platform administrators **cannot**:
- Force-enable 2FA for users
- View user's TOTP secrets or backup codes
- Bypass 2FA to access accounts

### Audit Logging

All 2FA-related actions are logged:
- 2FA enabled/disabled
- Login with 2FA
- Backup code used
- Admin 2FA override (for recovery)

Logs retained for 7 years per HIPAA requirements.

---

## Compliance Mapping

### HIPAA Security Rule

**§164.312(a)(2)(i) - Unique User Identification**: 2FA strengthens unique user identification by requiring multiple authentication factors.

**§164.312(d) - Person or Entity Authentication**: 2FA provides stronger authentication than password-only, addressing this standard.

**Rationale for Optional**: HIPAA does not explicitly mandate 2FA but requires "reasonable and appropriate" security measures. Given the platform's user base and accessibility considerations, optional 2FA with strong encouragement is deemed reasonable and appropriate.

### GDPR

**Article 32 - Security of Processing**: 2FA contributes to appropriate technical measures to ensure data security.

---

## Policy Review

This policy will be reviewed annually and updated as needed based on:
- Adoption rates
- Security incidents
- Regulatory guidance changes
- User feedback

**Last Review**: January 11, 2026
**Next Review**: January 11, 2027

---

## Training

All users receive:
- In-app guidance during 2FA setup
- Email with 2FA setup instructions (upon request)
- Support articles on help center
- Video tutorial (optional)

Staff receive:
- Annual security awareness training (includes 2FA)
- Account recovery procedures
- Supporting users with 2FA issues

---

## Questions or Concerns

Contact: security@mychristiancounselor.online
```

---

## Implementation Summary

### Phase 5 Deliverables

**Part A: 2FA Implementation**
1. Database migration (User model updates)
2. Backend services (TOTP setup, email code verification)
3. Frontend components (setup wizards, login flows)
4. Security banners (deployment, 9-day reminders)
5. Admin dashboard (adoption statistics)

**Part B: Compliance Documentation**
1. Business Associate Agreements tracking document
2. Incident Response Plan with breach notification templates
3. Two-Factor Authentication Policy

### Testing Strategy
- TOTP setup and verification
- Email code generation and validation
- Backup codes usage
- Banner display logic
- Upgrade path (email → TOTP)
- Admin override for account recovery
- Encryption of secrets and backup codes
- Audit logging

### Rollout Plan
1. **Week 1**: Database migration, backend services
2. **Week 2**: Frontend components, testing
3. **Week 3**: Deployment banner, monitor adoption
4. **Week 4**: Compliance documentation, staff training

---

## Cross-Phase Dependencies

| Phase | Depends On | Reason |
|-------|------------|--------|
| Phase 1 | None | Standalone charting implementation |
| Phase 2 | None | Workflow UI uses existing backend |
| Phase 3 | Phase 1 | Queue health sparkline uses Recharts |
| Phase 4 | None | Cron job is independent |
| Phase 5 | None | 2FA is independent |

**Recommendation**: Phases can be deployed in any order, but Phase 3 should deploy after Phase 1 for the sparkline chart feature.

---

## Deployment Checklist (Per Phase)

- [ ] All tasks completed and tested
- [ ] Code review passed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Manual QA completed
- [ ] Database migrations prepared (if applicable)
- [ ] Environment variables documented (if applicable)
- [ ] User documentation updated
- [ ] Staff training completed (if applicable)
- [ ] Deploy to staging
- [ ] Staging smoke test passed
- [ ] Deploy to production
- [ ] Production smoke test passed
- [ ] Monitor for errors (24 hours)
- [ ] Mark phase as complete in STATUS.md

---

## Success Metrics

### Phase 1: Charting Library
- **Technical**: <3 second chart render time, responsive on mobile
- **User**: Counselors use assessment trend charts in 80% of member sessions

### Phase 2: Workflow UI
- **Technical**: <10 second workflow creation time
- **User**: 50% of counselors create at least 1 custom workflow in first month

### Phase 3: Dashboard Enhancements
- **Technical**: <5ms notification latency, browser notifications working in 3 major browsers
- **User**: Admins catch queue failures 90% faster (before user reports)

### Phase 4: Scheduled Campaigns
- **Technical**: 100% scheduled campaign execution accuracy (no missed campaigns)
- **User**: Marketing team schedules 80% of campaigns (vs. manual execution)

### Phase 5: Security & Compliance
- **Technical**: 0 security vulnerabilities in 2FA implementation
- **User**: 40% TOTP adoption, 30% email 2FA adoption within 3 months

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Next Steps**: Create detailed implementation plans for each phase
