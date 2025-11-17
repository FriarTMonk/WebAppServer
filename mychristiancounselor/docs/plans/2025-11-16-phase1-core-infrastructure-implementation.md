# Phase 1: Core Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish database foundation, basic API endpoints, and admin interface for counselor-member assignments.

**Architecture:** Extend existing Prisma schema with 5 new tables, create service layer for assignment management, add protected API endpoints for counselors and org-admins, build React UI for assignment management.

**Tech Stack:** NestJS 11.0, Prisma ORM, PostgreSQL, Next.js 15.2.5, TypeScript, TailwindCSS

---

## Prerequisites

**Existing Codebase Context:**
- Monorepo structure with `packages/api` (NestJS backend) and `packages/web` (Next.js frontend)
- Shared types in `packages/shared/src/types`
- Prisma schema at `packages/api/prisma/schema.prisma`
- Existing `/counsel` route handles AI conversation functionality
- Existing `/org-admin` route for organization admin operations
- JWT authentication with role-based permissions already implemented

**Key Files to Reference:**
- `packages/api/src/organization/organization.service.ts` - Pattern for permission checking
- `packages/api/src/admin/admin.controller.ts` - Pattern for protected endpoints
- `packages/api/src/counsel/counsel.controller.ts` - Existing counsel endpoints
- `packages/web/src/app/admin/organizations/page.tsx` - Admin UI patterns

---

## Task 1: Update Database Schema

**Files:**
- Modify: `packages/api/prisma/schema.prisma`
- Create: `packages/api/prisma/migrations/XXXXXX_add_counselor_tables/migration.sql` (auto-generated)

### Step 1: Add User relations for new tables

Add these relations to the `User` model (around line 46):

**File:** `packages/api/prisma/schema.prisma` (lines 40-54)

```prisma
  sessions                Session[]
  organizationMemberships OrganizationMember[]
  invitationsCreated      OrganizationInvitation[] @relation("CreatedByUser")
  invitationsReceived     OrganizationInvitation[] @relation("InvitedUser")
  adminActionsGiven       AdminAuditLog[]          @relation("AdminActions")
  adminActionsReceived    AdminAuditLog[]          @relation("ActionsReceived")
  sessionNotesAuthored    SessionNote[]            @relation("SessionNotesAuthored")
  subscriptions           Subscription[]

  // New counselor relations
  counselorAssignments    CounselorAssignment[]    @relation("CounselorAssignments")
  memberAssignments       CounselorAssignment[]    @relation("MemberAssignments")
  observationsAuthored    CounselorObservation[]   @relation("ObservationsAuthored")
  observationsReceived    CounselorObservation[]   @relation("ObservationsReceived")
  coverageGrantsGiven     CounselorCoverageGrant[] @relation("CoverageGrantsGiven")
  coverageGrantsReceived  CounselorCoverageGrant[] @relation("CoverageGrantsReceived")
  coverageGrantsForMember CounselorCoverageGrant[] @relation("CoverageGrantsForMember")
  wellbeingStatus         MemberWellbeingStatus?
  notificationsReceived   Notification[]           @relation("NotificationsReceived")
  notificationsSent       Notification[]           @relation("NotificationsSent")

  @@index([email])
```

### Step 2: Add CounselorAssignment table

Add after `OrganizationInvitation` model (around line 340):

```prisma
// Counselor-member assignment for pastoral care relationships
model CounselorAssignment {
  id             String   @id @default(uuid())
  counselorId    String   // User with Counselor role
  memberId       String   // User being counseled
  organizationId String
  status         String   @default("active") // 'active' | 'inactive'
  assignedBy     String   // Admin who made assignment
  assignedAt     DateTime @default(now())
  endedAt        DateTime?

  counselor    User         @relation("CounselorAssignments", fields: [counselorId], references: [id], onDelete: Cascade)
  member       User         @relation("MemberAssignments", fields: [memberId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([counselorId, memberId, organizationId])
  @@index([counselorId, status])
  @@index([memberId])
  @@index([organizationId])
}
```

### Step 3: Add CounselorObservation table

```prisma
// Private counselor notes - only visible to authoring counselor
model CounselorObservation {
  id          String   @id @default(uuid())
  counselorId String
  memberId    String
  content     String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  counselor User @relation("ObservationsAuthored", fields: [counselorId], references: [id], onDelete: Cascade)
  member    User @relation("ObservationsReceived", fields: [memberId], references: [id], onDelete: Cascade)

  @@index([counselorId, memberId])
  @@index([createdAt])
}
```

### Step 4: Add CounselorCoverageGrant table

