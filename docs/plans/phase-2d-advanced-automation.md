# Phase 2D: Advanced Automation & Customization

**Timeline:** Months 7-8
**Status:** Planned
**Prerequisites:** Phase 2C (Notifications & Reporting) Complete

## Overview

Phase 2D adds intelligent automation and organization-specific customization. The system will automatically escalate critical tickets, support custom SLA targets for different organizations, and provide advanced administrative controls.

---

## 1. Automatic Escalation

### 1.1 Escalation Rules Engine

**Trigger Conditions:**
- **Response SLA Breached + Unassigned** → Auto-assign to next available admin
- **Resolution SLA Breached** → Auto-escalate to senior admin
- **Critical Priority + 4 Hours Open + Unassigned** → Immediate escalation
- **Ticket reopened 3+ times** → Escalate for quality review

**Escalation Levels:**
1. **Level 1:** Available platform admins (round-robin assignment)
2. **Level 2:** Senior platform admins (flagged in user profile)
3. **Level 3:** Manual notification to system administrator email

**Configurable Settings:**
- Enable/disable automatic escalation globally
- Set escalation thresholds per priority level
- Define admin availability schedules
- Configure escalation notifications (email, in-app, SMS)

### 1.2 Escalation Workflow

**When Escalation Triggered:**
1. Ticket marked as `isEscalated: true`
2. `escalatedAt` timestamp recorded
3. Notification sent to receiving admin
4. Original admin notified of escalation
5. Audit log entry created
6. SLA clock continues (no pause)

**Admin Actions:**
- Accept escalation → becomes assigned admin
- Reject escalation → returns to queue with reason
- Reassign escalation → delegate to another admin

### 1.3 Escalation Dashboard
**New Route:** `/admin/support/escalations`

**View Sections:**
- Pending escalations (awaiting acceptance)
- Active escalated tickets
- Escalation history (last 30 days)
- Escalation statistics by reason
- Admin escalation acceptance rate

---

## 2. Custom SLA Targets per Organization

### 2.1 Organization SLA Profiles

**Database Schema Addition:**
```prisma
model OrganizationSLAProfile {
  id                    String   @id @default(uuid())
  organizationId        String   @unique

  // Custom response SLA targets (in hours)
  urgentResponse        Int      @default(4)
  highResponse          Int      @default(24)
  mediumResponse        Int      @default(72)
  lowResponse           Int      @default(120)
  featureResponse       Int      @default(120)

  // Custom resolution SLA targets (in hours)
  urgentResolution      Int      @default(24)
  highResolution        Int      @default(120)
  mediumResolution      Int      @default(720)
  lowResolution         Int      @default(2160)
  featureResolution     Int?     // null = no SLA

  // Custom business hours
  businessHoursStart    Int      @default(10)  // 10 AM
  businessHoursEnd      Int      @default(22)  // 10 PM
  timezone              String   @default("America/New_York")
  weekdays              Int[]    @default([1, 2, 3, 4, 5]) // Mon-Fri

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organization          Organization @relation(fields: [organizationId], references: [id])
}
```

**Fallback Logic:**
- If organization has custom SLA profile → use it
- Otherwise → use default system SLA targets

### 2.2 Custom Holiday Calendars

**Per-Organization Holidays:**
- Organizations can define their own holidays
- Inherits federal holidays + adds custom ones
- Use cases: Regional holidays, organization-specific closures

**Database Schema Addition:**
```prisma
model OrganizationHoliday {
  id              String       @id @default(uuid())
  organizationId  String
  name            String
  date            DateTime
  isRecurring     Boolean      @default(false)
  createdAt       DateTime     @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, date])
}
```

**SLA Calculator Updates:**
- Check both federal holidays AND organization-specific holidays
- Cache per-organization for performance

### 2.3 Tier-Based SLA Targets

**Premium Tier Benefits:**
- Faster SLA targets (e.g., 2 hour response instead of 4 for urgent)
- Extended business hours coverage (e.g., 8 AM - 11 PM)
- Weekend support availability
- Dedicated admin assignment

**Organization Tiers:**
- **Standard:** Default SLA targets
- **Premium:** 25% faster SLAs
- **Enterprise:** 50% faster SLAs + custom configurations

---

## 3. Advanced Automation Features

### 3.1 Holiday API Integration

