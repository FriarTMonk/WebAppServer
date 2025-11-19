# Support Ticket System Implementation Plan - Phase 1 (MVP)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build functional multi-tenant support ticket system with basic CRUD operations, role-based routing, and email notifications.

**Architecture:** NestJS backend with Prisma ORM, PostgreSQL database, Postmark email integration. Frontend uses Next.js 13+ with App Router. Multi-tenant security with role-based access control (individual users → platform admin, org members → org admin).

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js 13+, Postmark, TypeScript

**Phase 1 Scope:**
- Database models (4 tables: SupportTicket, TicketMessage, TicketAttachment, TicketLink)
- Basic CRUD API endpoints
- Manual priority assignment (no AI)
- Email notifications (created, resolved)
- Basic frontend (create, view, respond)
- Role-based routing

**Out of Scope (Phase 2+):**
- AI priority detection
- AI ticket linking
- SLA tracking
- Analytics dashboard
- Daily digest
- Escalation workflows

---

## Task 1: Database Schema - Prisma Models

**Files:**
- Modify: `packages/api/prisma/schema.prisma` (add 4 new models at end of file)

**Step 1: Add SupportTicket model to schema**

Add after the OrganizationContract model:

```prisma
// Support ticket for technical issues and feature requests
model SupportTicket {
  id                       String    @id @default(uuid())
  title                    String
  description              String    @db.Text
  createdById              String
  assignedToId             String?   // Null until admin claims
  organizationId           String?   // Null for individual users

  category                 String    // Role-specific categories
  status                   String    @default("open") // open, in_progress, waiting_on_user, resolved, closed, rejected
  priority                 String    @default("medium") // urgent, high, medium, low, feature (manual in Phase 1)
  workPriorityScore        Float     @default(0) // Calculated: (priority × 10) + (age × 2) + (orgSize × 0.5)
  tags                     String[]  @default([]) // Additional tagging

  isEscalated              Boolean   @default(false)
  escalatedAt              DateTime?
  escalatedById            String?
  escalatedFromOrgId       String?   // Track which org it came from
  escalationRejectedAt     DateTime? // When escalation was rejected
  escalationRejectedById   String?   // Platform admin who rejected escalation
  escalationRejectionReason String?  // Why escalation was rejected

  slaDeadline              DateTime? // Based on priority (Phase 2)
  resolvedAt               DateTime?
  closedAt                 DateTime?
  closedById               String?   // Admin who closed/rejected
  rejectionReason          String?   // Why ticket was rejected

  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  // Relations
  createdBy                User              @relation("TicketsCreated", fields: [createdById], references: [id])
  assignedTo               User?             @relation("TicketsAssigned", fields: [assignedToId], references: [id])
  closedBy                 User?             @relation("TicketsClosed", fields: [closedById], references: [id])
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
  @@index([priority])
}

// Messages and responses on support tickets
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
  author      User                 @relation("TicketMessagesAuthored", fields: [authorId], references: [id])
  attachments TicketAttachment[]

  @@index([ticketId])
  @@index([createdAt])
}

// File attachments for tickets (images only in Phase 1)
model TicketAttachment {
  id           String   @id @default(uuid())
  ticketId     String
  messageId    String?  // Attached to specific message or ticket itself
  fileName     String
  filePath     String
  fileSize     Int      // Bytes
  mimeType     String   // image/png, image/jpeg, image/gif
  uploadedById String
  createdAt    DateTime @default(now())

  ticket       SupportTicket  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  message      TicketMessage? @relation(fields: [messageId], references: [id], onDelete: Cascade)
  uploadedBy   User           @relation("TicketAttachmentsUploaded", fields: [uploadedById], references: [id])

  @@index([ticketId])
  @@index([messageId])
}

// Relationships between tickets (manual linking in Phase 1, AI suggestions in Phase 2)
model TicketLink {
  id              String   @id @default(uuid())
  sourceTicketId  String
  targetTicketId  String
  relationship    String   // 'duplicate_of', 'related_to', 'blocks', 'blocked_by'
  aiSuggested     Boolean  @default(false) // True if AI suggested this link (Phase 2)
  createdById     String
  createdAt       DateTime @default(now())

  sourceTicket    SupportTicket @relation("SourceTicket", fields: [sourceTicketId], references: [id], onDelete: Cascade)
  targetTicket    SupportTicket @relation("TargetTicket", fields: [targetTicketId], references: [id], onDelete: Cascade)
  createdBy       User          @relation("TicketLinksCreated", fields: [createdById], references: [id])

  @@unique([sourceTicketId, targetTicketId, relationship])
  @@index([sourceTicketId])
  @@index([targetTicketId])
}
```

