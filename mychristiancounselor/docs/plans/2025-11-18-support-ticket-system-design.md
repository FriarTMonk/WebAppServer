# Support Ticket System - Design Document

**Date:** 2025-11-18
**Status:** Design Complete, Ready for Implementation
**Author:** Collaborative Design Session

---

## Executive Summary

Multi-tenant support ticket system with intelligent AI-powered routing, priority detection, and escalation workflows. Designed specifically for MyChristianCounselor's organizational structure with individual users, organization members, organization admins, and platform admins.

**Key Differentiators:**
- AI analyzes ticket descriptions to auto-assign priority
- Composite Work Priority score (priority + age + impact)
- AI suggests related tickets for pattern detection
- Multi-tier support: Individual → Platform Admin, Org Member → Org Admin → Platform Admin
- Business hours SLA tracking with holiday support
- Daily digest emails for admins

---

## 1. System Overview & Architecture

**Purpose:** Multi-tenant support ticket system with intelligent routing, AI-powered prioritization, and escalation workflows.

**Core Architecture:**
- **Backend:** NestJS module (`SupportModule`) with `SupportService` and `SupportController`
- **Database:** PostgreSQL via Prisma (4 new models: `SupportTicket`, `TicketMessage`, `TicketAttachment`, `TicketLink`)
- **AI Integration:** Claude API for priority detection and ticket similarity analysis
- **Email:** Postmark integration (reuse existing `EmailService`)
- **Notifications:** In-app notifications (reuse existing `Notification` model)
- **Storage:** Local filesystem or S3 for image attachments

**Multi-Tenant Routing:**
1. **Individual users** create tickets → visible to all platform admins (unassigned pool)
2. **Organization members** create tickets → visible to all org admins of that organization
3. **Org admins** can escalate tickets → transfers to platform admin pool
4. **First-to-claim assignment:** Admins manually claim tickets from their respective pools

**Key Differentiators:**
- AI analyzes ticket descriptions to auto-assign priority levels
- Composite Work Priority score (priority + age + impact) for intelligent sorting
- AI suggests related tickets to identify patterns
- Tiered visibility: users see responses, admins see internal notes
- Role-specific ticket categories

---

## 2. Database Schema

### SupportTicket (Main ticket entity)

```prisma
model SupportTicket {
  id                       String    @id @default(uuid())
  title                    String
  description              String    @db.Text
  createdById              String
  assignedToId             String?   // Null until admin claims
  organizationId           String?   // Null for individual users

  category                 String    // Role-specific categories
  status                   String    @default("open") // open, in_progress, waiting_on_user, escalated, resolved, closed, rejected
  aiPriority               String    @default("none") // urgent, high, medium, none, low, feature
  workPriorityScore        Float     @default(0) // Calculated: (priority × 10) + (age × 2) + (orgSize × 0.5)
  tags                     String[]  @default([]) // Additional tagging

  isEscalated              Boolean   @default(false)
  escalatedAt              DateTime?
  escalatedById            String?
  escalatedFromOrgId       String?   // Track which org it came from
  escalationRejectedAt     DateTime? // When escalation was rejected
  escalationRejectedById   String?   // Platform admin who rejected escalation
  escalationRejectionReason String?  // Why escalation was rejected

  slaDeadline              DateTime? // Based on priority
  resolvedAt               DateTime?
  closedAt                 DateTime?
  closedById               String?   // Admin who closed/rejected
  rejectionReason          String?   // Why ticket was rejected

  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  // Relations
  createdBy                User              @relation("TicketsCreated", fields: [createdById], references: [id])
  assignedTo               User?             @relation("TicketsAssigned", fields: [assignedToId], references: [id])
  organization             Organization?     @relation(fields: [organizationId], references: [id])
  messages                 TicketMessage[]
  attachments              TicketAttachment[]
  linksFrom                TicketLink[]      @relation("SourceTicket")
  linksTo                  TicketLink[]      @relation("TargetTicket")

  @@index([workPriorityScore])
  @@index([status])
  @@index([createdAt])
  @@index([assignedToId])
  @@index([organizationId])
  @@index([aiPriority])
  @@index([slaDeadline])
}
```

### TicketMessage (Responses & internal notes)

```prisma
model TicketMessage {
  id          String   @id @default(uuid())
  ticketId    String
  authorId    String
  authorRole  String   // 'user', 'org_admin', 'platform_admin'
  content     String   @db.Text
  isInternal  Boolean  @default(false) // Internal admin notes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ticket      SupportTicket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author      User                 @relation(fields: [authorId], references: [id])
  attachments TicketAttachment[]

  @@index([ticketId])
  @@index([createdAt])
}
```

