# Admin Dashboards - Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the database foundation, permission system, and basic admin services for the dual admin dashboard system (Platform Admin + Organization Admin).

**Architecture:** Add new Prisma models for audit logging and metrics, create Platform Admin system organization, implement guards and decorators for admin access control, and set up the basic admin module structure.

**Tech Stack:** NestJS, Prisma, PostgreSQL, TypeScript, JWT, Passport

---

## Task 1: Database Schema - Add Admin Models

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Add account type to User model**

In `packages/api/prisma/schema.prisma`, locate the `User` model and add:

```prisma
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  passwordHash      String
  firstName         String?
  lastName          String?
  emailVerified     Boolean             @default(false)
  verificationToken String?             @unique
  resetToken        String?             @unique
  resetTokenExpiry  DateTime?
  isActive          Boolean             @default(true)
  accountType       String              @default("individual") // NEW: 'individual' or 'organization'
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  refreshTokens     RefreshToken[]
  sessions          Session[]
  organizationMemberships OrganizationMember[]
  invitationsCreated OrganizationInvitation[] @relation("CreatedByUser")
  invitationsReceived OrganizationInvitation[] @relation("InvitedUser")
  adminActionsGiven AdminAuditLog[]     @relation("AdminActions") // NEW
  adminActionsReceived AdminAuditLog[]  @relation("ActionsReceived") // NEW

  @@index([email])
  @@index([verificationToken])
  @@index([resetToken])
  @@index([accountType]) // NEW
}
```

**Step 2: Add isSystemOrganization to Organization model**

In the same file, locate the `Organization` model and add:

```prisma
model Organization {
  id                String    @id @default(uuid())
  name              String
  description       String?   @db.Text
  licenseType       String?   // 'Family', 'Small', 'Medium', 'Large'
  licenseStatus     String    @default("trial") // 'trial', 'active', 'expired', 'cancelled'
  licenseExpiresAt  DateTime?
  maxMembers        Int       @default(10)
  isSystemOrganization Boolean @default(false) // NEW: true for Platform Admin org
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  members           OrganizationMember[]
  invitations       OrganizationInvitation[]
  roles             OrganizationRole[]
  auditLogs         AdminAuditLog[]      // NEW
  metricSnapshots   MetricSnapshot[]     // NEW

  @@index([licenseStatus])
  @@index([licenseExpiresAt])
  @@index([isSystemOrganization]) // NEW
}
```

**Step 3: Add AdminAuditLog model**

Add this new model after the Organization models:

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
```

**Step 4: Add MetricSnapshot model**

Add this model after AdminAuditLog:

```prisma
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

**Step 5: Generate migration**

Run:
```bash
cd packages/api
npx prisma migrate dev --name add_admin_models
```

Expected: Migration created successfully

**Step 6: Commit schema changes**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(db): add admin audit log and metrics models

- Add accountType field to User model
- Add isSystemOrganization flag to Organization
- Create AdminAuditLog for morphing and admin actions
- Create MetricSnapshot for pre-aggregated metrics
- Add necessary indexes for performance"
```

---

## Task 2: Seed Platform Admin Organization

**Files:**
- Modify: `packages/api/prisma/seed.ts`

**Step 1: Add Platform Admin org creation to seed**

In `packages/api/prisma/seed.ts`, add this after existing seed logic:

```typescript
// Create Platform Admin system organization
const platformAdminOrg = await prisma.organization.upsert({
  where: { id: '00000000-0000-0000-0000-000000000001' }, // Fixed UUID for system org
  update: {},
  create: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Platform Administration',
    description: 'System organization for platform administrators',
    isSystemOrganization: true,
    licenseStatus: 'active',
    maxMembers: 100, // High limit for platform admins
  },
});

console.log('Created Platform Admin organization:', platformAdminOrg.id);

// Create Platform Admin role with all permissions
const platformAdminRole = await prisma.organizationRole.upsert({
  where: { id: '00000000-0000-0000-0000-000000000002' },
  update: {},
  create: {
    id: '00000000-0000-0000-0000-000000000002',
    organizationId: platformAdminOrg.id,
    name: 'Platform Administrator',
    description: 'Full platform administration access with morphing capabilities',
    isSystemRole: true,
    permissions: JSON.stringify([
      'platform_admin',
      'morph_users',
      'manage_all_organizations',
      'manage_all_users',
      'view_audit_logs',
      'manage_licenses',
    ]),
  },
});

console.log('Created Platform Admin role:', platformAdminRole.id);
```

**Step 2: Run seed script**

Run:
```bash
cd packages/api
npx prisma db seed
```

Expected: "Created Platform Admin organization" and "Created Platform Admin role" logged

**Step 3: Verify in database**

Run:
```bash
cd packages/api
npx prisma studio
```

Expected: Can see Platform Admin organization with isSystemOrganization = true

**Step 4: Commit seed changes**

```bash
git add packages/api/prisma/seed.ts
git commit -m "feat(seed): create Platform Admin system organization

