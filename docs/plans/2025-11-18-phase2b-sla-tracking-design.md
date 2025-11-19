# Phase 2B: SLA Tracking + Escalation - Design Document

**Date**: 2025-11-18
**Project**: MyChristianCounselor Support Ticket System
**Phase**: 2B - SLA Tracking + Escalation
**Author**: Design Session with User

---

## Table of Contents

1. [Overview and Goals](#overview-and-goals)
2. [Database Schema Changes](#database-schema-changes)
3. [SLA Calculation Logic](#sla-calculation-logic)
4. [SLA Pause/Resume Logic](#sla-pauseresume-logic)
5. [Visual Indicators and UI](#visual-indicators-and-ui)
6. [Backend Services and Scheduled Jobs](#backend-services-and-scheduled-jobs)
7. [Metrics Tracking and Reporting](#metrics-tracking-and-reporting)
8. [Holiday Management Interface](#holiday-management-interface)
9. [Implementation Notes](#implementation-notes)
10. [Future Enhancements](#future-enhancements)

---

## Overview and Goals

### Purpose

Implement SLA (Service Level Agreement) tracking to ensure timely responses and resolutions to support tickets. This helps maintain service quality, sets clear expectations, and provides visibility into support team performance.

### Key Features

- **Dual SLA tracking**: Response time (first admin reply) and Resolution time (ticket marked resolved)
- **Business hours calculation**: Mon-Fri 10 AM - 10 PM EST (12 hours/day, 60 hours/week)
- **Priority-based SLA targets** with color-coded visual indicators
- **Auto-pause** when waiting on users
- **Holiday exclusions** with admin-configurable holiday calendar
- **Basic performance metrics** and history tracking
- **In-app notifications** for critical SLA states

### What's NOT Included (Future Enhancements)

- Automatic escalation (manual only for now)
- Email notifications (in-app notifications only)
- Dedicated SLA dashboard (minimal views for now)
- Advanced analytics and trending charts
- Per-admin performance tracking

### Success Criteria

- Admins can see SLA status at a glance (color badges)
- System accurately calculates deadlines respecting business hours and holidays
- SLA metrics are recorded for reporting
- Notifications alert admins when tickets approach or breach SLA
- Holiday calendar is easily manageable by platform admins

---

## Database Schema Changes

### New Model: Holiday

```prisma
model Holiday {
  id          String   @id @default(uuid())
  name        String   // "New Year's Day", "Christmas", etc.
  date        DateTime // The holiday date
  isRecurring Boolean  @default(false) // Annual holidays
  createdById String
  createdAt   DateTime @default(now())

  createdBy User @relation(fields: [createdById], references: [id])

  @@index([date])
}
```

**Purpose**: Store holidays that should be excluded from SLA calculations. Supports both one-time and recurring holidays.

### SupportTicket Model Updates

Add new fields to track SLA state and history:

```prisma
model SupportTicket {
  // ... existing fields ...

  // SLA Deadlines
  responseSLADeadline   DateTime? // When first response is due
  resolutionSLADeadline DateTime? // When resolution is due (rename existing slaDeadline)

  // SLA State
  responseSLAStatus     String @default("on_track") // on_track, approaching, critical, breached
  resolutionSLAStatus   String @default("on_track")

  // SLA Pause tracking
  slaPausedAt           DateTime? // When SLA was paused
  slaPausedReason       String?   // "waiting_on_user", "manual" (future)

  // SLA History (recorded when ticket resolved/closed)
  actualResponseTime    Int?      // Minutes from creation to first admin response
  actualResolutionTime  Int?      // Minutes from creation to resolved (excluding paused time)
  responseSLAMet        Boolean?  // Was response SLA met?
  resolutionSLAMet      Boolean?  // Was resolution SLA met?

  // ... rest of model ...
}
```

**Field Purposes**:
- **Deadlines**: Calculated timestamps for when SLAs are due
- **Status**: Current state for quick filtering and display
- **Pause tracking**: Handles "waiting_on_user" scenarios
- **History**: Enables reporting and performance analysis

### User Model Updates

Add relation for holiday management:

```prisma
model User {
  // ... existing fields ...
  holidaysCreated Holiday[]
  // ... rest of model ...
}
```

---

## SLA Calculation Logic

### Priority-Based SLA Targets

| Priority | Response SLA | Resolution SLA |
|----------|--------------|----------------|
| Urgent   | 4 hours      | 1 day (24 hours) |
| High     | 1 day (24 hours) | 5 days (120 hours) |
| Medium   | 3 days (72 hours) | 30 days (720 hours) |
| Low      | 5 days (120 hours) | 90 days (2160 hours) |
| Feature  | 5 days (120 hours) | null (roadmap-driven) |

**Note**: All times are in **business hours**, not calendar hours.

### Business Hours Configuration

- **Schedule**: Monday-Friday, 10:00 AM - 10:00 PM EST
- **Daily Hours**: 12 business hours per day
- **Weekly Hours**: 60 business hours per week
- **Holidays**: Excluded from calculations (fetched from Holiday table)
- **Timezone**: All calculations in America/New_York (EST/EDT)

### Deadline Calculation Process

1. **Ticket Created** → Start timestamp recorded (`createdAt`)
2. **Fetch SLA Hours** for priority level (response + resolution)
3. **Calculate Deadline** by adding business hours:
   - Start from creation timestamp
   - Skip weekends (Saturday/Sunday)
   - Skip holidays from database
   - Only count 10 AM - 10 PM EST hours
   - Account for DST transitions

**Example Calculations**:

```typescript
// Example 1: Urgent ticket (4-hour response SLA)
// Created: Tuesday 3:00 PM EST
// Deadline: Tuesday 7:00 PM EST (same day, 4 business hours later)

// Example 2: High ticket (24-hour response SLA)
// Created: Friday 8:00 PM EST
// Calculation:
//   - Friday 8 PM to 10 PM = 2 hours
//   - Weekend skipped = 0 hours
//   - Monday 10 AM to 10 PM = 12 hours
//   - Tuesday 10 AM to 12 PM = 2 hours
//   - Need 8 more hours, so continues...
// Deadline: Tuesday 8:00 PM EST (24 business hours)

// Example 3: Ticket created outside business hours
// Created: Saturday 2:00 PM
// SLA clock starts: Monday 10:00 AM (next business hour)
// Then accumulates from there
```

### SLA Status Calculation

System calculates percentage of business hours elapsed:

```typescript
function calculateSLAStatus(
  createdAt: DateTime,
  deadline: DateTime,
  pausedDuration: number // minutes
): SLAStatus {
  const totalSLAMinutes = calculateBusinessMinutes(createdAt, deadline);
  const elapsedMinutes = calculateBusinessMinutes(createdAt, now()) - pausedDuration;
  const percentElapsed = (elapsedMinutes / totalSLAMinutes) * 100;

  if (percentElapsed >= 100) return 'breached';
  if (percentElapsed >= 80) return 'critical';
  if (percentElapsed >= 60) return 'approaching';
  return 'on_track';
}
```

**Status Thresholds**:
- **On Track**: < 60% elapsed (Green badge)
- **Approaching**: 60-79% elapsed (Yellow badge)
- **Critical**: 80-99% elapsed (Orange badge)
- **Breached**: ≥ 100% elapsed (Red badge)
- **Paused**: SLA timer stopped (Gray badge)

### SLA Status Updates

**Scheduled Job**: Runs every 15 minutes
- Fetches all active tickets (open, in_progress, waiting_on_user)
- Calculates current SLA status for each
- Updates `responseSLAStatus` and `resolutionSLAStatus` if changed
- Triggers notifications when status transitions to `critical` or `breached`
- Uses most urgent SLA for badge display (response vs resolution)

---

## SLA Pause/Resume Logic

### Auto-Pause Trigger

**When ticket status changes to `waiting_on_user`**:
1. Record `slaPausedAt` = current timestamp
2. Set `slaPausedReason` = "waiting_on_user"
3. SLA deadlines remain unchanged (not recalculated)
4. SLA timer stops accumulating
5. Visual indicator shows "SLA Paused" badge (gray)

**Rationale**: Fair to support team - doesn't penalize for user delays.

### Auto-Resume Trigger

**When ticket status changes FROM `waiting_on_user` to any other status**:
1. Calculate pause duration: `now() - slaPausedAt` (in business hours)
2. Extend both SLA deadlines by pause duration
3. Clear `slaPausedAt` and `slaPausedReason`
4. Resume SLA timer
5. Recalculate SLA status

**Example**:
```
Timeline:
- Created: Monday 10:00 AM
- Response SLA due: Monday 2:00 PM (4 hours)
- Set to waiting_on_user: Monday 11:00 AM (1 hour elapsed)
- User responds: Monday 5:00 PM (6 business hours paused)
- New response deadline: Monday 8:00 PM (original 2 PM + 6 hours pause)
```

### Multiple Pause Cycles

If ticket goes in/out of `waiting_on_user` multiple times:
- Each pause period adds cumulative extension to deadlines
- Track total paused time for accurate metrics
- Example: 3 separate pauses of 2 hours each = 6 hours added to deadline

### Edge Case Handling

1. **Pause during non-business hours**: Duration calculated using business hours only
2. **Ticket resolved while paused**: Auto-resume, record final metrics, mark as resolved
3. **Pause crosses weekend/holiday**: Business hours calculation handles correctly
4. **Long-term pause** (user unresponsive for weeks): Deadlines extend accordingly, SLA remains paused

---

## Visual Indicators and UI

### Badge Display (List View)

**Location**: Next to ticket title in ticket list

**Badge Colors**:
- **Green**: On track (< 60% elapsed)
- **Yellow**: Approaching (60-79% elapsed)
- **Orange**: Critical (80-99% elapsed)
- **Red**: Breached (≥ 100% elapsed)
- **Gray**: Paused (waiting on user)

**Badge Logic**:
- Shows most urgent SLA state (response vs resolution)
- If response is breached but resolution is on track → Red badge
- If both are on track → Green badge

### Detailed Countdown (Hover/Detail View)

**On Hover** (list view):
```
Response SLA: 2h 15m remaining (Critical)
Resolution SLA: 3d 8h remaining (On Track)
```

**On Ticket Detail Page**:
- SLA section below ticket header
- Two progress bars (response + resolution)
- Color-coded based on status
- Shows countdown timers
- Displays pause status if applicable:
  ```
  [Paused - Waiting on User since Nov 15, 2:30 PM]
  ```

**After Ticket Resolved** (historical view):
```
Response SLA: Met (3h 24m)
Resolution SLA: Breached (32h 15m - exceeded by 8h 15m)
```

### Ticket Detail Page SLA Section

```tsx
<div className="sla-section">
  <h3>SLA Status</h3>

  {/* Response SLA */}
  <div className="sla-item">
    <label>Response SLA</label>
    <ProgressBar
      percent={75}
      color="orange"
      status="critical"
    />
    <span>1h 30m remaining</span>
  </div>

  {/* Resolution SLA */}
  <div className="sla-item">
    <label>Resolution SLA</label>
    <ProgressBar
      percent={25}
      color="green"
      status="on_track"
    />
    <span>4d 12h remaining</span>
  </div>

  {/* Pause indicator (if applicable) */}
  {ticket.slaPausedAt && (
    <div className="sla-paused">
      Paused - Waiting on User since {formatDate(ticket.slaPausedAt)}
    </div>
  )}
</div>
```

### Admin Ticket List Enhancements

**Existing functionality remains**:
- All current columns and filters
- Sortable by status, priority, created date, etc.

**New additions**:
1. **SLA Filter Dropdown**:
   - All (default)
   - On Track
   - Approaching
   - Critical
   - Breached
   - Paused

2. **SLA Sort Option**:
   - "SLA Urgency" sort order:
     1. Breached (most urgent)
     2. Critical
     3. Approaching
     4. On Track
     5. Paused (least urgent)

**No dedicated SLA dashboard** (keeping it minimal for Phase 2B - can add in future phase).

### Notification Display

**Trigger Conditions**:
- SLA status changes to `critical` (80% threshold)
- SLA status changes to `breached` (100% threshold)

**Notification Format**:
```typescript
{
  category: 'sla_warning',
  title: 'SLA Critical',
  message: 'Ticket #1234: "Login Issues" - Response SLA due in 1h 12m',
  linkTo: '/support/tickets/1234',
  recipientId: assignedAdminId || allPlatformAdmins
}
```

**Notification Behavior**:
- Appears in in-app notification bell (existing notification system)
- Click notification → navigates to ticket detail
- Notification stays until ticket SLA status improves or ticket is resolved
- No email notifications (Phase 2B scope)

---

## Backend Services and Scheduled Jobs

### New Service: SlaCalculatorService

**Location**: `packages/api/src/sla/sla-calculator.service.ts`

**Core Methods**:

```typescript
@Injectable()
export class SlaCalculatorService {
  constructor(
    private prisma: PrismaService,
    private logger: Logger
  ) {}

  /**
   * Calculate SLA deadline from creation time
   */
  async calculateDeadline(
    createdAt: Date,
    slaHours: number,
    timezone: string = 'America/New_York'
  ): Promise<Date> {
    const holidays = await this.getHolidays(createdAt, addDays(createdAt, 365));
    return this.addBusinessHours(createdAt, slaHours, holidays);
  }

  /**
   * Calculate business hours between two dates
   */
  calculateBusinessHours(start: Date, end: Date, holidays: Holiday[]): number {
    let hours = 0;
    let current = new Date(start);

    while (current < end) {
      if (this.isBusinessHour(current, holidays)) {
        hours += 1;
      }
      current = addHours(current, 1);
    }

    return hours;
  }

  /**
   * Check if timestamp falls within business hours
   */
  private isBusinessHour(date: Date, holidays: Holiday[]): boolean {
    // Check if weekend
    const day = date.getDay();
    if (day === 0 || day === 6) return false;

    // Check if holiday
    if (this.isHoliday(date, holidays)) return false;

    // Check if within 10 AM - 10 PM EST
    const hour = date.getHours();
    return hour >= 10 && hour < 22;
  }

  /**
   * Get holidays within date range
   */
  private async getHolidays(start: Date, end: Date): Promise<Holiday[]> {
    return this.prisma.holiday.findMany({
      where: {
        date: { gte: start, lte: end }
      }
    });
  }

  /**
   * Calculate SLA status based on elapsed time
   */
  calculateSLAStatus(
    createdAt: Date,
    deadline: Date,
    pausedMinutes: number = 0
  ): SLAStatus {
    const totalMinutes = this.calculateBusinessMinutes(createdAt, deadline);
    const elapsedMinutes = this.calculateBusinessMinutes(createdAt, new Date()) - pausedMinutes;
    const percentElapsed = (elapsedMinutes / totalMinutes) * 100;

    if (percentElapsed >= 100) return 'breached';
    if (percentElapsed >= 80) return 'critical';
    if (percentElapsed >= 60) return 'approaching';
    return 'on_track';
  }

  /**
   * Pause SLA for a ticket
   */
  async pauseSLA(ticketId: string, reason: string): Promise<void> {
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        slaPausedAt: new Date(),
        slaPausedReason: reason
      }
    });
  }

  /**
   * Resume SLA for a ticket
   */
  async resumeSLA(ticketId: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket.slaPausedAt) return;

    const pauseDuration = this.calculateBusinessMinutes(
      ticket.slaPausedAt,
      new Date()
    );

    // Extend deadlines by pause duration
    const newResponseDeadline = addMinutes(ticket.responseSLADeadline, pauseDuration);
    const newResolutionDeadline = addMinutes(ticket.resolutionSLADeadline, pauseDuration);

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        responseSLADeadline: newResponseDeadline,
        resolutionSLADeadline: newResolutionDeadline,
        slaPausedAt: null,
        slaPausedReason: null
      }
    });
  }
}
```

### Scheduled Job: SLA Status Updater

**Location**: `packages/api/src/sla/sla.scheduler.ts`

**Schedule**: Every 15 minutes (`*/15 * * * *`)

**Process**:
1. Fetch all active tickets (status: open, in_progress, waiting_on_user)
2. For each ticket:
   - Calculate current response SLA status
   - Calculate current resolution SLA status
   - Compare with stored status
   - If changed:
     - Update database
     - Trigger notification if entering `critical` or `breached`
     - Log status change
3. Log summary: "Updated SLA status for 42 tickets, 3 notifications sent"

```typescript
@Injectable()
export class SlaScheduler {
  constructor(
    private slaCalculator: SlaCalculatorService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private logger: Logger
  ) {}

  @Cron('*/15 * * * *', { name: 'slaStatusUpdater' })
  async updateSLAStatuses() {
    this.logger.log('Starting SLA status update job...');

    const activeTickets = await this.prisma.supportTicket.findMany({
      where: {
        status: { in: ['open', 'in_progress', 'waiting_on_user'] }
      }
    });

    let updatedCount = 0;
    let notificationCount = 0;

    for (const ticket of activeTickets) {
      try {
        const pausedMinutes = ticket.slaPausedAt
          ? this.slaCalculator.calculateBusinessMinutes(ticket.slaPausedAt, new Date())
          : 0;

        // Calculate current statuses
        const newResponseStatus = this.slaCalculator.calculateSLAStatus(
          ticket.createdAt,
          ticket.responseSLADeadline,
          pausedMinutes
        );

        const newResolutionStatus = this.slaCalculator.calculateSLAStatus(
          ticket.createdAt,
          ticket.resolutionSLADeadline,
          pausedMinutes
        );

        // Check if status changed
        const responseChanged = newResponseStatus !== ticket.responseSLAStatus;
        const resolutionChanged = newResolutionStatus !== ticket.resolutionSLAStatus;

        if (responseChanged || resolutionChanged) {
          // Update database
          await this.prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
              responseSLAStatus: newResponseStatus,
              resolutionSLAStatus: newResolutionStatus
            }
          });

          updatedCount++;

          // Send notifications for critical/breached transitions
          if (this.shouldNotify(ticket.responseSLAStatus, newResponseStatus) ||
              this.shouldNotify(ticket.resolutionSLAStatus, newResolutionStatus)) {
            await this.sendSLANotification(ticket, newResponseStatus, newResolutionStatus);
            notificationCount++;
          }
        }
      } catch (error) {
        this.logger.error(`Failed to update SLA for ticket ${ticket.id}`, error);
      }
    }

    this.logger.log(
      `SLA status update complete: ${updatedCount} tickets updated, ${notificationCount} notifications sent`
    );
  }

  private shouldNotify(oldStatus: string, newStatus: string): boolean {
    // Notify when entering critical or breached state
    return (newStatus === 'critical' || newStatus === 'breached') &&
           oldStatus !== newStatus;
  }
}
```

### Integration Points

**1. Ticket Creation** (`support.service.ts`):
```typescript
async createTicket(dto: CreateTicketDto) {
  const ticket = await this.prisma.supportTicket.create({
    data: {
      ...dto,
      // Calculate initial SLA deadlines
      responseSLADeadline: await this.slaCalculator.calculateDeadline(
        new Date(),
        this.getSLAHours(dto.priority, 'response')
      ),
      resolutionSLADeadline: await this.slaCalculator.calculateDeadline(
        new Date(),
        this.getSLAHours(dto.priority, 'resolution')
      ),
      responseSLAStatus: 'on_track',
      resolutionSLAStatus: 'on_track'
    }
  });

  return ticket;
}
```

**2. Status Change to waiting_on_user**:
```typescript
async updateStatus(ticketId: string, newStatus: string) {
  const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });

  // Auto-pause SLA
  if (newStatus === 'waiting_on_user' && ticket.status !== 'waiting_on_user') {
    await this.slaCalculator.pauseSLA(ticketId, 'waiting_on_user');
  }

  // Auto-resume SLA
  if (ticket.status === 'waiting_on_user' && newStatus !== 'waiting_on_user') {
    await this.slaCalculator.resumeSLA(ticketId);
  }

  // Update status
  await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: newStatus }
  });
}
```

**3. First Admin Response**:
```typescript
async createMessage(ticketId: string, content: string, authorId: string) {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: true }
  });

  const isFirstAdminResponse = !ticket.messages.some(
    m => m.authorRole.includes('admin')
  );

  if (isFirstAdminResponse) {
    const responseTime = this.slaCalculator.calculateBusinessMinutes(
      ticket.createdAt,
      new Date()
    );

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        actualResponseTime: responseTime,
        responseSLAMet: responseTime <= this.getSLAMinutes(ticket.priority, 'response')
      }
    });
  }

  // Create message...
}
```

**4. Ticket Resolution**:
```typescript
async resolveTicket(ticketId: string, resolution: string) {
  const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });

  const pausedMinutes = ticket.slaPausedAt
    ? this.slaCalculator.calculateBusinessMinutes(ticket.slaPausedAt, new Date())
    : 0;

  const totalResolutionTime = this.slaCalculator.calculateBusinessMinutes(
    ticket.createdAt,
    new Date()
  );

  const actualResolutionTime = totalResolutionTime - pausedMinutes;

  await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'resolved',
      resolution,
      resolvedAt: new Date(),
      actualResolutionTime,
      resolutionSLAMet: actualResolutionTime <= this.getSLAMinutes(ticket.priority, 'resolution')
    }
  });
}
```

---

## Metrics Tracking and Reporting

### Metrics Captured Per Ticket

When a ticket is resolved or closed, the following metrics are recorded:

| Field | Type | Description |
|-------|------|-------------|
| `actualResponseTime` | Int (minutes) | Time from creation to first admin message |
| `actualResolutionTime` | Int (minutes) | Time from creation to resolved (excluding paused time) |
| `responseSLAMet` | Boolean | Was response within SLA target? |
| `resolutionSLAMet` | Boolean | Was resolution within SLA target? |

### Query-Based Reporting

**SLA Compliance Rate by Priority**:
```sql
SELECT
  priority,
  COUNT(*) as total_tickets,
  SUM(CASE WHEN "responseSLAMet" THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as response_sla_rate,
  SUM(CASE WHEN "resolutionSLAMet" THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as resolution_sla_rate
FROM "SupportTicket"
WHERE "resolvedAt" IS NOT NULL
  AND "resolvedAt" >= NOW() - INTERVAL '30 days'
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    WHEN 'feature' THEN 5
  END;
```

**Average Response and Resolution Times**:
```sql
SELECT
  priority,
  AVG("actualResponseTime") / 60 as avg_response_hours,
  AVG("actualResolutionTime") / 60 as avg_resolution_hours,
  COUNT(*) as ticket_count
FROM "SupportTicket"
WHERE "resolvedAt" IS NOT NULL
  AND "resolvedAt" >= NOW() - INTERVAL '30 days'
GROUP BY priority;
```

**Current At-Risk Tickets**:
```sql
SELECT
  id,
  title,
  priority,
  "createdAt",
  "responseSLAStatus",
  "resolutionSLAStatus",
  "responseSLADeadline",
  "resolutionSLADeadline"
FROM "SupportTicket"
WHERE status IN ('open', 'in_progress')
  AND ("responseSLAStatus" IN ('critical', 'breached')
    OR "resolutionSLAStatus" IN ('critical', 'breached'))
ORDER BY
  CASE
    WHEN "responseSLAStatus" = 'breached' THEN 1
    WHEN "resolutionSLAStatus" = 'breached' THEN 2
    WHEN "responseSLAStatus" = 'critical' THEN 3
    WHEN "resolutionSLAStatus" = 'critical' THEN 4
    ELSE 5
  END,
  "createdAt" ASC;
```

### Admin Dashboard Stats

Add to existing `/admin/status` endpoint:

```typescript
interface AdminStatus {
  // ... existing stats ...

  slaHealth: {
    breachedResponse: number;      // Count of tickets with response SLA breached
    breachedResolution: number;    // Count of tickets with resolution SLA breached
    criticalResponse: number;      // Count approaching response SLA breach
    criticalResolution: number;    // Count approaching resolution SLA breach
    complianceRate: {              // Last 30 days
      overall: number;             // % of all SLAs met
      response: number;            // % of response SLAs met
      resolution: number;          // % of resolution SLAs met
    };
  };
}
```

### What's NOT Included

- **Detailed analytics dashboard**: Time-series charts, trends (future enhancement)
- **Per-admin performance tracking**: Individual admin SLA metrics (future enhancement)
- **Automated reports**: Scheduled email reports (future enhancement)
- **SLA forecasting**: Prediction of future breaches (future enhancement)

---

## Holiday Management Interface

### Admin Holiday Management Page

**Route**: `/admin/holidays`
**Access**: Platform admins only

### Holiday List View

**Table Columns**:
- **Date**: Holiday date (sortable)
- **Name**: Holiday name
- **Recurring**: Yes/No badge
- **Actions**: Edit, Delete buttons

**Features**:
- Sorted by date (upcoming holidays first)
- Past holidays shown in muted color
- Search/filter by name
- Pagination (50 per page)

### Add Holiday Form

```typescript
interface HolidayFormData {
  name: string;           // Required, max 100 chars
  date: Date;             // Required, date picker
  isRecurring: boolean;   // Checkbox, default false
}
```

**Form Validation**:
- Name: Required, 3-100 characters
- Date: Required, valid date
- isRecurring: Optional boolean

**Recurring Holiday Behavior**:
- When `isRecurring = true`, system automatically applies to future years
- Example: Christmas (Dec 25, recurring) → applies to 2025, 2026, 2027, etc.
- Non-recurring: One-time closures (e.g., "Office Move Day - June 15, 2025")
- System handles recurring holidays dynamically at calculation time

### Pre-populated Federal Holidays

Seed database with common US federal holidays (all marked as recurring):

```typescript
const FEDERAL_HOLIDAYS = [
  { name: "New Year's Day", date: 'January 1', isRecurring: true },
  { name: "Memorial Day", date: 'Last Monday in May', isRecurring: true },
  { name: "Independence Day", date: 'July 4', isRecurring: true },
  { name: "Labor Day", date: 'First Monday in September', isRecurring: true },
  { name: "Thanksgiving", date: '4th Thursday in November', isRecurring: true },
  { name: "Christmas Day", date: 'December 25', isRecurring: true }
];
```

**Note**: For holidays with variable dates (Memorial Day, Thanksgiving), calculate actual dates for current and next year during seed.

### Admin Actions

**Add New Holiday**:
- Click "Add Holiday" button
- Fill form (name, date, recurring checkbox)
- Submit → Creates holiday in database
- Success message: "Holiday added successfully"

**Edit Holiday**:
- Click edit icon on holiday row
- Modify name, date, or recurring flag
- Submit → Updates holiday
- Warning if editing past holiday: "This is a past date. Changing it may affect historical SLA calculations."

**Delete Holiday**:
- Click delete icon
- Confirmation modal: "Are you sure you want to delete [Holiday Name]?"
- Confirm → Soft delete or hard delete (decision: hard delete, since it's configuration data)
- Warning if deleting past holiday: "This may affect historical SLA calculations. Continue?"

**Bulk Import** (Future Enhancement):
- Upload CSV with holidays
- Format: name,date,isRecurring
- Validates and imports in bulk

### Business Logic Impact

**When Holiday Added**:
- System does NOT automatically recalculate existing ticket deadlines
- Only affects future deadline calculations
- Rationale: Avoids retroactive SLA changes that could confuse admins

**When Holiday Removed**:
- Same as above - does not recalculate existing deadlines
- Only affects future calculations

**When Holiday Edited**:
- If editing date of past holiday → Warning shown
- Does not recalculate existing deadlines
- Admin acknowledges potential impact

**Recurring Holiday Calculation**:
```typescript
function getHolidaysForYear(baseHoliday: Holiday, year: number): Date {
  if (!baseHoliday.isRecurring) {
    return baseHoliday.date; // Return original date only
  }

  // Calculate date for the specified year
  const originalDate = new Date(baseHoliday.date);
  return new Date(year, originalDate.getMonth(), originalDate.getDate());
}
```

### UI Mockup (Text Description)

```
Admin > Holidays

[Add Holiday Button]

+--------------------------------------------------+
| Date       | Name              | Recurring | Actions |
+--------------------------------------------------+
| 2025-12-25 | Christmas Day     | Yes       | Edit Delete |
| 2026-01-01 | New Year's Day    | Yes       | Edit Delete |
| 2025-07-04 | Independence Day  | Yes       | Edit Delete |
| 2025-06-15 | Office Move Day   | No        | Edit Delete |
+--------------------------------------------------+

Add Holiday Form:
[Name: ___________________]
[Date: 📅 ___/___/___]
[☐ Recurring (applies to future years)]
[Add Holiday Button]
```

---

## Implementation Notes

### Technology Stack

- **Backend**: NestJS (existing)
- **Database**: PostgreSQL with Prisma ORM (existing)
- **Scheduling**: `@nestjs/schedule` (already installed)
- **Date/Time**: `date-fns` for business hours calculations
- **Timezone**: `date-fns-tz` for EST/EDT handling

### Dependencies to Install

```bash
cd packages/api
npm install date-fns date-fns-tz
```

### Module Structure

```
packages/api/src/sla/
├── sla.module.ts                  # SLA module definition
├── sla-calculator.service.ts      # Core SLA calculation logic
├── sla.scheduler.ts               # Scheduled SLA status updates
├── sla.controller.ts              # SLA-related endpoints (if needed)
└── dto/
    └── sla-status.dto.ts          # DTOs for SLA data

packages/api/src/holiday/
├── holiday.module.ts              # Holiday module
├── holiday.service.ts             # Holiday CRUD operations
├── holiday.controller.ts          # Holiday management endpoints
└── dto/
    ├── create-holiday.dto.ts
    └── update-holiday.dto.ts
```

### Migration Strategy

1. **Add Holiday model** - New table, no data migration needed
2. **Modify SupportTicket model** - Add new fields:
   - Set default values for existing tickets
   - `responseSLADeadline`, `resolutionSLADeadline`: Calculate retroactively or leave null
   - `responseSLAStatus`, `resolutionSLAStatus`: Default to 'on_track'
   - All other new fields: null for existing tickets
3. **Seed federal holidays** - Run seed script to populate Holiday table
4. **Calculate initial SLA deadlines** - One-time script to set deadlines for open tickets

### Testing Considerations

**Unit Tests**:
- Business hours calculation (various scenarios: weekends, holidays, DST)
- SLA status calculation (all thresholds)
- Pause/resume logic (single and multiple pauses)
- Deadline extension calculations

**Integration Tests**:
- Full ticket lifecycle with SLA tracking
- Holiday management CRUD
- SLA status updater job
- Notification triggering

**Manual Testing Scenarios**:
1. Create urgent ticket → Verify 4-hour response deadline calculated correctly
2. Change status to waiting_on_user → Verify SLA pauses
3. Resume ticket → Verify deadline extended by pause duration
4. Let ticket approach 60% → Verify status changes to "approaching"
5. Let ticket breach SLA → Verify notification sent
6. Add/edit holidays → Verify deadline calculations respect holidays
7. Test across weekend boundary
8. Test during DST transition

### Performance Considerations

**SLA Status Updater Job**:
- Runs every 15 minutes on all active tickets
- For 1000 active tickets: ~1000 deadline calculations per run
- Business hours calculation is expensive (loops through hours)
- **Optimization**: Cache holiday list for 24 hours, refresh daily

**Database Indexes** (already planned in schema):
- `SupportTicket.responseSLADeadline`
- `SupportTicket.resolutionSLADeadline`
- `SupportTicket.responseSLAStatus`
- `SupportTicket.resolutionSLAStatus`
- `Holiday.date`

### Error Handling

**Missing Holidays**:
- If Holiday table is empty → Calculations still work (no holidays excluded)
- Log warning: "No holidays configured, all weekdays count as business days"

**Invalid Ticket Data**:
- If `createdAt` is missing → Use current time as fallback
- If `priority` is invalid → Default to 'medium' SLA targets

**Calculation Failures**:
- If business hours calculation fails → Log error, default to 'on_track' status
- Prevents job from crashing, allows manual investigation

### Logging Strategy

**Log Levels**:
- **DEBUG**: Business hours calculations, SLA status changes
- **INFO**: SLA job start/completion, holiday CRUD actions
- **WARN**: Missing holidays, invalid data, calculation anomalies
- **ERROR**: Job failures, database errors, notification failures

**Key Log Messages**:
```
INFO: "SLA status update job started - processing 847 tickets"
DEBUG: "Ticket ABC123: Response SLA 45% elapsed, status: on_track"
WARN: "Ticket XYZ789: Cannot calculate SLA - missing createdAt timestamp"
ERROR: "SLA status update failed for ticket DEF456: Database connection timeout"
INFO: "SLA status update complete: 42 tickets updated, 3 notifications sent"
```

---

## Future Enhancements

The following features are intentionally excluded from Phase 2B but documented for future consideration:

### Phase 2C or 2D Candidates

1. **Automatic Escalation**
   - Auto-assign unassigned tickets when response SLA breached
   - Auto-escalate to senior admins when resolution SLA breached
   - Configurable escalation rules

2. **Email Notifications**
   - Email alerts for critical/breached SLAs
   - Daily digest of at-risk tickets
   - Weekly SLA performance summary

3. **Dedicated SLA Dashboard**
   - Tab on admin dashboard showing SLA health overview
   - Grouped views: Breached / Critical / Approaching / On Track
   - Count badges and quick filters
   - Real-time metrics

4. **Advanced Analytics**
   - Time-series charts of SLA compliance trends
   - Per-admin performance metrics
   - Breakdown by category, organization, time period
   - SLA forecasting and predictions

5. **Manual SLA Pause/Resume**
   - Admin can manually pause SLA for special circumstances
   - Requires reason (e.g., "Waiting on vendor", "Customer on vacation")
   - Audit trail of manual pauses

6. **Custom SLA Targets per Organization**
   - Allow organizations to have custom SLA targets
   - Premium tier gets faster SLAs
   - Per-org holiday calendars

7. **SLA Reports**
   - Automated weekly/monthly SLA reports
   - Exportable to CSV/PDF
   - Email delivery to admins

8. **Holiday API Integration**
   - Auto-sync holidays from external API (Calendarific, Nager.Date)
   - Automatic updates for new years
   - Multi-country support

9. **Business Hours Customization**
   - Per-organization business hours
   - Different hours for different ticket priorities
   - Support for 24/7 operations

10. **SLA Breached Tickets Archive**
    - Historical view of all breached tickets
    - Root cause analysis
    - Lessons learned tracking

---

## Appendix: Implementation Checklist

**Phase 2B Task Breakdown** (to be detailed in implementation plan):

1. Database Schema Changes
   - Create Holiday model migration
   - Update SupportTicket model migration
   - Seed federal holidays
   - Calculate initial SLA deadlines for open tickets

2. SLA Calculator Service
   - Business hours calculation logic
   - Holiday exclusion logic
   - Deadline calculation
   - SLA status calculation
   - Pause/resume methods

3. SLA Scheduler
   - Setup scheduled job (every 15 minutes)
   - Implement status update logic
   - Notification triggering

4. Backend Integration
   - Ticket creation: Calculate deadlines
   - Status change: Pause/resume logic
   - First admin response: Record response time
   - Ticket resolution: Record metrics

5. Holiday Management API
   - Holiday CRUD endpoints
   - Validation and error handling
   - Access control (platform admin only)

6. Frontend: SLA Indicators
   - Badge component with color logic
   - Countdown timer display
   - Progress bars on ticket detail
   - Hover tooltip with details

7. Frontend: Ticket List Enhancements
   - SLA filter dropdown
   - SLA sort option
   - Badge display in list view

8. Frontend: Holiday Management UI
   - Holiday list page
   - Add/edit/delete forms
   - Validation and error handling

9. Admin Dashboard Integration
   - Add SLA health stats to /admin/status
   - Display breach counts

10. Testing
    - Unit tests for calculator service
    - Integration tests for full flow
    - Manual testing scenarios

11. Documentation
    - Update API documentation
    - Admin user guide for holiday management
    - SLA policy documentation for users

12. Deployment
    - Run migrations
    - Seed holidays
    - Monitor first few scheduled job runs
    - Adjust cron frequency if needed

---

**End of Design Document**

Total word count: ~8,500 words
