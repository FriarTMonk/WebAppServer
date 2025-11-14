# Administrative Dashboards Design

**Date:** 2025-11-14
**Status:** Design Complete - Ready for Implementation
**Owner:** Platform Team

## Overview

This document outlines the design for two administrative dashboard systems:
1. **Platform Admin Dashboard** - For MyChristianCounselor operators to manage the entire platform
2. **Organization Admin Dashboard** - For church/ministry leaders to manage their organizations

Both dashboards provide visibility into system health, business metrics, and management capabilities with appropriate access controls and audit trails.

## Architecture

### Two-Dashboard System

**Platform Admin Dashboard (`/admin/*`)**
- Accessed by members of the "Platform Admin" system organization
- System-wide visibility across all users, organizations, and metrics
- User morphing capability with full audit trail
- Administrative actions: license management, user deactivation, system configuration

**Organization Admin Dashboard (`/org/:orgId/admin/*`)**
- Accessed by organization owners/admins via existing RBAC
- Scoped to their specific organization only
- Member management, org-specific metrics, license information
- No morphing or cross-organization access

### Access Control Model

- Add special "Platform Admin" organization during database seeding
- Platform admins are members with elevated permissions in this system org
- Mark with `isSystemOrganization: true` flag to identify special organizations
- Existing organization permission system handles org admin access
- Guards check: `isPlatformAdmin()` OR `hasOrgPermission(orgId, 'manage_organization')`

### Authentication & Morphing

**Morph Functionality:**
- Platform admins have normal user accounts that are members of Platform Admin org
- Morphing creates a temporary session that tracks:
  - Original admin ID
  - Target user ID
  - Start time
  - All actions taken during morph session
- All API requests include `X-Morphed-Session-Id` header when morphed
- Morphing audit log stored in `AdminAuditLog` table
- Platform admins can morph into any user; org admins cannot morph

**Security Constraints:**
- Cannot morph into other platform admins
- Auto-end morph sessions after 4 hours (safety timeout)
- Clear visual indicator in UI when morphed (banner + avatar border)
- Log all failed morph attempts

## Database Schema

### New Tables

```prisma
// Admin audit log for morphing and sensitive operations
model AdminAuditLog {
  id                String   @id @default(uuid())
  adminUserId       String   // The platform admin performing action
  action            String   // 'morph_start', 'morph_end', 'update_license', 'delete_user', etc.
  targetUserId      String?  // User being acted upon (if applicable)
  targetOrgId       String?  // Organization being acted upon (if applicable)
  morphSessionId    String?  // Links all actions during a morph session
  metadata          Json     @default("{}") // Additional context (IP, changes made, etc.)
  createdAt         DateTime @default(now())

  adminUser         User     @relation("AdminActions", fields: [adminUserId], references: [id])
  targetUser        User?    @relation("ActionsReceived", fields: [targetUserId], references: [id])
  targetOrg         Organization? @relation(fields: [targetOrgId], references: [id])

  @@index([adminUserId])
  @@index([morphSessionId])
  @@index([action])
  @@index([createdAt])
}

// Pre-aggregated metrics (computed by background job)
model MetricSnapshot {
  id              String   @id @default(uuid())
  snapshotType    String   // 'daily', 'weekly', 'monthly'
  snapshotDate    DateTime // Date this snapshot represents
  organizationId  String?  // null for platform-wide metrics
  metrics         Json     // Flexible JSON containing all computed metrics
  createdAt       DateTime @default(now())

  organization    Organization? @relation(fields: [organizationId], references: [id])

  @@unique([snapshotType, snapshotDate, organizationId])
  @@index([snapshotDate])
  @@index([organizationId])
}
```

### Schema Updates

**User Model:**
```prisma
model User {
  // ... existing fields
  accountType       String  @default("individual") // 'individual' or 'organization'
  adminActionsGiven AdminAuditLog[] @relation("AdminActions")
  adminActionsReceived AdminAuditLog[] @relation("ActionsReceived")
  // ...

  @@index([accountType])
}
```