**External Holiday Services:**
- Integrate with [Calendarific API](https://calendarific.com/) or [Nager.Date API](https://date.nager.at/)
- Automatically fetch holidays for upcoming year
- Support multiple countries/regions
- Annual sync job (January 1st each year)

**Benefits:**
- No manual holiday entry required
- Always up-to-date with official holidays
- Multi-country support for global operations

**Implementation:**
- Background job: Sync holidays annually
- Store in Holiday table with `source: 'api'` flag
- Admin can override or add custom holidays

### 3.2 Manual SLA Pause/Resume

**Use Cases:**
- Customer on vacation → pause SLA
- Waiting on third-party vendor → pause SLA
- Customer explicitly requests delay → pause SLA

**Admin Controls:**
- Manual "Pause SLA" button on ticket detail
- Required fields:
  - Reason (dropdown + custom text)
  - Expected resume date (optional)
- Pause recorded with admin ID and timestamp
- Resume can be manual or automatic on status change

**Pause Reasons:**
- Waiting on customer (scheduled)
- Waiting on vendor/third-party
- Customer vacation/unavailable
- Requires internal approval
- Blocked by external factor
- Custom reason (text input)

**Audit Trail:**
- All manual pauses logged
- Include: Who paused, when, why, duration
- Display in ticket timeline
- Include in SLA metrics reports

### 3.3 SLA Breached Tickets Archive

**Purpose:** Historical analysis and continuous improvement

**Archive Contents:**
- All tickets that breached SLA (ever)
- Breach timestamp and duration over SLA
- Resolution details
- Root cause (if provided by admin)
- Lessons learned (admin notes)

**Archive Dashboard:**
**Route:** `/admin/support/breached-archive`

**Features:**
- Searchable table of all breached tickets
- Filters: Date range, priority, category, admin, organization
- Metrics:
  - Total breached tickets
  - Most common breach reasons
  - Average time over SLA
  - Repeat offenders (categories/orgs with high breach rate)

**Root Cause Analysis:**
- Admin can add "breach reason" when closing ticket
- Predefined reasons: Insufficient staffing, Complex issue, Customer delay, System outage, Miscommunication
- Free-text lessons learned field
- Used for process improvement

---

## Implementation Tasks

### Phase 2D-1: Automatic Escalation (Weeks 1-3)
1. Design escalation rules engine
2. Implement escalation triggers
3. Build admin assignment logic
4. Create escalation notifications
5. Build escalation dashboard
6. Add escalation audit logging
7. Test escalation scenarios

### Phase 2D-2: Custom SLA Profiles (Weeks 4-5)
1. Create OrganizationSLAProfile model
2. Add organization SLA configuration UI
3. Update SLA calculator to use custom profiles
4. Create organization holiday model
5. Add organization holiday management UI
6. Test with multiple organizations

### Phase 2D-3: Advanced Automation (Weeks 6-7)
1. Integrate holiday API service
2. Build annual sync job
3. Add manual pause/resume UI
4. Implement pause audit trail
5. Create breached tickets archive
6. Build root cause tracking
7. Test automation features

### Phase 2D-4: Testing & Polish (Week 8)
1. End-to-end testing all features
2. Performance optimization
3. Documentation updates
4. Admin training materials
5. Deployment preparation

---

## Success Metrics

- Escalation system handles 90%+ of breached unassigned tickets automatically
- Custom SLA profiles configured for 100% of premium/enterprise organizations
- Holiday API sync reduces manual holiday management by 80%
- Breached ticket archive used for monthly process improvement reviews
- Average SLA compliance improves by 15% through better automation

---

## Configuration & Settings

**Platform Admin Controls:**
- Enable/disable auto-escalation globally
- Configure escalation rules and thresholds
- Manage default SLA targets
- Configure holiday API credentials
- Set system business hours

**Organization Admin Controls:**
- Configure custom SLA targets (if allowed by tier)
- Manage organization-specific holidays
- Set organization business hours
- Configure escalation preferences

---

## Future Enhancements (Phase 3+)

- Machine learning for SLA target recommendations
- Predictive escalation (before breach occurs)
- Auto-assignment based on admin expertise/workload
- Customer self-service SLA visibility
- SLA gamification for admin motivation
- Integration with external calendars (Google, Outlook)

---

**Document Version:** 1.0
**Created:** 2025-11-19
**Owner:** MyChristianCounselor Development Team