- Add fixed-UUID Platform Admin organization
- Mark as system organization
- Create Platform Administrator role with all permissions
- Set high member limit for admin users"
```

---

## Task 3: Create Admin Permission Types

**Files:**
- Create: `packages/shared/src/types/admin.types.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Create admin types file**

Create `packages/shared/src/types/admin.types.ts`:

```typescript
export interface MorphSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  startedAt: Date;
  expiresAt: Date;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId?: string;
  targetOrgId?: string;
  morphSessionId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface PlatformMetrics {
  activeUsers: {
    total: number;
    individual: number;
    organization: number;
  };
  activeSessions: number;
  organizations: {
    total: number;
    trial: number;
    active: number;
    expired: number;
  };
  revenue: {
    mrr: number;
    arr: number;
  };
  systemHealth: {
    apiResponseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    dbConnections: number;
  };
}

export interface OrgMetrics {
  organizationId: string;
  activeMembers: number;
  counselingSessions: number;
  licenseUtilization: {
    used: number;
    available: number;
    percentage: number;
  };
}

export enum AdminAction {
  MORPH_START = 'morph_start',
  MORPH_END = 'morph_end',
  UPDATE_LICENSE = 'update_license',
  DEACTIVATE_USER = 'deactivate_user',
  CREATE_ORGANIZATION = 'create_organization',
  DELETE_ORGANIZATION = 'delete_organization',
  VIEW_AUDIT_LOG = 'view_audit_log',
}
```

**Step 2: Export from index**

In `packages/shared/src/types/index.ts`, add:

```typescript
export * from './admin.types';
```

**Step 3: Build shared package**

Run:
```bash
cd packages/shared
npm run build
```

Expected: Build successful

**Step 4: Commit types**

```bash
git add packages/shared/src/types/admin.types.ts packages/shared/src/types/index.ts
git commit -m "feat(types): add admin dashboard type definitions

- MorphSession for user morphing tracking
- AdminAuditLogEntry for audit trail
- PlatformMetrics for system-wide metrics
- OrgMetrics for organization-specific metrics
- AdminAction enum for audit log actions"
```

---

## Task 4: Create IsPlatformAdmin Guard

**Files:**
- Create: `packages/api/src/admin/guards/is-platform-admin.guard.ts`
- Create: `packages/api/src/admin/decorators/is-platform-admin.decorator.ts`

**Step 1: Create guards directory**

Run:
```bash
mkdir -p packages/api/src/admin/guards
mkdir -p packages/api/src/admin/decorators
```

**Step 2: Create IsPlatformAdmin guard**

Create `packages/api/src/admin/guards/is-platform-admin.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IsPlatformAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is member of Platform Admin organization
    const platformAdminMembership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organization: {
          isSystemOrganization: true,
        },
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!platformAdminMembership) {
      throw new ForbiddenException('Platform admin access required');
    }

    // Attach platform admin info to request
    request.platformAdmin = {
      organizationId: platformAdminMembership.organizationId,
      roleId: platformAdminMembership.roleId,
      permissions: platformAdminMembership.role.permissions,
    };

    return true;
  }
}
```

**Step 3: Create decorator**

Create `packages/api/src/admin/decorators/is-platform-admin.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PLATFORM_ADMIN_KEY = 'isPlatformAdmin';
export const IsPlatformAdmin = () => SetMetadata(IS_PLATFORM_ADMIN_KEY, true);
```

**Step 4: Commit guard and decorator**

```bash
git add packages/api/src/admin/
git commit -m "feat(admin): add platform admin authorization guard

- IsPlatformAdminGuard checks system org membership
- Decorator for marking admin-only endpoints
- Attach admin context to request for audit logging"
```

---

## Task 5: Create Admin Module Structure

**Files:**
- Create: `packages/api/src/admin/admin.module.ts`
- Create: `packages/api/src/admin/admin.service.ts`
- Create: `packages/api/src/admin/admin.controller.ts`
- Modify: `packages/api/src/app/app.module.ts`

**Step 1: Create admin service**

Create `packages/api/src/admin/admin.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isSystemOrganization: true,
        },
      },
    });

    return !!membership;
  }

  async logAdminAction(
    adminUserId: string,
    action: string,
    metadata: Record<string, any>,
    targetUserId?: string,
    targetOrgId?: string,
    morphSessionId?: string,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        targetUserId,
        targetOrgId,
        morphSessionId,
        metadata,
      },
    });
  }

  async getAuditLog(filters: {
    adminUserId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        adminUserId: filters.adminUserId,
        action: filters.action,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetOrg: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 100,
    });
  }
}
```