### TicketAttachment (Images only)

```prisma
model TicketAttachment {
  id           String   @id @default(uuid())
  ticketId     String
  messageId    String?  // Attached to specific message or ticket itself
  fileName     String
  filePath     String
  fileSize     Int      // Bytes
  mimeType     String   // image/png, image/jpeg
  uploadedById String
  createdAt    DateTime @default(now())

  ticket       SupportTicket  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  message      TicketMessage? @relation(fields: [messageId], references: [id], onDelete: Cascade)
  uploadedBy   User           @relation(fields: [uploadedById], references: [id])

  @@index([ticketId])
  @@index([messageId])
}
```

### TicketLink (Relationships between tickets)

```prisma
model TicketLink {
  id              String   @id @default(uuid())
  sourceTicketId  String
  targetTicketId  String
  relationship    String   // 'duplicate_of', 'related_to', 'blocks', 'blocked_by'
  aiSuggested     Boolean  @default(false) // True if AI suggested this link
  createdById     String
  createdAt       DateTime @default(now())

  sourceTicket    SupportTicket @relation("SourceTicket", fields: [sourceTicketId], references: [id], onDelete: Cascade)
  targetTicket    SupportTicket @relation("TargetTicket", fields: [targetTicketId], references: [id], onDelete: Cascade)
  createdBy       User          @relation(fields: [createdById], references: [id])

  @@unique([sourceTicketId, targetTicketId, relationship])
  @@index([sourceTicketId])
  @@index([targetTicketId])
}
```

---

## 3. User Workflows & Data Flow

### Workflow 1: Individual User Creates Ticket

1. User clicks "Get Support" → sees role-specific categories (Technical Issue, Account Help, Billing Question, Feature Request)
2. User fills form: title, description, category, optional images (max 3, 5MB each)
3. **Submit** → Backend creates `SupportTicket`:
   - `createdById` = user.id
   - `organizationId` = null (individual user)
   - `status` = "open"
   - AI analyzes description → sets `aiPriority` (urgent/high/medium/low/feature/none)
   - Calculate `workPriorityScore` = (priority × 10) + (0 days × 2) + (0 × 0.5)
   - Calculate `slaDeadline` based on priority
4. AI analyzes for similar tickets → creates `TicketLink` suggestions (aiSuggested=true)
5. Email notification → all platform admins
6. Ticket appears in **Platform Admin unassigned pool**, sorted by workPriorityScore

### Workflow 2: Organization Member Creates Ticket

1. Org member clicks "Get Support" → sees org-specific categories
2. Same form as above
3. **Submit** → Backend creates `SupportTicket`:
   - `organizationId` = user's organization
   - Calculate `workPriorityScore` with orgSize factor
4. Email notification → all org admins of that organization
5. Ticket appears in **Org Admin pool** for that organization

### Workflow 3: Admin Claims & Responds

1. Admin views ticket list (sorted by workPriorityScore DESC)
2. Admin clicks "Assign to Me" → `assignedToId` = admin.id, `status` = "in_progress"
3. Admin writes response (public or internal):
   - **Public response:** `TicketMessage` with `isInternal=false`
   - **Internal note:** `TicketMessage` with `isInternal=true`
4. If public response → `status` = "waiting_on_user", email notification to user

### Workflow 4: Org Admin Escalates to Platform Admin

1. Org admin clicks "Escalate to Platform Admin"
2. Backend updates `SupportTicket`:
   - `isEscalated` = true
   - `status` = "escalated"
   - `assignedToId` = null
   - `organizationId` = null
3. Email notification → all platform admins
4. Ticket appears in **Platform Admin pool**

### Workflow 5: Ticket Resolution

1. Admin marks "Resolved" → `status` = "resolved", `resolvedAt` = now()
2. Email notification to user
3. User can confirm → `status` = "closed"
4. Auto-close after 7 days if no response

### Workflow 6: Admin Rejects Ticket

1. Admin clicks "Reject Ticket" → provides reason
2. `status` = "rejected", `rejectionReason` = explanation
3. Email notification to user with reason

### Workflow 7: Platform Admin Rejects Escalation

1. Platform admin clicks "Reject Escalation & Return to Organization"
2. `status` = "in_progress", `isEscalated` = false
3. `organizationId` restored, back to org admin pool
4. Email notification to org admins with reason and guidance