```prisma
// Temporary access permissions for workload sharing
model CounselorCoverageGrant {
  id                String    @id @default(uuid())
  primaryCounselorId String
  backupCounselorId  String
  memberId           String
  grantedAt          DateTime  @default(now())
  expiresAt          DateTime?
  revokedAt          DateTime?

  primaryCounselor User @relation("CoverageGrantsGiven", fields: [primaryCounselorId], references: [id], onDelete: Cascade)
  backupCounselor  User @relation("CoverageGrantsReceived", fields: [backupCounselorId], references: [id], onDelete: Cascade)
  member           User @relation("CoverageGrantsForMember", fields: [memberId], references: [id], onDelete: Cascade)

  @@index([backupCounselorId, revokedAt])
  @@index([primaryCounselorId])
  @@index([memberId])
}
```

### Step 5: Add MemberWellbeingStatus table

```prisma
// AI-generated and counselor-overridden wellbeing status
model MemberWellbeingStatus {
  id               String   @id @default(uuid())
  memberId         String   @unique
  status           String   // 'green' | 'yellow' | 'red'
  aiSuggestedStatus String  // What AI detected
  overriddenBy     String?  // Counselor who overrode
  summary          String   @db.Text // AI-generated 7-day summary
  lastAnalyzedAt   DateTime @default(now())
  updatedAt        DateTime @updatedAt

  member User @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([lastAnalyzedAt])
}
```

### Step 6: Add Notification table

```prisma
// Ticker-tape notifications and counselor-member messaging
model Notification {
  id          String    @id @default(uuid())
  recipientId String
  senderId    String?   // Null for system notifications
  type        String    // 'system' | 'message' | 'alert'
  category    String    // 'assignment' | 'note_added' | 'status_change' | 'direct_message'
  title       String    // Brief header
  message     String    @db.Text
  linkTo      String?   // Optional URL to navigate to
  isRead      Boolean   @default(false)
  isDismissed Boolean   @default(false)
  createdAt   DateTime  @default(now())
  expiresAt   DateTime? // Auto-dismiss after date

  recipient User  @relation("NotificationsReceived", fields: [recipientId], references: [id], onDelete: Cascade)
  sender    User? @relation("NotificationsSent", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([recipientId, isRead, isDismissed])
  @@index([createdAt])
  @@index([recipientId, createdAt])
}
```

### Step 7: Add Organization relation

Add to `Organization` model relations (around line 92):

```prisma
  roles           OrganizationRole[]
  auditLogs       AdminAuditLog[]
  metricSnapshots MetricSnapshot[]
  counselorAssignments CounselorAssignment[] // Add this line

  @@index([licenseStatus])
```

### Step 8: Create and apply migration

Run these commands to create the migration:

```bash
cd packages/api
npx prisma migrate dev --name add_counselor_tables
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database

Prisma Migrate created and applied the following migration(s) from new schema changes:

migrations/
  └─ 20251116XXXXXX_add_counselor_tables/
    └─ migration.sql

Your database is now in sync with your schema.
```

### Step 9: Generate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client
```

### Step 10: Verify schema

```bash
npx prisma validate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema is valid ✅
```

### Step 11: Commit schema changes

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add counselor assignment tables

Add 5 new tables for counselor dashboard:
- CounselorAssignment: Links counselors to members
- CounselorObservation: Private counselor notes
- CounselorCoverageGrant: Temporary access delegation
- MemberWellbeingStatus: AI-generated status tracking
- Notification: In-app notifications and messaging"
```

---

## Task 2: Add Shared TypeScript Types

**Files:**
- Modify: `packages/shared/src/types/counselor.types.ts` (create new)
- Modify: `packages/shared/src/types/index.ts`

### Step 1: Create counselor types file

**File:** `packages/shared/src/types/counselor.types.ts`

