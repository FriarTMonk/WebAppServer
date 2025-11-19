# Support Ticket System - Summary

## Overview

A comprehensive multi-tenant support ticket system built for MyChristianCounselor, providing intelligent ticket management with AI-powered features, SLA tracking, and role-based access control.

## Technology Stack

- **Backend:** NestJS + Prisma + PostgreSQL
- **Frontend:** Next.js 13+ (App Router) + React + TypeScript
- **AI:** Claude 3.5 (Haiku for priority, Sonnet for similarity)
- **Email:** Postmark integration
- **Scheduling:** @nestjs/schedule for background jobs

---

## Current Features (Phase 1 + 2A + 2B)

### Core Ticketing (Phase 1 - MVP)
- Create, view, update, and resolve support tickets
- Multi-tenant: Individual users and organization members
- Role-based routing: Users → Platform Admin, Org Members → Org Admin
- Message threads with admin/user conversation
- File attachments (images)
- Ticket status workflow (open → in_progress → waiting_on_user → resolved → closed)
- Manual ticket linking (duplicate_of, related_to, blocks, blocked_by)
- Email notifications (ticket created, resolved)

### AI Features (Phase 2A)
- **Automatic Priority Detection:** AI analyzes title/description and assigns priority (urgent/high/medium/low/feature)
- **Similar Ticket Detection:** Real-time and weekly batch similarity analysis to surface duplicates and related tickets
- **Intelligent Ticket Linking:** AI suggests related tickets with similarity scores (60-100%)

### SLA Tracking (Phase 2B)
- **Dual SLA Tracking:** Response time (first admin reply) and resolution time (ticket closed)
- **Priority-Based Targets:**
  - Urgent: 4 hours response / 1 day resolution
  - High: 1 day response / 5 days resolution
  - Medium: 3 days response / 30 days resolution
  - Low: 5 days response / 90 days resolution
  - Feature: 5 days response / no resolution SLA
- **Business Hours Calculation:** Mon-Fri 10 AM - 10 PM EST, excluding federal holidays
- **Status Indicators:** on_track → approaching (60%) → critical (80%) → breached (100%)
- **Auto-Pause:** SLA automatically pauses when waiting on user
- **SLA Scheduler:** Background job runs every 15 minutes to update ticket statuses
- **SLA Metrics:** Tracks response/resolution times and compliance rates
- **Holiday Management:** Admin interface to manage business holidays
- **Dashboard Integration:** SLA health stats on admin dashboard (breached count, compliance rates)

---

## User Roles & Permissions

| Feature | User | Org Admin | Platform Admin |
|---------|------|-----------|----------------|
| Create tickets | ✓ | ✓ | ✓ |
| View own tickets | ✓ | ✓ (org members) | ✓ (all) |
| Reply to tickets | ✓ | ✓ | ✓ |
| Assign tickets | ✗ | ✓ | ✓ |
| Change status | ✗ | ✓ | ✓ |
| Resolve/close | ✗ | ✓ | ✓ |
| Manage holidays | ✗ | ✗ | ✓ |
| View SLA stats | ✗ | ✗ | ✓ |

---

## Admin Capabilities

### Ticket Management
- View all tickets with advanced filtering (status, priority, category, SLA status, assignment)
- Sort by creation date, update date, priority, or SLA urgency
- Assign tickets to specific admins
- Change ticket status and priority
- Add internal notes (not visible to users)
- Link related tickets manually
- Resolve tickets with resolution summary

### SLA Management
- View SLA status badges (color-coded indicators)
- Monitor approaching/critical/breached tickets
- Access detailed SLA tooltips with countdown timers
- Manage holiday calendar (add/edit/delete holidays)
- Track SLA compliance metrics on dashboard

### AI Features
- Review AI-suggested priority assignments
- Manually override AI priority if needed
- Browse AI-suggested similar tickets
- Accept or dismiss similarity suggestions
- Link tickets based on AI recommendations

---

## Future Enhancements

### Phase 2C: Notifications & Reporting (Planned)
- Email alerts for critical/breached SLAs
- Daily digest of at-risk tickets
- Weekly SLA performance summaries
- Dedicated analytics dashboard with time-series charts
- Automated report generation (PDF/CSV export)
- Per-admin performance metrics

### Phase 2D: Advanced Automation (Planned)
- Automatic escalation rules and workflows
- Custom SLA targets per organization
- Organization-specific holiday calendars
- Tier-based SLA benefits (premium/enterprise)
- Holiday API integration (auto-sync)
- Manual SLA pause/resume with audit trail
- Breached tickets archive with root cause analysis

---

## Key Statistics (Current Implementation)

- **Database Tables:** 10 models (SupportTicket, TicketMessage, TicketAttachment, TicketLink, TicketSimilarity, Holiday, OrganizationSLAProfile)
- **API Endpoints:** 15+ REST endpoints
- **Frontend Pages:** 3 admin pages (ticket list, ticket detail, holiday management)
- **Background Jobs:** 3 scheduled tasks (SLA updater, similarity batch, cleanup)
- **Lines of Code:** ~5,000 backend + ~2,000 frontend
- **Implementation Time:** Phase 1: 2 weeks, Phase 2A: 1 week, Phase 2B: 1 week

---

## Branch & Deployment

- **Development Branch:** `feature/support-ticket-system` (git worktree: `.worktrees/support-ticket-system`)
- **Status:** Ready for merge and deployment
- **Migrations:** All database migrations applied and tested
- **Tests:** Manual testing completed, TypeScript compilation passing

---

**Last Updated:** 2025-11-19
**Current Phase:** Phase 2B Complete
**Next Phase:** Phase 2C (Planned for future development)