**Organization Model:**
```prisma
model Organization {
  // ... existing fields
  isSystemOrganization Boolean @default(false) // true for Platform Admin org
  auditLogs            AdminAuditLog[]
  metricSnapshots      MetricSnapshot[]
  // ...

  @@index([isSystemOrganization])
}
```

**Seed Data:**
- Create "Platform Admin" organization with `isSystemOrganization: true`
- Create system roles for Platform Admin org with appropriate permissions

## Backend API Structure

### New Admin Module (`packages/api/src/admin/`)

**AdminService (`admin.service.ts`):**
```typescript
class AdminService {
  // Morphing
  async startMorphSession(adminId: string, targetUserId: string): Promise<MorphSession>
  async endMorphSession(morphSessionId: string): Promise<void>
  async getMorphedUser(morphSessionId: string): Promise<User>

  // Platform-wide queries
  async getPlatformMetrics(timeRange: string): Promise<PlatformMetrics>
  async getAllOrganizations(filters?: OrgFilters): Promise<Organization[]>
  async getAllUsers(filters?: UserFilters): Promise<User[]>
  async getAuditLog(filters: AuditFilters): Promise<AdminAuditLog[]>

  // Administrative actions
  async updateOrganizationLicense(orgId: string, license: LicenseUpdate): Promise<void>
  async deactivateUser(userId: string, reason: string): Promise<void>
  async impersonateOrganization(adminId: string, orgId: string): Promise<void>
}
```

**OrgAdminService (`org-admin.service.ts`):**
```typescript
class OrgAdminService {
  // Organization-specific metrics
  async getOrgMetrics(orgId: string, timeRange: string): Promise<OrgMetrics>
  async getOrgMembers(orgId: string): Promise<OrganizationMember[]>
  async getOrgUsage(orgId: string): Promise<UsageStats>

  // Member management (uses existing organization.service methods)
  async inviteMember(orgId: string, email: string, roleId: string): Promise<void>
  async updateMemberRole(orgId: string, memberId: string, roleId: string): Promise<void>
  async removeMember(orgId: string, memberId: string): Promise<void>
}
```

**MetricsService (`metrics.service.ts`):**
```typescript
class MetricsService {
  // Real-time metrics (direct queries)
  async getCurrentActiveUsers(): Promise<number>
  async getCurrentSessionCount(): Promise<number>
  async getPendingPaymentFailures(): Promise<PaymentFailure[]>

  // Aggregated metrics (from MetricSnapshot)
  async getHistoricalMetrics(type: string, dateRange: DateRange, orgId?: string): Promise<Metrics>

  // Background job - compute and store snapshots
  async computeDailySnapshot(date: Date, orgId?: string): Promise<void>
}
```

### API Endpoints

**Platform Admin Routes:**
- `GET /admin/metrics` - Platform-wide dashboard data
- `GET /admin/organizations` - List all orgs with filters
- `GET /admin/users` - List all users with filters
- `POST /admin/morph/:userId` - Start morphing session
- `DELETE /admin/morph/:sessionId` - End morphing
- `GET /admin/audit-log` - View audit trail
- `PUT /admin/organizations/:id/license` - Update org license
- `POST /admin/users/:id/deactivate` - Deactivate user

**Organization Admin Routes:**
- `GET /org/:orgId/admin/metrics` - Org-specific dashboard
- `GET /org/:orgId/admin/members` - Org member list
- `GET /org/:orgId/admin/usage` - Org usage statistics
- `POST /org/:orgId/admin/members/invite` - Invite member
- `PUT /org/:orgId/admin/members/:memberId/role` - Update member role
- `DELETE /org/:orgId/admin/members/:memberId` - Remove member

### Guards & Middleware

**New Guards:**
```typescript
@IsPlatformAdmin() // Checks membership in Platform Admin org
@RequireOrgPermission('manage_organization') // Checks org-level permissions
```

**Morph Middleware:**
- Injects `X-Morphed-Session-Id` into request context
- Validates morph session is active
- Logs all actions taken during morph session