**Step 2: Update User model to add support ticket relations**

Find the User model and add these relations before the `@@index` declarations:

```prisma
  // Support ticket relations
  ticketsCreated       SupportTicket[]       @relation("TicketsCreated")
  ticketsAssigned      SupportTicket[]       @relation("TicketsAssigned")
  ticketsClosed        SupportTicket[]       @relation("TicketsClosed")
  ticketMessagesAuthored TicketMessage[]     @relation("TicketMessagesAuthored")
  ticketAttachmentsUploaded TicketAttachment[] @relation("TicketAttachmentsUploaded")
  ticketLinksCreated   TicketLink[]          @relation("TicketLinksCreated")
```

**Step 3: Update Organization model to add support ticket relation**

Find the Organization model and add this relation in the relations section:

```prisma
  supportTickets       SupportTicket[]
```

**Step 4: Generate and run migration**

```bash
cd packages/api
npx prisma migrate dev --name add_support_ticket_system
```

Expected: Migration created successfully, database updated

**Step 5: Commit schema changes**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(api): add support ticket database schema

- Add SupportTicket, TicketMessage, TicketAttachment, TicketLink models
- Add relations to User and Organization models
- Phase 1: Manual priority, no AI features yet"
```

---

## Task 2: Backend - Support Module Setup

**Files:**
- Create: `packages/api/src/support/support.module.ts`
- Create: `packages/api/src/support/support.service.ts`
- Create: `packages/api/src/support/support.controller.ts`
- Modify: `packages/api/src/app.module.ts` (import SupportModule)

**Step 1: Create SupportModule**

Create `packages/api/src/support/support.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
```

**Step 2: Create basic SupportService**

Create `packages/api/src/support/support.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Placeholder methods - will implement in next tasks
  async createTicket(data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async getTicketById(ticketId: string, userId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async getUserTickets(userId: string): Promise<any> {
    throw new Error('Not implemented');
  }
}
```

**Step 3: Create basic SupportController**

Create `packages/api/src/support/support.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Placeholder routes - will implement in next tasks
}
```

**Step 4: Import SupportModule in AppModule**

Modify `packages/api/src/app.module.ts`:

Find the `imports` array and add `SupportModule`:

```typescript
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    // ... existing imports
    SupportModule,
  ],
  // ...
})
```

**Step 5: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 6: Commit module setup**

```bash
git add packages/api/src/support/ packages/api/src/app.module.ts
git commit -m "feat(api): create support module structure