```typescript
// Counselor Assignment Types
export interface CounselorAssignment {
  id: string;
  counselorId: string;
  memberId: string;
  organizationId: string;
  status: 'active' | 'inactive';
  assignedBy: string;
  assignedAt: Date;
  endedAt?: Date;
  // Populated relations
  counselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface CreateCounselorAssignmentDto {
  counselorId: string;
  memberId: string;
  organizationId: string;
}

export interface AssignmentWithWorkload extends CounselorAssignment {
  caseloadCount?: number;
}

// Counselor Observation Types
export interface CounselorObservation {
  id: string;
  counselorId: string;
  memberId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateObservationDto {
  memberId: string;
  content: string;
}

export interface UpdateObservationDto {
  content: string;
}

// Counselor Coverage Types
export interface CounselorCoverageGrant {
  id: string;
  primaryCounselorId: string;
  backupCounselorId: string;
  memberId: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  // Populated relations
  primaryCounselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  backupCounselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateCoverageGrantDto {
  backupCounselorId: string;
  memberId: string;
  expiresAt?: Date;
}

// Member Wellbeing Status Types
export type WellbeingStatus = 'green' | 'yellow' | 'red';

export interface MemberWellbeingStatus {
  id: string;
  memberId: string;
  status: WellbeingStatus;
  aiSuggestedStatus: WellbeingStatus;
  overriddenBy?: string;
  summary: string;
  lastAnalyzedAt: Date;
  updatedAt: Date;
}

export interface OverrideStatusDto {
  status: WellbeingStatus;
  reason: string;
}

// Counselor Dashboard Types
export interface CounselorMemberSummary {
  member: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  wellbeingStatus: MemberWellbeingStatus;
  lastConversationDate?: Date;
  totalConversations: number;
  observationCount: number;
  assignment: CounselorAssignment;
}

// Notification Types
export type NotificationType = 'system' | 'message' | 'alert';
export type NotificationCategory =
  | 'assignment'
  | 'note_added'
  | 'status_change'
  | 'direct_message'
  | 'coverage_grant'
  | 'coverage_expiring';

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  linkTo?: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  // Populated relations
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateNotificationDto {
  recipientId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  linkTo?: string;
  expiresAt?: Date;
}

export interface SendMessageDto {
  recipientId: string;
  message: string;
}
```

### Step 2: Export from index

**File:** `packages/shared/src/types/index.ts` (add to existing exports)

```typescript
export * from './counselor.types';
```

### Step 3: Build shared package

```bash
cd packages/shared
npm run build
```

**Expected Output:**
```
> @mychristiancounselor/shared@1.0.0 build
> tsc

[build successful message]
```

### Step 4: Commit types

```bash
git add packages/shared/src/types/
git commit -m "feat(types): add counselor dashboard type definitions

Add TypeScript interfaces for:
- Counselor assignments
- Counselor observations
- Coverage grants
- Member wellbeing status
- Notifications"
```

---

## Task 3: Create Counselor Assignment Service

**Files:**
- Create: `packages/api/src/counsel/assignment.service.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`

### Step 1: Create assignment service

**File:** `packages/api/src/counsel/assignment.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CounselorAssignment,
  CreateCounselorAssignmentDto,
  CounselorMemberSummary,
} from '@mychristiancounselor/shared';

@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all members assigned to a counselor
   */
  async getCounselorMembers(counselorId: string, organizationId: string): Promise<CounselorMemberSummary[]> {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: {
        counselorId,
        organizationId,
        status: 'active',
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    // Get wellbeing status for each member (will return mock data for now)
    const summaries: CounselorMemberSummary[] = await Promise.all(
      assignments.map(async (assignment) => {
        // Get last conversation date
        const lastSession = await this.prisma.session.findFirst({
          where: {
            userId: assignment.memberId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        });

        // Count total conversations
        const totalConversations = await this.prisma.session.count({
          where: {
            userId: assignment.memberId,
          },
        });

        // Count observations
        const observationCount = await this.prisma.counselorObservation.count({
          where: {
            counselorId,
            memberId: assignment.memberId,
          },
        });

        // Get or create wellbeing status (mock for Phase 1)
        let wellbeingStatus = await this.prisma.memberWellbeingStatus.findUnique({
          where: {
            memberId: assignment.memberId,
          },
        });

        if (!wellbeingStatus) {
          // Create default status for testing
          wellbeingStatus = await this.prisma.memberWellbeingStatus.create({
            data: {
              memberId: assignment.memberId,
              status: 'green',
              aiSuggestedStatus: 'green',
              summary: 'Member profile created. AI analysis pending.',
              lastAnalyzedAt: new Date(),
            },
          });
        }

        return {
          member: assignment.member,
          wellbeingStatus: wellbeingStatus as any,
          lastConversationDate: lastSession?.createdAt,
          totalConversations,
          observationCount,
          assignment: assignment as any,
        };
      })
    );

    return summaries;
  }

  /**
   * Create a new counselor-member assignment
   */
  async createAssignment(
    dto: CreateCounselorAssignmentDto,
    assignedBy: string
  ): Promise<CounselorAssignment> {
    // Check if counselor has Counselor role in the organization
    const counselorMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: dto.counselorId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!counselorMembership) {
      throw new BadRequestException('Counselor is not a member of this organization');
    }

    // Verify role has counseling permissions (check role name contains "Counselor")
    if (!counselorMembership.role.name.includes('Counselor')) {
      throw new BadRequestException('User does not have Counselor role');
    }

    // Check if member belongs to organization
    const memberMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: dto.memberId,
        },
      },
    });

    if (!memberMembership) {
      throw new BadRequestException('Member is not part of this organization');
    }

    // Check for existing active assignment for this member in this organization
    const existingAssignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        memberId: dto.memberId,
        organizationId: dto.organizationId,
        status: 'active',
      },
    });

    // If exists, deactivate it
    if (existingAssignment) {
      await this.prisma.counselorAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: 'inactive',
          endedAt: new Date(),
        },
      });
    }

    // Create new assignment
    const assignment = await this.prisma.counselorAssignment.create({
      data: {
        counselorId: dto.counselorId,
        memberId: dto.memberId,
        organizationId: dto.organizationId,
        assignedBy,
        status: 'active',
      },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return assignment as any;
  }

  /**
   * End a counselor assignment
   */
  async endAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.prisma.counselorAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.counselorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'inactive',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Get all assignments in an organization (for admin view)
   */
  async getOrganizationAssignments(organizationId: string): Promise<CounselorAssignment[]> {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: {
        organizationId,
      },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return assignments as any;
  }

  /**
   * Get counselor workload (caseload count) for all counselors
   */
  async getCounselorWorkloads(organizationId: string) {
    // Get all users with Counselor role
    const counselors = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        role: true,
      },
    });

    const counselorsWithRole = counselors.filter(c =>
      c.role.name.includes('Counselor')
    );

    // Count active assignments for each
    const workloads = await Promise.all(
      counselorsWithRole.map(async (counselor) => {
        const count = await this.prisma.counselorAssignment.count({
          where: {
            counselorId: counselor.userId,
            organizationId,
            status: 'active',
          },
        });

        return {
          counselor: counselor.user,
          caseloadCount: count,
        };
      })
    );

    return workloads;
  }

  /**
   * Verify counselor has active assignment to member
   */
  async verifyCounselorAssignment(
    counselorId: string,
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    return !!assignment;
  }
}
```