## Frontend UI Structure

### Platform Admin Dashboard (`/admin/*`)

**Navigation Sidebar:**
- Overview - KPI cards, charts showing platform health
- Organizations - Searchable table, filters (license status, size, activity)
- Users - Searchable table, filters (account type, active/inactive, verification)
- Metrics - Detailed charts (engagement, revenue, system health, business KPIs)
- Audit Log - Filterable log of all admin actions
- Settings - Platform configuration, feature flags

**Key Components:**
```typescript
// Morph indicator banner (sticky at top when morphed)
<MorphBanner
  originalAdmin={admin}
  morphedUser={user}
  onEndSession={handleEndMorph}
/>

// KPI cards with sparklines
<MetricCard
  title="Active Users"
  value={metrics.activeUsers}
  change="+12% vs last week"
  accountTypeBreakdown={{ individual: 450, organization: 120 }}
/>

// Organization table with actions
<OrgTable
  orgs={organizations}
  onViewDetails={openOrgModal}
  onEditLicense={openLicenseModal}
  onImpersonate={impersonateOrg}
/>
```

### Organization Admin Dashboard (`/org/:orgId/admin/*`)

**Navigation Tabs:**
- Overview - Org-specific KPIs, member activity, usage stats
- Members - Member list, roles, invite/remove actions
- Settings - Org details, license info (read-only for non-owners)
- Usage - Counseling sessions, AI usage, feature adoption

**Shared Components:**
Both dashboards use same charting library (recharts), table components, and metric displays but scoped to their access level.

## Metrics & KPIs

### Platform Admin Metrics (Balanced Dashboard)

**Engagement Metrics (Real-time queries):**
- Active users today (by account type: individual vs organization)
- Active sessions count
- Total counseling conversations (today, 7-day, 30-day)
- Scripture references used (most popular passages)
- Average session duration

**Revenue Metrics (Hybrid - real-time + aggregated):**
- MRR/ARR (pre-aggregated, updated daily)
- Trial → Paid conversion rate (weekly snapshots)
- License distribution (Family, Small, Medium, Large counts)
- Payment failures (real-time alert)
- Churn rate (monthly snapshots)

**System Health Metrics (Real-time):**
- API response time (p50, p95, p99)
- Error rate (last hour, last 24h)
- Database connection pool usage
- AI API calls today + cost estimate
- Active background jobs / failed jobs

**Business Goal Metrics (Aggregated):**
- User retention (7-day, 30-day cohorts)
- Feature adoption rates
- Organizations by size bracket
- Geographic distribution
- Individual → Organization upgrade rate

### Organization Admin Metrics

- Members active this week/month
- Counseling sessions by member
- License utilization (seats used / available)
- AI usage for their org
- Most active counselors in their org

### Metrics Computation Strategy

**Hybrid Approach:**
- **Real-time:** Direct queries with 5-minute cache for current values
- **Daily aggregation:** Background job runs at 2 AM UTC, stores in MetricSnapshot
- **Weekly/Monthly:** Computed from daily snapshots to reduce query load
- **Alerts:** Real-time checks trigger notifications (payment failures, high error rates)

**Background Job Schedule:**
```typescript
// Daily at 2 AM UTC
@Cron('0 2 * * *')
async computeDailySnapshots() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Platform-wide metrics
  await this.metricsService.computeDailySnapshot(yesterday);

  // Per-organization metrics
  const orgs = await this.prisma.organization.findMany();
  for (const org of orgs) {
    await this.metricsService.computeDailySnapshot(yesterday, org.id);
  }
}
```

## Implementation Strategy

### MVP Phases

**Phase 1: Foundation (Week 1-2)**
- Database migrations: Add `AdminAuditLog`, `MetricSnapshot`, `accountType`, `isSystemOrganization`
- Seed "Platform Admin" organization with initial admin users
- Create `@IsPlatformAdmin()` guard and middleware
- Basic admin service with permission checks