- Add SupportModule, SupportService, SupportController
- Import EmailModule for notifications
- Placeholder methods for Phase 1 implementation"
```

---

## Task 3: Backend - Create Ticket Endpoint

**Files:**
- Modify: `packages/api/src/support/support.service.ts` (implement createTicket)
- Modify: `packages/api/src/support/support.controller.ts` (add POST /tickets route)
- Create: `packages/api/src/support/dto/create-ticket.dto.ts`

**Step 1: Create DTO for ticket creation**

Create `packages/api/src/support/dto/create-ticket.dto.ts`:

```typescript
import { IsString, IsNotEmpty, MaxLength, MinLength, IsEnum, IsOptional } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['technical', 'account', 'billing', 'feature_request', 'license_management', 'member_issues', 'counselor_tools'])
  category: string;

  @IsOptional()
  @IsString()
  @IsEnum(['urgent', 'high', 'medium', 'low', 'feature'])
  priority?: string; // Manual priority in Phase 1
}
```

**Step 2: Implement createTicket in SupportService**

Replace the placeholder `createTicket` method in `packages/api/src/support/support.service.ts`:

```typescript
async createTicket(userId: string, dto: CreateTicketDto): Promise<any> {
  // Get user with organization memberships
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizationMemberships: {
        include: { organization: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Determine organizationId (null if individual user, set if org member)
  const organizationId = user.organizationMemberships.length > 0
    ? user.organizationMemberships[0].organizationId
    : null;

  // Get org size for work priority calculation
  const orgSize = organizationId
    ? await this.prisma.organizationMember.count({ where: { organizationId } })
    : 0;

  // Map priority to numeric value
  const priorityValues = {
    urgent: 11,
    high: 9,
    medium: 6,
    low: 2,
    feature: 1,
  };
  const priority = dto.priority || 'medium';
  const priorityScore = priorityValues[priority] || 6;

  // Calculate initial work priority score
  const ageInDays = 0; // Just created
  const workPriorityScore = (priorityScore * 10) + (ageInDays * 2) + (orgSize * 0.5);

  // Create ticket
  const ticket = await this.prisma.supportTicket.create({
    data: {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: priority,
      workPriorityScore: workPriorityScore,
      createdById: userId,
      organizationId: organizationId,
    },
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  // Send email notification (async, don't await)
  this.notifyTicketCreated(ticket.id).catch(err => {
    this.logger.error(`Failed to send ticket created notification: ${err.message}`);
  });

  return ticket;
}

private async notifyTicketCreated(ticketId: string): Promise<void> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      organization: true,
    },
  });

  if (!ticket) return;

  // Get admin emails
  let adminEmails: string[] = [];

  if (ticket.organizationId) {
    // Get org admins
    const orgAdmins = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: ticket.organizationId,
        role: {
          name: { in: ['Owner', 'Admin'] },
        },
      },
      include: {
        user: { select: { email: true } },
      },
    });
    adminEmails = orgAdmins.map(m => m.user.email);
  } else {
    // Get platform admins
    const platformAdmins = await this.prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: { email: true },
    });
    adminEmails = platformAdmins.map(u => u.email);
  }

  // Send emails
  for (const email of adminEmails) {
    await this.emailService.sendEmail({
      to: email,
      from: process.env.EMAIL_FROM || 'support@mychristiancounselor.com',
      subject: `[Support] New Ticket #${ticket.id.substring(0, 8)}: ${ticket.title}`,
      text: `A new support ticket has been created.

Priority: ${ticket.priority}
Category: ${ticket.category}
Created by: ${ticket.createdBy.email}
Organization: ${ticket.organization?.name || 'Individual User'}

Description:
${ticket.description}

View ticket: ${process.env.APP_URL}/admin/support/tickets/${ticket.id}`,
    });
  }
}
```

**Step 3: Add POST /tickets route**

Add to `packages/api/src/support/support.controller.ts`:

```typescript
import { CreateTicketDto } from './dto/create-ticket.dto';

@UseGuards(JwtAuthGuard)
@Post('tickets')
async createTicket(@Request() req, @Body() dto: CreateTicketDto) {
  return this.supportService.createTicket(req.user.id, dto);
}
```

**Step 4: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 5: Commit create ticket endpoint**

```bash
git add packages/api/src/support/
git commit -m "feat(api): implement create ticket endpoint