**Step 2: Create admin controller**

Create `packages/api/src/admin/admin.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { IsPlatformAdminGuard } from './guards/is-platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('admin')
@UseGuards(IsPlatformAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('audit-log')
  async getAuditLog(
    @CurrentUser() user: User,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Log this access
    await this.adminService.logAdminAction(
      user.id,
      'view_audit_log',
      { filters: { action, startDate, endDate } },
    );

    return this.adminService.getAuditLog({
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('health-check')
  async healthCheck(@CurrentUser() user: User) {
    const isPlatformAdmin = await this.adminService.isPlatformAdmin(user.id);
    return {
      isPlatformAdmin,
      userId: user.id,
      message: 'Admin access verified',
    };
  }
}
```

**Step 3: Create admin module**

Create `packages/api/src/admin/admin.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
```

**Step 4: Register admin module in app**

In `packages/api/src/app/app.module.ts`, add import:

```typescript
import { AdminModule } from '../admin/admin.module';
```

And add to imports array:

```typescript
@Module({
  imports: [
    // ... existing imports
    AdminModule,
  ],
  // ... rest
})
```

**Step 5: Run and test endpoint**

Run:
```bash
npm run start:dev
```

Expected: Server starts without errors

**Step 6: Commit admin module**

```bash
git add packages/api/src/admin/ packages/api/src/app/app.module.ts
git commit -m "feat(admin): create admin module with basic structure

- AdminService with platform admin checks and audit logging
- AdminController with health check and audit log endpoints
- Register module in app
- Basic foundation for admin operations"
```

---

## Task 6: Add Tests for Admin Guard

**Files:**
- Create: `packages/api/src/admin/guards/is-platform-admin.guard.spec.ts`

**Step 1: Create test file**

Create `packages/api/src/admin/guards/is-platform-admin.guard.spec.ts`:

```typescript
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsPlatformAdminGuard } from './is-platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('IsPlatformAdminGuard', () => {
  let guard: IsPlatformAdminGuard;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IsPlatformAdminGuard,
        {
          provide: PrismaService,
          useValue: {
            organizationMember: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<IsPlatformAdminGuard>(IsPlatformAdminGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user not authenticated', async () => {
    const context = createMockExecutionContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not platform admin', async () => {
    const context = createMockExecutionContext({ id: 'user-123', email: 'user@test.com' });
    jest.spyOn(prismaService.organizationMember, 'findFirst').mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if user is platform admin', async () => {
    const context = createMockExecutionContext({ id: 'admin-123', email: 'admin@test.com' });
    jest.spyOn(prismaService.organizationMember, 'findFirst').mockResolvedValue({
      id: 'membership-123',
      userId: 'admin-123',
      organizationId: 'platform-admin-org',
      roleId: 'admin-role',
      organization: { id: 'platform-admin-org', isSystemOrganization: true } as any,
      role: { id: 'admin-role', permissions: ['platform_admin'] } as any,
    } as any);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }
});
```

**Step 2: Run tests**

Run:
```bash
cd packages/api
npm test -- is-platform-admin.guard.spec
```

Expected: All tests pass

**Step 3: Commit tests**

```bash
git add packages/api/src/admin/guards/is-platform-admin.guard.spec.ts
git commit -m "test(admin): add tests for platform admin guard

- Test authenticated vs unauthenticated users
- Test platform admin vs regular users
- Test guard attaches admin context to request"
```

---

## Verification Steps

After completing all tasks, verify the foundation:

1. **Database:** Run `npx prisma studio` and confirm:
   - Platform Admin organization exists with `isSystemOrganization = true`
   - AdminAuditLog and MetricSnapshot tables exist

2. **API:** Start server and test admin endpoint:
   ```bash
   curl http://localhost:3000/admin/health-check \
     -H "Authorization: Bearer <valid-jwt-token>"
   ```
   Expected: 403 Forbidden (if user not platform admin) or 200 OK (if platform admin)

3. **Tests:** Run full test suite:
   ```bash
   npm test
   ```
   Expected: All tests pass

4. **Build:** Verify everything compiles:
   ```bash
   npm run build
   ```
   Expected: Build successful

---

## Next Steps

After completing Phase 1 Foundation, proceed to:
- **Phase 2:** Platform Admin Dashboard (metrics, users, orgs endpoints)
- **Phase 3:** Morphing & Audit functionality
- **Phase 4:** Organization Admin Dashboard
- **Phase 5:** Advanced Metrics with background jobs

Each phase will build on this foundation with additional features and UI components.