**Phase 2: Platform Admin Dashboard (Week 3-4)**
- Admin API endpoints (metrics, users, orgs)
- Platform admin UI: Overview page with KPI cards
- Organizations list with basic filtering
- Users list with search
- Simple metrics queries (no aggregation yet)

**Phase 3: Morphing & Audit (Week 5)**
- Morph session management (start/end)
- Audit logging for all admin actions
- Morph banner component in UI
- Audit log viewer with filters

**Phase 4: Organization Admin Dashboard (Week 6)**
- Org admin API endpoints
- Org admin UI: Overview, members, settings
- Reuse existing organization management endpoints
- Org-specific metrics queries

**Phase 5: Advanced Metrics (Week 7-8)**
- Background job for daily metric snapshots
- Historical trend charts using aggregated data
- Real-time alerts for critical issues
- Enhanced filtering and drill-down capabilities

## Error Handling & Security

### Morphing Security

**Constraints:**
- Prevent morphing into other platform admins
- Auto-end morph sessions after 4 hours
- Clear visual indicator in UI (banner + user avatar border)
- Log all failed morph attempts
- Require reason/justification for morphing

**Audit Trail:**
- All morph sessions logged with full context
- All actions during morph linked to session
- Cannot delete audit logs (append-only)
- Automatic cleanup after 2 years (compliance)

### Permission Checks

- Double-check permissions on every sensitive operation
- Rate limit admin endpoints to prevent abuse
- Require re-authentication for destructive actions (delete user, change license)
- Log all permission check failures

### Metrics Error Handling

- Graceful degradation if metrics computation fails
- Cache metrics with TTL to prevent database overload
- Show "Data unavailable" instead of errors in UI
- Background job retries with exponential backoff
- Alert on repeated metric computation failures

## Testing Strategy

**Unit Tests:**
- Permission checks for platform admin vs org admin
- Morph session logic (start, validate, end)
- Metrics computation accuracy
- Audit log creation

**Integration Tests:**
- Admin API endpoints with proper authorization
- Morph session workflow end-to-end
- Metrics aggregation background job
- Organization admin CRUD operations

**E2E Tests:**
- Platform admin: morph into user, perform action, verify audit log
- Organization admin: manage members, view metrics
- Permission boundaries (org admin cannot access other orgs)

**Manual Testing:**
- UI/UX of both dashboards
- Chart rendering with real data
- Responsive design on different screen sizes
- Morph banner visibility and behavior

## Future Enhancements

**Not in MVP but planned:**
- Export capabilities (CSV, PDF reports)
- Custom dashboard widgets
- Saved filter/search configurations
- Advanced alerting with email/SMS notifications
- Multi-factor authentication requirement for admin access
- Scheduled reports via email
- GraphQL API for advanced integrations
- Real-time WebSocket updates for live metrics

## Success Criteria

**Platform Admin Dashboard:**
- View platform-wide metrics in under 2 seconds
- Successfully morph into any user with full audit trail
- Identify and resolve payment failures within 5 minutes
- Track business KPIs (MRR, churn, conversions) accurately

**Organization Admin Dashboard:**
- Organization owners can manage members independently
- View org-specific usage and metrics
- Track license utilization to prevent overages
- Self-service member invitations and role management

## Dependencies

- Existing authentication system (Phase 2A)
- Organization and RBAC implementation (Phase 2A)
- Background job scheduler (BullMQ or similar)
- Charting library (recharts)
- Date handling library (date-fns)

## Risks & Mitigations

**Risk:** Morph feature could be abused
**Mitigation:** Comprehensive audit logging, 4-hour timeout, cannot morph into admins

**Risk:** Metrics queries could slow down database
**Mitigation:** Hybrid approach with pre-aggregation, caching, read replicas

**Risk:** Permission checks could have gaps
**Mitigation:** Double-check on all sensitive operations, comprehensive testing

**Risk:** UI could be overwhelming with too much data
**Mitigation:** Progressive disclosure, filters, drill-down patterns, saved views