- Add CreateTicketDto with validation
- Calculate work priority score on creation
- Determine org vs individual routing
- Send email notifications to appropriate admins
- POST /support/tickets endpoint"
```

---

## Task 4: Backend - Get User Tickets Endpoint

**Files:**
- Modify: `packages/api/src/support/support.service.ts` (implement getUserTickets, getTicketById)
- Modify: `packages/api/src/support/support.controller.ts` (add GET routes)

**Step 1: Implement getUserTickets in SupportService**

Replace the placeholder `getUserTickets` method:

```typescript
async getUserTickets(userId: string, filters?: {
  status?: string[];
  priority?: string[];
  category?: string[];
}): Promise<any> {
  const where: any = {
    createdById: userId,
  };

  if (filters?.status) {
    where.status = { in: filters.status };
  }

  if (filters?.priority) {
    where.priority = { in: filters.priority };
  }

  if (filters?.category) {
    where.category = { in: filters.category };
  }

  const tickets = await this.prisma.supportTicket.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      organization: {
        select: { id: true, name: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Last message only
        select: {
          id: true,
          content: true,
          createdAt: true,
          authorRole: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tickets;
}
```

**Step 2: Implement getTicketById in SupportService**

Replace the placeholder `getTicketById` method:

```typescript
async getTicketById(ticketId: string, userId: string): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      organization: {
        select: { id: true, name: true },
      },
      messages: {
        where: { isInternal: false }, // Users don't see internal notes
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          attachments: true,
        },
      },
      attachments: true,
    },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Verify user can view this ticket (must be creator)
  if (ticket.createdById !== userId) {
    throw new ForbiddenException('You do not have permission to view this ticket');
  }

  return ticket;
}
```

**Step 3: Add GET routes to controller**

Add to `packages/api/src/support/support.controller.ts`:

```typescript
import { Query } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Get('tickets')
async getUserTickets(
  @Request() req,
  @Query('status') status?: string,
  @Query('priority') priority?: string,
  @Query('category') category?: string,
) {
  const filters: any = {};

  if (status) {
    filters.status = status.split(',');
  }

  if (priority) {
    filters.priority = priority.split(',');
  }

  if (category) {
    filters.category = category.split(',');
  }

  return this.supportService.getUserTickets(req.user.id, filters);
}

@UseGuards(JwtAuthGuard)
@Get('tickets/:id')
async getTicket(@Request() req, @Param('id') id: string) {
  return this.supportService.getTicketById(id, req.user.id);
}
```

**Step 4: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 5: Commit get tickets endpoints**

```bash
git add packages/api/src/support/
git commit -m "feat(api): implement get tickets endpoints

- GET /support/tickets - list user's tickets with filters
- GET /support/tickets/:id - get ticket detail
- Include messages and attachments
- Verify user permissions (creator only)"
```

---

## Task 5: Backend - Reply to Ticket Endpoint

**Files:**
- Modify: `packages/api/src/support/support.service.ts` (add addMessage method)
- Modify: `packages/api/src/support/support.controller.ts` (add POST /tickets/:id/messages route)
- Create: `packages/api/src/support/dto/create-message.dto.ts`

**Step 1: Create DTO for message**

Create `packages/api/src/support/dto/create-message.dto.ts`:

```typescript
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  content: string;
}
```

**Step 2: Add addMessage method to SupportService**

Add to `packages/api/src/support/support.service.ts`:

```typescript
async addMessage(ticketId: string, userId: string, dto: CreateMessageDto): Promise<any> {
  // Get ticket
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignedTo: true,
    },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Verify user can reply (must be creator or assigned admin)
  const canReply = ticket.createdById === userId || ticket.assignedToId === userId;

  if (!canReply) {
    throw new ForbiddenException('You do not have permission to reply to this ticket');
  }

  // Determine author role
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true, organizationMemberships: true },
  });

  let authorRole = 'user';
  if (user.isPlatformAdmin) {
    authorRole = 'platform_admin';
  } else if (ticket.organizationId && user.organizationMemberships.some(m => m.organizationId === ticket.organizationId)) {
    // Check if org admin
    const orgMember = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: ticket.organizationId,
      },
      include: { role: true },
    });
    if (orgMember && ['Owner', 'Admin'].includes(orgMember.role.name)) {
      authorRole = 'org_admin';
    }
  }

  // Create message
  const message = await this.prisma.ticketMessage.create({
    data: {
      ticketId: ticketId,
      authorId: userId,
      authorRole: authorRole,
      content: dto.content,
      isInternal: false, // User messages are always public
    },
    include: {
      author: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  // Update ticket status if user replied
  if (ticket.createdById === userId && ticket.status === 'waiting_on_user') {
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
    });
  }

  // Send email notification
  if (authorRole === 'user' && ticket.assignedToId) {
    // User replied, notify assigned admin
    this.notifyAdminOfReply(ticketId, ticket.assignedTo.email).catch(err => {
      this.logger.error(`Failed to send reply notification: ${err.message}`);
    });
  } else if (authorRole !== 'user' && ticket.createdById) {
    // Admin replied, notify user
    this.notifyUserOfReply(ticketId, ticket.createdBy.email).catch(err => {
      this.logger.error(`Failed to send reply notification: ${err.message}`);
    });

    // Update status to waiting_on_user
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'waiting_on_user' },
    });
  }

  return message;
}