---

## 4. AI Integration

### Automatic Priority Detection

**Prompt Template:**
```
You are analyzing a support ticket to determine its priority level.

Based on the user's description, classify into ONE priority level:

- **urgent** (11 points): App completely down, cannot access system
- **high** (9 points): App unusable, critical features broken
- **medium** (6 points): App glitchy, features work with issues
- **low** (2 points): Non-critical issue, minor inconvenience
- **feature** (1 point): Feature request, enhancement
- **none** (3 points): Cannot determine, needs more information

User's description:
"""
{ticket.description}
"""

Respond with ONLY the priority level. No explanation.
```

**Implementation:**
- Use existing `AiService`
- Call Claude API with ticket description
- Parse response → set `aiPriority` field
- If API fails → default to `none` (3 points)
- Admin can override

### Ticket Similarity Detection

**Process:**
1. Fetch last 100 open/in_progress tickets
2. Send to AI with prompt asking for similar tickets
3. AI returns JSON array of related ticket IDs with relationship types
4. Create `TicketLink` records with `aiSuggested=true`
5. Display suggestions to admin
6. Admin can accept or dismiss

---

## 5. Work Priority Calculation & SLA Tracking

### Work Priority Score

**Formula:**
```
Work Priority Score = (Priority × 10) + (Age in days × 2) + (Org Size × 0.5)
```

**Priority Values:**
- `urgent` = 11 → 110 points base
- `high` = 9 → 90 points base
- `medium` = 6 → 60 points base
- `none` = 3 → 30 points base
- `low` = 2 → 20 points base
- `feature` = 1 → 10 points base

**Recalculation:**
- Nightly cron job at 2 AM
- On ticket update events
- Ensures old tickets don't get forgotten

### SLA Tracking

**Business Hours:** Monday-Friday, 9:00 AM - 5:00 PM (8 hours/day)

**SLA Timeframes:**
- `urgent`: **1 business day** (8 business hours)
- `high`: **1 week** (5 business days / 40 business hours)
- `medium`: **30 calendar days**
- `low`: **90 calendar days**
- `feature`: **No SLA** (roadmap tracking)
- `none`: **30 calendar days** (default)

**Federal Holidays (US):**
- New Year's Day, MLK Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas
- When holiday falls on weekend → observed Friday or Monday
- State holidays: Configurable (Phase 2)

**SLA Status Indicators:**
- 🟢 **Green:** >25% time remaining (compliant)
- 🟡 **Yellow:** 10-25% time remaining (approaching)
- 🔴 **Red:** Past deadline (breached)

**Business Hours Calculation:**
- Skip weekends (Saturday, Sunday)
- Skip federal holidays
- Only count 9am-5pm hours
- Example: Ticket created Friday 4pm, urgent (8 hours) → deadline Monday 4pm

---

## 6. Access Control & Permissions

### Permission Matrix

| Action | Individual User | Org Member | Org Admin | Platform Admin |
|--------|----------------|------------|-----------|----------------|
| Create ticket | ✅ | ✅ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ | ✅ |
| View all org tickets | ❌ | ❌ | ✅ (own org) | ✅ (all orgs) |
| View platform tickets | ❌ | ❌ | ❌ | ✅ |
| Assign ticket | ❌ | ❌ | ✅ (to self) | ✅ (to self) |
| View internal notes | ❌ | ❌ | ✅ (assigned) | ✅ (assigned) |
| Add internal notes | ❌ | ❌ | ✅ (assigned) | ✅ (assigned) |
| Escalate ticket | ❌ | ❌ | ✅ (assigned) | ❌ |
| Reject escalation | ❌ | ❌ | ❌ | ✅ |
| Reject ticket | ❌ | ❌ | ✅ (assigned) | ✅ (assigned) |

### Key Access Rules

1. **Ticket Visibility:** Platform admins see all, org admins see own org, users see own tickets
2. **Internal Notes:** Only visible to admins with assigned tickets
3. **Escalation:** Org admins can escalate to platform, platform cannot escalate further
4. **Rejection:** Admins can reject tickets or escalations with justification

---

## 7. Email & Notification System

### Email Triggers (Selective - Critical Events Only)

**Via Postmark Integration:**

1. **Ticket Created** → Notify admins (org or platform)
2. **Ticket Resolved** → Notify user
3. **Ticket Escalated** → Notify platform admins
4. **Escalation Rejected** → Notify org admins
5. **Ticket Rejected** → Notify user