### Step 2: Update counsel module

**File:** `packages/api/src/counsel/counsel.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CounselController } from './counsel.controller';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { AssignmentService } from './assignment.service'; // Add this
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [CounselController],
  providers: [
    CounselService,
    CounselExportService,
    AssignmentService, // Add this
  ],
  exports: [
    CounselService,
    AssignmentService, // Add this
  ],
})
export class CounselModule {}
```

### Step 3: Test service compilation

```bash
cd packages/api
npm run build
```

**Expected Output:**
```
Successfully compiled
```

### Step 4: Commit service

```bash
git add packages/api/src/counsel/
git commit -m "feat(counsel): add assignment service

Implements core business logic for:
- Creating counselor-member assignments
- Retrieving counselor's assigned members
- Getting organization-wide assignments
- Calculating counselor workloads
- Verifying assignment permissions"
```

---

## Task 4: Add Counselor Dashboard API Endpoints

**Files:**
- Modify: `packages/api/src/counsel/counsel.controller.ts`
- Create: `packages/api/src/counsel/guards/is-counselor.guard.ts`

### Step 1: Create counselor guard

**File:** `packages/api/src/counsel/guards/is-counselor.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that verifies the user has a Counselor role in any organization
 */
@Injectable()
export class IsCounselorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has Counselor role in any organization
    const counselorMembership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
      },
    });

    if (!counselorMembership) {
      throw new ForbiddenException('User is not a member of any organization');
    }

    // Check if any membership has Counselor in the role name
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
      },
    });

    const isCounselor = memberships.some(m =>
      m.role.name.includes('Counselor')
    );

    if (!isCounselor) {
      throw new ForbiddenException('User does not have Counselor role');
    }

    return true;
  }
}
```

### Step 2: Add counselor dashboard endpoints

**File:** `packages/api/src/counsel/counsel.controller.ts` (add after existing endpoints around line 108)