private async notifyAdminOfReply(ticketId: string, adminEmail: string): Promise<void> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, title: true },
  });

  await this.emailService.sendEmail({
    to: adminEmail,
    from: process.env.EMAIL_FROM || 'support@mychristiancounselor.com',
    subject: `[Support] User replied to ticket #${ticket.id.substring(0, 8)}`,
    text: `The user has replied to ticket: ${ticket.title}

View ticket: ${process.env.APP_URL}/admin/support/tickets/${ticket.id}`,
  });
}

private async notifyUserOfReply(ticketId: string, userEmail: string): Promise<void> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, title: true },
  });

  await this.emailService.sendEmail({
    to: userEmail,
    from: process.env.EMAIL_FROM || 'support@mychristiancounselor.com',
    subject: `[Support] Response to your ticket #${ticket.id.substring(0, 8)}`,
    text: `A support admin has responded to your ticket: ${ticket.title}

View ticket: ${process.env.APP_URL}/support/tickets/${ticket.id}`,
  });
}
```

**Step 3: Add POST /tickets/:id/messages route**

Add to `packages/api/src/support/support.controller.ts`:

```typescript
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(JwtAuthGuard)
@Post('tickets/:id/messages')
async addMessage(
  @Request() req,
  @Param('id') id: string,
  @Body() dto: CreateMessageDto,
) {
  return this.supportService.addMessage(id, req.user.id, dto);
}
```

**Step 4: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 5: Commit reply endpoint**

```bash
git add packages/api/src/support/
git commit -m "feat(api): implement reply to ticket endpoint

- POST /support/tickets/:id/messages
- Verify permissions (creator or assigned admin)
- Auto-update ticket status on reply
- Send email notifications to relevant parties"
```

---

## Task 6: Backend - Admin Ticket Queue Endpoint

**Files:**
- Modify: `packages/api/src/support/support.service.ts` (add getAdminTicketQueue method)
- Modify: `packages/api/src/support/support.controller.ts` (add GET /admin/tickets route)

**Step 1: Add getAdminTicketQueue method**

Add to `packages/api/src/support/support.service.ts`:

```typescript
async getAdminTicketQueue(userId: string, filters?: {
  status?: string[];
  priority?: string[];
  unassigned?: boolean;
  assignedToMe?: boolean;
}): Promise<any> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPlatformAdmin: true,
      organizationMemberships: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Build where clause based on user role
  const where: any = {
    status: { notIn: ['closed', 'rejected'] }, // Active tickets only
  };

  // Apply status filter
  if (filters?.status) {
    where.status = { in: filters.status };
  }

  // Apply priority filter
  if (filters?.priority) {
    where.priority = { in: filters.priority };
  }

  // Apply assignment filter
  if (filters?.unassigned) {
    where.assignedToId = null;
  } else if (filters?.assignedToMe) {
    where.assignedToId = userId;
  }

  // Apply role-based visibility
  if (user.isPlatformAdmin) {
    // Platform admins see:
    // - Individual user tickets (organizationId = null)
    // - Escalated tickets (isEscalated = true)
    where.OR = [
      { organizationId: null },
      { isEscalated: true },
    ];
  } else {
    // Org admins see only their org's tickets (not escalated)
    const orgAdminRoles = user.organizationMemberships.filter(m =>
      ['Owner', 'Admin'].includes(m.role.name)
    );

    if (orgAdminRoles.length === 0) {
      throw new ForbiddenException('You do not have admin permissions');
    }

    const orgIds = orgAdminRoles.map(m => m.organizationId);

    where.organizationId = { in: orgIds };
    where.isEscalated = false; // Don't show escalated tickets to org admins
  }

  // Get tickets
  const tickets = await this.prisma.supportTicket.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      organization: {
        select: { id: true, name: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      },
    },
    orderBy: { workPriorityScore: 'desc' }, // Sort by priority score
  });

  return tickets;
}
```

**Step 2: Add GET /admin/tickets route**

Add to `packages/api/src/support/support.controller.ts`:

```typescript
@UseGuards(JwtAuthGuard)
@Get('admin/tickets')
async getAdminTickets(
  @Request() req,
  @Query('status') status?: string,
  @Query('priority') priority?: string,
  @Query('unassigned') unassigned?: string,
  @Query('assignedToMe') assignedToMe?: string,
) {
  const filters: any = {};

  if (status) {
    filters.status = status.split(',');
  }

  if (priority) {
    filters.priority = priority.split(',');
  }

  if (unassigned === 'true') {
    filters.unassigned = true;
  }

  if (assignedToMe === 'true') {
    filters.assignedToMe = true;
  }

  return this.supportService.getAdminTicketQueue(req.user.id, filters);
}
```

**Step 3: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 4: Commit admin queue endpoint**

```bash
git add packages/api/src/support/
git commit -m "feat(api): implement admin ticket queue endpoint