**All other updates:** In-app notifications only

### Daily Digest Email

**Sent to:** All admins (platform and org)
**Schedule:** 8:00 AM Monday-Friday (business days)
**Frequency:** Daily (user can opt to weekly or disable)

**Digest Contents:**
- 📊 Ticket overview (total open, in progress, waiting on user, escalated)
- 🚨 SLA breached tickets (past deadline)
- ⏰ SLA approaching tickets (<25% time remaining)
- 🔥 High priority tickets (urgent, high)
- 📈 Tickets by status (unassigned, assigned to you, assigned to others)
- 📂 Tickets by category breakdown
- 📊 Yesterday's activity (created, resolved, escalated, avg response time)

**User Preferences:**
- Enable/disable digest
- Frequency: daily or weekly
- Only send when relevant (skip if no open tickets)

**Cron Schedule:** `@Cron('0 8 * * 1-5')` // 8 AM, Mon-Fri

---

## 8. Search, Filtering & Analytics

### Search & Filtering

**Full-text search:** Title, description, messages, tags

**Filters:**
- Status: Open, In Progress, Waiting on User, Escalated, Resolved, Closed, Rejected
- Priority: Urgent, High, Medium, Low, Feature, None
- Assignment: All, Unassigned, Assigned to Me, Assigned to Others
- SLA: Breached, Approaching, Compliant
- Category: Role-specific categories
- Date: Last 24h, 7d, 30d, custom range
- Organization: (Platform admin only)
- Tags: Multi-select

### Analytics Dashboard

**Platform Admin Metrics:**
- Total open/in progress/escalated tickets
- Tickets resolved this week/month
- Tickets by priority breakdown
- SLA metrics (compliant, approaching, breached, compliance %)
- Avg first response time / avg resolution time (by priority)
- Escalation metrics (total, rate, rejected)
- Top organizations by ticket count
- Duplicate/related tickets linked

**Organization Admin Metrics:**
- Scoped to organization only
- Total open/resolved tickets
- Avg resolution time
- Tickets by category/priority
- Escalated/rejected escalations
- SLA compliance rate

**Charts:**
1. Tickets by Priority (Pie chart)
2. Tickets by Status (Bar chart)
3. Resolution Time Trend (Line chart - 30 days)
4. SLA Compliance (Gauge chart)
5. Category Distribution (Horizontal bar chart)
6. Escalation Rate (Line chart - 3 months)

**Export:**
- CSV export of search results
- PDF analytics report
- Scheduled email reports (weekly/monthly)

---

## 9. Frontend Components

### User Pages

**1. Create Ticket (`/support`)**
- Form: title, description, category, attachments (max 3 images, 5MB each)
- Role-specific category dropdown
- Rich text editor for description
- Image upload with preview

**2. My Tickets List (`/support/tickets`)**
- Table: #, Title, Status, Priority, Category, Created, Last Update
- Sort by date, priority, status
- Filter by status, priority, category
- Search by keyword

**3. Ticket Detail (`/support/tickets/:id`)**
- Header: title, status, priority, created date
- Original description + attachments
- Message thread (conversation history)
- Reply form (rich text + attachments)
- Actions: Confirm Resolution, Reopen

### Admin Pages

**4. Admin Dashboard (`/admin/support`)**
- Metric cards: Open, Assigned to You, SLA Breached, Resolved Today
- Ticket queue (sorted by workPriorityScore)
- Filters sidebar (status, priority, assignment, SLA, tags)
- Quick actions: Assign to Me, View

**5. Admin Ticket Detail (`/admin/support/tickets/:id`)**
- Ticket header with admin actions (Claim, Escalate, Reject, Resolve)
- Metadata sidebar: priority, work score, category, SLA, created by, org, tags
- Message thread (public + internal notes)
- Reply form with "Internal Note" checkbox
- Related tickets panel (AI suggestions)
- Actions: Link tickets, add tags, change status/priority

**6. Analytics Dashboard (`/admin/support/analytics`)**
- Metrics overview cards
- Charts: SLA compliance, priority mix, resolution time, category distribution, escalation trend
- Date range selector
- Export to PDF

---

## 10. API Endpoints

### Base Route: `/api/support`

### User Endpoints