```typescript
import { Controller, Post, Get, Body, Param, Request, UseGuards, Put, Delete, HttpCode, Query } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { AssignmentService } from './assignment.service'; // Add this
import { CounselRequestDto } from './dto/counsel-request.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsCounselorGuard } from './guards/is-counselor.guard'; // Add this
import { Public } from '../auth/decorators/public.decorator';

@Controller('counsel')
export class CounselController {
  constructor(
    private counselService: CounselService,
    private counselExportService: CounselExportService,
    private assignmentService: AssignmentService, // Add this
  ) {}

  // ... existing endpoints ...

  // ===== COUNSELOR DASHBOARD ENDPOINTS =====

  /**
   * Get all members assigned to the counselor
   * GET /counsel/members?organizationId=xxx
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Get('members')
  async getCounselorMembers(
    @Request() req,
    @Query('organizationId') organizationId: string,
  ) {
    const counselorId = req.user.id;

    if (!organizationId) {
      // Get user's first organization if not specified
      const membership = await this.assignmentService['prisma'].organizationMember.findFirst({
        where: { userId: counselorId },
        select: { organizationId: true },
      });

      if (!membership) {
        return { members: [] };
      }

      organizationId = membership.organizationId;
    }

    const members = await this.assignmentService.getCounselorMembers(
      counselorId,
      organizationId
    );

    return { members };
  }

  /**
   * Get all sessions for a specific member (counselor access)
   * GET /counsel/members/:memberId/sessions
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Get('members/:memberId/sessions')
  async getMemberSessions(
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    const counselorId = req.user.id;

    // Verify counselor has assignment to this member
    const membership = await this.assignmentService['prisma'].organizationMember.findFirst({
      where: { userId: counselorId },
      select: { organizationId: true },
    });

    if (!membership) {
      throw new ForbiddenException('No organization membership found');
    }

    const hasAssignment = await this.assignmentService.verifyCounselorAssignment(
      counselorId,
      memberId,
      membership.organizationId
    );

    if (!hasAssignment) {
      throw new ForbiddenException('You are not assigned to this member');
    }

    // Get all sessions for the member
    const sessions = await this.assignmentService['prisma'].session.findMany({
      where: {
        userId: memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        questionCount: true,
      },
    });

    return { sessions };
  }
}
```

### Step 3: Build and test

```bash
cd packages/api
npm run build
```

**Expected Output:**
```
Successfully compiled
```

### Step 4: Commit endpoints

```bash
git add packages/api/src/counsel/
git commit -m "feat(counsel): add counselor dashboard endpoints

Add API endpoints:
- GET /counsel/members - List assigned members
- GET /counsel/members/:id/sessions - View member sessions

Add IsCounselorGuard for role verification"
```

---

## Task 5: Add Org-Admin Assignment Management Endpoints

**Files:**
- Modify: `packages/api/src/org-admin/org-admin.controller.ts`
- Modify: `packages/api/src/org-admin/org-admin.service.ts`
- Modify: `packages/api/src/org-admin/org-admin.module.ts`

### Step 1: Update org-admin service

**File:** `packages/api/src/org-admin/org-admin.service.ts` (add at end before closing brace)

```typescript
  /**
   * Create counselor assignment
   */
  async createCounselorAssignment(
    adminUserId: string,
    organizationId: string,
    dto: CreateCounselorAssignmentDto
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.MANAGE_MEMBERS
    );

    // Verify DTO has correct organizationId
    if (dto.organizationId !== organizationId) {
      throw new BadRequestException('Organization ID mismatch');
    }

    // Import AssignmentService and call it
    // Note: This requires injecting AssignmentService
    const assignment = await this.assignmentService.createAssignment(dto, adminUserId);

    // Log action
    await this.adminService.logAdminAction(
      adminUserId,
      'create_counselor_assignment',
      { counselorId: dto.counselorId, memberId: dto.memberId },
      undefined,
      organizationId
    );

    return assignment;
  }

  /**
   * Get all counselor assignments in organization
   */
  async getCounselorAssignments(
    adminUserId: string,
    organizationId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.VIEW_MEMBERS
    );

    return this.assignmentService.getOrganizationAssignments(organizationId);
  }

  /**
   * End counselor assignment
   */
  async endCounselorAssignment(
    adminUserId: string,
    organizationId: string,
    assignmentId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.MANAGE_MEMBERS
    );

    await this.assignmentService.endAssignment(assignmentId);

    // Log action
    await this.adminService.logAdminAction(
      adminUserId,
      'end_counselor_assignment',
      { assignmentId },
      undefined,
      organizationId
    );
  }

  /**
   * Get counselor workload stats
   */
  async getCounselorWorkloads(
    adminUserId: string,
    organizationId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.VIEW_MEMBERS
    );

    return this.assignmentService.getCounselorWorkloads(organizationId);
  }
```

### Step 2: Add AssignmentService to imports

**File:** `packages/api/src/org-admin/org-admin.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { OrgAdminController } from './org-admin.controller';
import { OrgAdminService } from './org-admin.service';
import { OrganizationModule } from '../organization/organization.module';
import { AdminModule } from '../admin/admin.module';
import { CounselModule } from '../counsel/counsel.module'; // Add this

@Module({
  imports: [
    OrganizationModule,
    AdminModule,
    CounselModule, // Add this
  ],
  controllers: [OrgAdminController],
  providers: [OrgAdminService],
  exports: [OrgAdminService],
})
export class OrgAdminModule {}
```

**File:** `packages/api/src/org-admin/org-admin.service.ts` (add to constructor)