- GET /admin/tickets with filters
- Role-based visibility (platform vs org admin)
- Sorted by work priority score
- Filter by status, priority, assignment"
```

---

## Task 7: Backend - Assign Ticket & Resolve Endpoints

**Files:**
- Modify: `packages/api/src/support/support.service.ts` (add assignTicket, resolveTicket methods)
- Modify: `packages/api/src/support/support.controller.ts` (add POST routes)

**Step 1: Add assignTicket method**

Add to `packages/api/src/support/support.service.ts`:

```typescript
async assignTicket(ticketId: string, adminId: string): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Verify admin can assign this ticket
  await this.verifyAdminCanAccessTicket(adminId, ticket);

  // Assign ticket
  const updated = await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      assignedToId: adminId,
      status: 'in_progress',
    },
    include: {
      createdBy: true,
      assignedTo: true,
    },
  });

  return updated;
}

private async verifyAdminCanAccessTicket(adminId: string, ticket: any): Promise<void> {
  const user = await this.prisma.user.findUnique({
    where: { id: adminId },
    select: {
      isPlatformAdmin: true,
      organizationMemberships: {
        where: {
          organizationId: ticket.organizationId,
          role: {
            name: { in: ['Owner', 'Admin'] },
          },
        },
      },
    },
  });

  const canAccess = user.isPlatformAdmin ||
    (ticket.organizationId && user.organizationMemberships.length > 0);

  if (!canAccess) {
    throw new ForbiddenException('You do not have permission to access this ticket');
  }
}
```

**Step 2: Add resolveTicket method**

Add to `packages/api/src/support/support.service.ts`:

```typescript
async resolveTicket(ticketId: string, adminId: string): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
    },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Verify admin can resolve this ticket
  await this.verifyAdminCanAccessTicket(adminId, ticket);

  // Update ticket
  const updated = await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
    },
  });

  // Send email notification
  this.notifyTicketResolved(ticketId, ticket.createdBy.email).catch(err => {
    this.logger.error(`Failed to send resolved notification: ${err.message}`);
  });

  return updated;
}

private async notifyTicketResolved(ticketId: string, userEmail: string): Promise<void> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, title: true },
  });

  await this.emailService.sendEmail({
    to: userEmail,
    from: process.env.EMAIL_FROM || 'support@mychristiancounselor.com',
    subject: `[Support] Your ticket has been resolved - #${ticket.id.substring(0, 8)}`,
    text: `Good news! Your support ticket has been resolved: ${ticket.title}

If this resolves your issue, the ticket will auto-close in 7 days.
If you need further assistance, you can reply to reopen the ticket.

View ticket: ${process.env.APP_URL}/support/tickets/${ticket.id}`,
  });
}
```

**Step 3: Add POST routes**

Add to `packages/api/src/support/support.controller.ts`:

```typescript
@UseGuards(JwtAuthGuard)
@Post('admin/tickets/:id/assign')
async assignTicket(@Request() req, @Param('id') id: string) {
  return this.supportService.assignTicket(id, req.user.id);
}