- `POST /tickets` - Create ticket
- `GET /tickets` - Get my tickets (with filters)
- `GET /tickets/:id` - Get ticket detail
- `POST /tickets/:id/messages` - Reply to ticket
- `POST /tickets/:id/confirm-resolution` - Confirm resolution
- `POST /tickets/:id/reopen` - Reopen ticket

### Admin Endpoints

- `GET /admin/tickets` - Get admin ticket queue (with extensive filters)
- `POST /admin/tickets/:id/assign` - Assign ticket to self
- `PATCH /admin/tickets/:id/status` - Update status
- `PATCH /admin/tickets/:id/priority` - Update priority
- `POST /admin/tickets/:id/internal-notes` - Add internal note
- `POST /admin/tickets/:id/respond` - Add public response
- `POST /admin/tickets/:id/escalate` - Escalate (org admin)
- `POST /admin/tickets/:id/reject-escalation` - Reject escalation (platform admin)
- `POST /admin/tickets/:id/reject` - Reject ticket
- `POST /admin/tickets/:id/tags` - Add tags
- `POST /admin/tickets/:id/links` - Link tickets
- `DELETE /admin/tickets/:id/links/:linkId` - Remove link
- `POST /admin/tickets/:id/accept-suggestion/:linkId` - Accept AI suggestion
- `DELETE /admin/tickets/:id/suggestions/:linkId` - Dismiss AI suggestion

### Analytics Endpoints

- `GET /admin/analytics/metrics` - Get support metrics
- `GET /admin/analytics/export` - Export tickets (CSV)
- `POST /admin/analytics/report` - Generate report (PDF)

### Cron Jobs (Internal)

- **Daily Digest:** 8 AM Mon-Fri → `SupportService.generateDailyDigest()`
- **Recalculate Priority:** 2 AM Daily → `SupportService.recalculateAllWorkPriorities()`
- **Auto-Close Resolved:** Every hour → `SupportService.autoCloseResolvedTickets()`

---

## Implementation Phases

### Phase 1 (MVP - 2-3 days)
- Database models and migrations
- Basic CRUD endpoints (create, view, respond, resolve)
- Simple priority assignment (manual, no AI)
- Email notifications (ticket created, resolved)
- Basic frontend (create ticket, view tickets, admin dashboard)
- Manual work priority calculation

### Phase 2 (AI & Advanced Features - 2-3 days)
- AI priority detection
- AI ticket similarity detection
- Work priority auto-recalculation (cron job)
- Ticket linking (manual + AI suggestions)
- Internal notes
- Escalation workflows
- Rejection workflows
- Tags

### Phase 3 (Analytics & Polish - 1-2 days)
- SLA tracking with business hours
- Holiday calendar
- Analytics dashboard
- Search and advanced filtering
- Daily digest emails
- Export functionality (CSV, PDF)

### Phase 4 (Future Enhancements)
- Real-time updates (WebSocket)
- Canned responses
- Email-to-ticket parsing
- Advanced SLA rules (per-organization)
- Custom ticket forms
- Knowledge base integration

---

## Success Metrics

**After 30 Days:**
- Avg first response time < 4 hours (urgent), < 24 hours (high)
- SLA compliance rate > 90%
- Escalation rate < 15%
- Ticket reopen rate < 10%
- User satisfaction rating > 4/5

**After 90 Days:**
- Duplicate ticket detection accuracy > 80%
- AI priority accuracy > 85%
- Avg resolution time reduced by 25%
- Support ticket volume growth < 10% (efficient resolution)

---

## Risk Mitigation

**Risk 1: AI Priority Misclassification**
- Mitigation: Admin can override AI priority
- Track AI accuracy, retrain prompts if needed

**Risk 2: SLA Breach Overload**
- Mitigation: Work priority auto-escalates old tickets
- Daily digest highlights breached tickets

**Risk 3: Escalation Abuse**
- Mitigation: Platform admin can reject escalations
- Track escalation rejection rate per org

**Risk 4: Email Spam**
- Mitigation: Selective emails (critical events only)
- Rate limiting (max 1 email/hour per ticket)
- User preferences (opt-out of digests)

---

## Conclusion

This support ticket system provides enterprise-grade ticketing with AI-powered intelligence, multi-tenant security, and intelligent routing. It's designed to scale with the platform while maintaining simplicity for users.

**Next Steps:**
1. Review and approve design
2. Create implementation plan
3. Set up git worktree for isolated development
4. Begin Phase 1 (MVP) implementation

---

**Design Approved:** [Pending]
**Implementation Start Date:** [TBD]