```typescript
import { AssignmentService } from '../counsel/assignment.service'; // Add import

constructor(
  private organizationService: OrganizationService,
  private adminService: AdminService,
  private assignmentService: AssignmentService, // Add this
) {}
```

### Step 3: Add controller endpoints

**File:** `packages/api/src/org-admin/org-admin.controller.ts` (add before closing brace)

```typescript
  /**
   * Create counselor assignment
   * POST /org-admin/counselor-assignments
   */
  @Post('counselor-assignments')
  async createCounselorAssignment(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
    @Body() dto: CreateCounselorAssignmentDto,
  ) {
    return this.orgAdminService.createCounselorAssignment(
      user.id,
      organizationId,
      dto
    );
  }

  /**
   * Get all counselor assignments
   * GET /org-admin/counselor-assignments?organizationId=xxx
   */
  @Get('counselor-assignments')
  async getCounselorAssignments(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
  ) {
    return this.orgAdminService.getCounselorAssignments(user.id, organizationId);
  }

  /**
   * End counselor assignment
   * DELETE /org-admin/counselor-assignments/:id
   */
  @Delete('counselor-assignments/:id')
  @HttpCode(204)
  async endCounselorAssignment(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
    @Param('id') assignmentId: string,
  ) {
    await this.orgAdminService.endCounselorAssignment(
      user.id,
      organizationId,
      assignmentId
    );
  }

  /**
   * Get counselor workload statistics
   * GET /org-admin/counselor-workload?organizationId=xxx
   */
  @Get('counselor-workload')
  async getCounselorWorkloads(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
  ) {
    return this.orgAdminService.getCounselorWorkloads(user.id, organizationId);
  }
```

Add import for CreateCounselorAssignmentDto:

```typescript
import { CreateCounselorAssignmentDto } from '@mychristiancounselor/shared';
```

### Step 4: Build and verify

```bash
cd packages/api
npm run build
```

**Expected Output:**
```
Successfully compiled
```

### Step 5: Commit org-admin changes

```bash
git add packages/api/src/org-admin/
git commit -m "feat(org-admin): add counselor assignment management

Add endpoints for organization admins:
- POST /org-admin/counselor-assignments
- GET /org-admin/counselor-assignments
- DELETE /org-admin/counselor-assignments/:id
- GET /org-admin/counselor-workload"
```

---

## Task 6: Create Counselor Dashboard Frontend Page

**Files:**
- Create: `packages/web/src/app/counsel/page.tsx`
- Create: `packages/web/src/components/CounselorDashboard.tsx`
- Create: `packages/web/src/hooks/useCounselorMembers.ts`

### Step 1: Create counselor dashboard page

**File:** `packages/web/src/app/counsel/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CounselorDashboard from '@/components/CounselorDashboard';

export default function CounselPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <CounselorDashboard />;
}
```

### Step 2: Create custom hook for data fetching

**File:** `packages/web/src/hooks/useCounselorMembers.ts`

```typescript
import { useState, useEffect } from 'react';
import { CounselorMemberSummary } from '@mychristiancounselor/shared';

export function useCounselorMembers(organizationId?: string) {
  const [members, setMembers] = useState<CounselorMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          setError('Not authenticated');
          return;
        }

        const url = organizationId
          ? `/api/counsel/members?organizationId=${organizationId}`
          : '/api/counsel/members';

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const data = await response.json();
        setMembers(data.members || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [organizationId]);

  return { members, loading, error, refetch: () => fetchMembers() };
}
```

### Step 3: Create dashboard component

**File:** `packages/web/src/components/CounselorDashboard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useCounselorMembers } from '@/hooks/useCounselorMembers';
import { CounselorMemberSummary, WellbeingStatus } from '@mychristiancounselor/shared';

export default function CounselorDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>(undefined);
  const { members, loading, error } = useCounselorMembers(selectedOrg);

  const getStoplightColor = (status: WellbeingStatus) => {
    switch (status) {
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStoplightEmoji = (status: WellbeingStatus) => {
    switch (status) {
      case 'red':
        return '🔴';
      case 'yellow':
        return '🟡';
      case 'green':
        return '🟢';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading your members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Counselor Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and support your assigned members' spiritual wellbeing
        </p>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            No members assigned yet. Contact your administrator to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  7-Day Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((memberSummary) => (
                <tr key={memberSummary.member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full"
                      title={`Status: ${memberSummary.wellbeingStatus.status}`}
                    >
                      <span className="text-2xl">
                        {getStoplightEmoji(memberSummary.wellbeingStatus.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {memberSummary.member.firstName} {memberSummary.member.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {memberSummary.member.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">
                      {memberSummary.wellbeingStatus.summary}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.lastConversationDate
                      ? new Date(memberSummary.lastConversationDate).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.totalConversations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {memberSummary.observationCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      onClick={() => {
                        // TODO: Navigate to member sessions
                        alert('View Sessions - Coming in next task');
                      }}
                    >
                      View Sessions
                    </button>
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => {
                        // TODO: Add observation
                        alert('Add Observation - Coming in Phase 3');
                      }}
                    >
                      Add Note
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Test frontend

```bash
cd packages/web
npm run dev
```

Navigate to http://localhost:3000/counsel and verify the page loads (will show "No members assigned" initially).

### Step 5: Commit frontend

```bash
git add packages/web/src/
git commit -m "feat(web): add counselor dashboard page