@UseGuards(JwtAuthGuard)
@Post('admin/tickets/:id/resolve')
async resolveTicket(@Request() req, @Param('id') id: string) {
  return this.supportService.resolveTicket(id, req.user.id);
}
```

**Step 4: Build to verify no errors**

```bash
npx nx build api
```

Expected: Build succeeds

**Step 5: Commit assign and resolve endpoints**

```bash
git add packages/api/src/support/
git commit -m "feat(api): implement assign and resolve ticket endpoints

- POST /admin/tickets/:id/assign - claim ticket
- POST /admin/tickets/:id/resolve - mark resolved
- Verify admin permissions
- Send email notification on resolve"
```

---

## Task 8: Frontend - Create Ticket Page

**Files:**
- Create: `packages/web/src/app/support/page.tsx`
- Create: `packages/web/src/components/support/CreateTicketForm.tsx`

**Step 1: Create CreateTicketForm component**

Create `packages/web/src/components/support/CreateTicketForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function CreateTicketForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium',
  });

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'account', label: 'Account Help' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature_request', label: 'Feature Request' },
  ];

  const priorities = [
    { value: 'urgent', label: 'Urgent - App is down' },
    { value: 'high', label: 'High - App unusable' },
    { value: 'medium', label: 'Medium - App glitchy' },
    { value: 'low', label: 'Low - Minor issue' },
    { value: 'feature', label: 'Feature Request' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/support/tickets', formData);
      router.push(`/support/tickets/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create ticket');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Create Support Ticket</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of your issue"
          minLength={10}
          maxLength={200}
          required
        />
        <p className="text-sm text-gray-500 mt-1">{formData.title.length}/200 characters</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Priority <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        >
          {priorities.map((pri) => (
            <option key={pri.value} value={pri.value}>
              {pri.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          rows={8}
          placeholder="Please describe your issue in detail..."
          minLength={50}
          maxLength={5000}
          required
        />
        <p className="text-sm text-gray-500 mt-1">{formData.description.length}/5000 characters</p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border rounded hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Ticket'}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Create support page**

Create `packages/web/src/app/support/page.tsx`:

```typescript
import CreateTicketForm from '@/components/support/CreateTicketForm';

export default function SupportPage() {
  return (
    <div className="container mx-auto py-8">
      <CreateTicketForm />
    </div>
  );
}
```

**Step 3: Build to verify no errors**

```bash
npx nx build web
```

Expected: Build succeeds

**Step 4: Commit create ticket frontend**

```bash
git add packages/web/src/app/support/ packages/web/src/components/support/
git commit -m "feat(web): implement create ticket page

- CreateTicketForm component with validation
- Category and priority selection
- Character count indicators
- Form validation and error handling"
```

---

## Task 9: Frontend - My Tickets List Page

**Files:**
- Create: `packages/web/src/app/support/tickets/page.tsx`
- Create: `packages/web/src/components/support/TicketList.tsx`

**Step 1: Create TicketList component**

Create `packages/web/src/components/support/TicketList.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  messages: any[];
}

export default function TicketList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await api.get('/support/tickets');
      setTickets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting_on_user: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
      feature: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading tickets...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Support Tickets</h1>
        <button
          onClick={() => router.push('/support')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600 mb-4">You haven't created any support tickets yet.</p>
          <button
            onClick={() => router.push('/support')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Ticket
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{ticket.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {ticket.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityBadgeColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
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

**Step 2: Create tickets page**

Create `packages/web/src/app/support/tickets/page.tsx`:

```typescript
import TicketList from '@/components/support/TicketList';

export default function TicketsPage() {
  return (
    <div className="container mx-auto py-8">
      <TicketList />
    </div>
  );
}
```

**Step 3: Build to verify no errors**

```bash
npx nx build web
```

Expected: Build succeeds

**Step 4: Commit tickets list frontend**

```bash
git add packages/web/src/app/support/tickets/ packages/web/src/components/support/
git commit -m "feat(web): implement my tickets list page

- TicketList component with table view
- Status and priority badges with color coding
- Click to view ticket detail
- Empty state for no tickets"
```

---

## Task 10: Frontend - Ticket Detail Page

**Files:**
- Create: `packages/web/src/app/support/tickets/[id]/page.tsx`
- Create: `packages/web/src/components/support/TicketDetail.tsx`

**Step 1: Create TicketDetail component**

Create `packages/web/src/components/support/TicketDetail.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Message {
  id: string;
  content: string;
  authorRole: string;
  createdAt: string;
  author: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  messages: Message[];
}

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/support/tickets/${ticketId}/messages`, {
        content: replyContent,
      });
      setReplyContent('');
      await loadTicket(); // Reload to show new message
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading ticket...</div>;
  }

  if (error || !ticket) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        {error || 'Ticket not found'}
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting_on_user: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              #{ticket.id.substring(0, 8)} - {ticket.title}
            </h1>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusBadgeColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 text-sm font-medium rounded bg-gray-100 text-gray-800">
                {ticket.priority}
              </span>
              <span className="px-3 py-1 text-sm font-medium rounded bg-gray-100 text-gray-800">
                {ticket.category}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/support/tickets')}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Back to Tickets
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Created {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Original Description */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Original Issue</h2>
        <p className="whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Messages */}
      {ticket.messages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-4">Conversation</h2>
          <div className="space-y-4">
            {ticket.messages.map((message) => (
              <div key={message.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {message.author.firstName || message.author.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.authorRole === 'user' ? '(You)' : '(Support)'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply Form */}
      {ticket.status !== 'closed' && ticket.status !== 'rejected' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Add Reply</h2>
          <form onSubmit={handleReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 mb-4"
              rows={6}
              placeholder="Type your reply here..."
              minLength={10}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting || !replyContent.trim()}
              >
                {submitting ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>
      )}

      {ticket.status === 'resolved' && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
          <p className="text-green-800">
            This ticket has been marked as resolved. If you need further assistance, you can reply to reopen it.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create ticket detail page**

Create `packages/web/src/app/support/tickets/[id]/page.tsx`:

```typescript
import TicketDetail from '@/components/support/TicketDetail';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <TicketDetail ticketId={params.id} />
    </div>
  );
}
```

**Step 3: Build to verify no errors**

```bash
npx nx build web
```

Expected: Build succeeds

**Step 4: Commit ticket detail frontend**

```bash
git add packages/web/src/app/support/tickets/ packages/web/src/components/support/
git commit -m "feat(web): implement ticket detail page

- TicketDetail component with full conversation
- Reply form for user responses
- Status badges and metadata display
- Resolved ticket notice"
```

---

## Phase 1 Complete!

**What We've Built:**
- ✅ Database schema (4 models)
- ✅ Backend API endpoints (create, list, view, reply, assign, resolve)
- ✅ Role-based routing (individual → platform, org → org admin)
- ✅ Email notifications (created, resolved, reply)
- ✅ Frontend pages (create, list, detail)
- ✅ Manual priority assignment
- ✅ Basic work priority calculation

**Next Steps (Phase 2):**
- AI priority detection
- AI ticket linking
- SLA tracking
- Escalation workflows
- Admin dashboard
- Analytics

**Testing the MVP:**
1. Start API: `cd packages/api && npm run start:dev`
2. Start Web: `cd packages/web && npm run dev`
3. Create account and login
4. Go to `/support` to create ticket
5. Check email for notification
6. Admin: go to `/admin/support/tickets` to view queue
7. Admin: assign ticket and respond
8. User: reply to ticket
9. Admin: resolve ticket
10. Check email for resolved notification

---

**Implementation Complete!** 🎉