Create initial counselor dashboard with:
- Member list table
- Stoplight status indicators
- 7-day AI summaries
- Session/observation counts
- Placeholder action buttons"
```

---

## Task 7: Create Org-Admin Assignment Management UI

**Files:**
- Create: `packages/web/src/app/org-admin/counselor-assignments/page.tsx`
- Create: `packages/web/src/components/CounselorAssignmentManager.tsx`
- Create: `packages/web/src/components/AssignCounselorModal.tsx`

### Step 1: Create assignment manager page

**File:** `packages/web/src/app/org-admin/counselor-assignments/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CounselorAssignmentManager from '@/components/CounselorAssignmentManager';
import OrgAdminLayout from '@/components/OrgAdminLayout';

export default function CounselorAssignmentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <OrgAdminLayout>
      <CounselorAssignmentManager />
    </OrgAdminLayout>
  );
}
```

### Step 2: Create assignment manager component

**File:** `packages/web/src/components/CounselorAssignmentManager.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { CounselorAssignment } from '@mychristiancounselor/shared';
import AssignCounselorModal from './AssignCounselorModal';

export default function CounselorAssignmentManager() {
  const [assignments, setAssignments] = useState<CounselorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  useEffect(() => {
    fetchAssignments();
  }, [selectedOrg]);

  async function fetchAssignments() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Get user's organization
      const userResponse = await fetch('/api/profile/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await userResponse.json();
      const orgId = userData.organizationMemberships?.[0]?.organizationId;

      if (!orgId) {
        setAssignments([]);
        return;
      }

      setSelectedOrg(orgId);

      const response = await fetch(
        `/api/org-admin/counselor-assignments?organizationId=${orgId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndAssignment(assignmentId: string) {
    if (!confirm('Are you sure you want to end this counselor assignment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `/api/org-admin/counselor-assignments/${assignmentId}?organizationId=${selectedOrg}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to end assignment');
      }

      await fetchAssignments();
    } catch (err) {
      alert('Error ending assignment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const activeAssignments = assignments.filter(a => a.status === 'active');
  const inactiveAssignments = assignments.filter(a => a.status === 'inactive');

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Counselor Assignments
          </h1>
          <p className="text-gray-600">
            Manage counselor-member relationships for pastoral care
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Assign Counselor
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Active Assignments ({activeAssignments.length})
          </h2>
          {activeAssignments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No active assignments. Click "Assign Counselor" to create one.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Counselor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.member?.firstName} {assignment.member?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.member?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.counselor?.firstName} {assignment.counselor?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.counselor?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEndAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          End Assignment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {inactiveAssignments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Inactive Assignments ({inactiveAssignments.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Counselor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ended Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inactiveAssignments.map((assignment) => (
                    <tr key={assignment.id} className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {assignment.member?.firstName} {assignment.member?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {assignment.counselor?.firstName} {assignment.counselor?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.endedAt
                          ? new Date(assignment.endedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <AssignCounselorModal
          organizationId={selectedOrg}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
}
```

### Step 3: Create assign counselor modal

**File:** `packages/web/src/components/AssignCounselorModal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { CreateCounselorAssignmentDto } from '@mychristiancounselor/shared';

interface AssignCounselorModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignCounselorModal({
  organizationId,
  onClose,
  onSuccess,
}: AssignCounselorModalProps) {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  async function fetchData() {
    try {
      const token = localStorage.getItem('token');

      // Fetch organization members
      const response = await fetch(
        `/api/organization/${organizationId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      const allMembers = data.members || [];

      // Filter counselors (those with Counselor role)
      const counselorList = allMembers.filter((m: any) =>
        m.role?.name?.includes('Counselor')
      );

      // All members can be assigned
      setCounselors(counselorList);
      setMembers(allMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCounselor || !selectedMember) {
      setError('Please select both a counselor and a member');
      return;
    }

    if (selectedCounselor === selectedMember) {
      setError('Counselor cannot be assigned to themselves');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const dto: CreateCounselorAssignmentDto = {
        counselorId: selectedCounselor,
        memberId: selectedMember,
        organizationId,
      };

      const response = await fetch(
        `/api/org-admin/counselor-assignments?organizationId=${organizationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dto),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Assign Counselor to Member</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Counselor
            </label>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="">-- Select Counselor --</option>
              {counselors.map((counselor) => (
                <option key={counselor.user.id} value={counselor.user.id}>
                  {counselor.user.firstName} {counselor.user.lastName} ({counselor.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.firstName} {member.user.lastName} ({member.user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Assigning...' : 'Assign Counselor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 4: Test admin UI

```bash
cd packages/web
npm run dev
```

Navigate to http://localhost:3000/org-admin/counselor-assignments

### Step 5: Commit admin UI

```bash
git add packages/web/src/
git commit -m "feat(web): add counselor assignment management UI

Create org-admin interface for:
- Viewing all counselor assignments
- Creating new assignments via modal
- Ending active assignments
- Viewing assignment history"
```

---

## Task 8: Integration Testing

### Step 1: Start backend server

```bash
cd packages/api
npm run start:dev
```

**Expected Output:**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [RoutesResolver] CounselController {/counsel}
[Nest] LOG [NestApplication] Nest application successfully started
```

### Step 2: Start frontend server

```bash
cd packages/web
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3000
- event compiled successfully
```

### Step 3: Manual test checklist

Test the following flows manually:

1. **Admin creates assignment**:
   - Log in as org admin
   - Navigate to /org-admin/counselor-assignments
   - Click "Assign Counselor"
   - Select counselor and member from dropdowns
   - Submit form
   - Verify assignment appears in active list

2. **Counselor views members**:
   - Log in as counselor (user assigned in step 1)
   - Navigate to /counsel
   - Verify assigned member appears in list
   - Verify stoplight indicator shows (green by default)
   - Verify summary text displays

3. **Admin ends assignment**:
   - As org admin, go back to /org-admin/counselor-assignments
   - Click "End Assignment" on the test assignment
   - Confirm dialog
   - Verify assignment moves to inactive list

4. **Counselor no longer sees member**:
   - As counselor, refresh /counsel page
   - Verify member no longer appears in list

### Step 4: API endpoint testing with curl

Test endpoints directly:

```bash
# Get auth token (replace with actual credentials)
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"counselor@test.com","password":"password"}' \
  | jq -r '.token')

# Test GET /counsel/members
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/counsel/members

# Test GET /org-admin/counselor-assignments
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/org-admin/counselor-assignments?organizationId=YOUR_ORG_ID"
```

### Step 5: Document test results

Create a test log documenting what was tested and results.

### Step 6: Commit test documentation

```bash
git add docs/
git commit -m "docs: add Phase 1 integration test results"
```

---

## Phase 1 Success Criteria Checklist

- [x] Database schema migrated with 5 new tables
- [x] Prisma Client generated and validated
- [x] Shared TypeScript types created and exported
- [x] Assignment service created with core business logic
- [x] Counselor dashboard API endpoints implemented
- [x] Org-admin assignment management API endpoints implemented
- [x] Counselor dashboard UI page created
- [x] Org-admin assignment management UI created
- [x] Basic integration testing completed
- [x] All code committed with descriptive messages

---

## Verification Commands

Run these to verify Phase 1 is complete:

```bash
# Verify database schema
cd packages/api
npx prisma validate

# Verify API builds
npm run build

# Verify shared types build
cd ../shared
npm run build

# Verify frontend builds
cd ../web
npm run build

# Run any unit tests (if created)
npm run test
```

---

## Next Steps

After Phase 1 is complete and verified:

1. **Phase 2: AI Integration** - Implement nightly job for wellbeing analysis, AI-generated summaries, and status override functionality
2. **Phase 3: Notes & Observations** - Add counselor observation CRUD, private session notes, and PDF export
3. **Phase 4: Coverage System** - Implement temporary coverage grants and delegation
4. **Phase 5: Notifications** - Build ticker-tape notification system and messaging

---

**Phase 1 Estimated Completion Time**: 2 weeks (10 working days)

**Key Files Modified**:
- `packages/api/prisma/schema.prisma`
- `packages/shared/src/types/counselor.types.ts`
- `packages/api/src/counsel/assignment.service.ts`
- `packages/api/src/counsel/counsel.controller.ts`
- `packages/api/src/org-admin/org-admin.service.ts`
- `packages/web/src/app/counsel/page.tsx`
- `packages/web/src/app/org-admin/counselor-assignments/page.tsx`

**New Files Created**: 20+ files across backend, frontend, and types
