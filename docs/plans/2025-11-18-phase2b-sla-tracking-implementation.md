# Phase 2B: SLA Tracking + Escalation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SLA (Service Level Agreement) tracking with response and resolution deadlines, business hours calculation, holiday exclusions, and visual indicators.

**Architecture:** Backend services calculate SLA deadlines based on priority-based targets and business hours (Mon-Fri 10 AM - 10 PM EST). Scheduled job updates SLA status every 15 minutes. Frontend displays color-coded badges and countdown timers. Admin interface manages holiday calendar.

**Tech Stack:** NestJS, Prisma, PostgreSQL, date-fns, date-fns-tz, React, TypeScript

---

## Table of Contents

1. [Task 1: Database Schema Changes](#task-1-database-schema-changes)
2. [Task 2: Install Dependencies](#task-2-install-dependencies)
3. [Task 3: Seed Federal Holidays](#task-3-seed-federal-holidays)
4. [Task 4: Create SLA Calculator Service](#task-4-create-sla-calculator-service)
5. [Task 5: Create Holiday Service](#task-5-create-holiday-service)
6. [Task 6: Create Holiday Management API](#task-6-create-holiday-management-api)
7. [Task 7: Integrate SLA into Ticket Creation](#task-7-integrate-sla-into-ticket-creation)
8. [Task 8: Integrate SLA Pause/Resume](#task-8-integrate-sla-pauseresume)
9. [Task 9: Integrate SLA Metrics on Resolution](#task-9-integrate-sla-metrics-on-resolution)
10. [Task 10: Create SLA Scheduler](#task-10-create-sla-scheduler)
11. [Task 11: Frontend - SLA Badge Component](#task-11-frontend---sla-badge-component)
12. [Task 12: Frontend - Ticket List SLA Integration](#task-12-frontend---ticket-list-sla-integration)
13. [Task 13: Frontend - Holiday Management UI](#task-13-frontend---holiday-management-ui)
14. [Task 14: Admin Dashboard SLA Stats](#task-14-admin-dashboard-sla-stats)
15. [Task 15: Final Testing and Verification](#task-15-final-testing-and-verification)

---

## Task 1: Database Schema Changes

**Files:**
- Modify: `packages/api/prisma/schema.prisma`
- Create: Migration file (auto-generated)

### Step 1: Add Holiday Model

Add the Holiday model to `schema.prisma` after the Notification model:

```prisma
// Holiday calendar for SLA calculations
model Holiday {
  id          String   @id @default(uuid())
  name        String   // "New Year's Day", "Christmas", etc.
  date        DateTime // The holiday date
  isRecurring Boolean  @default(false) // Annual holidays
  createdById String
  createdAt   DateTime @default(now())

  createdBy User @relation("HolidaysCreated", fields: [createdById], references: [id])

  @@index([date])
}
```

### Step 2: Add Holiday Relation to User Model

In the User model, add the holidays relation:

```prisma
model User {
  // ... existing fields ...

  // Holiday management
  holidaysCreated Holiday[] @relation("HolidaysCreated")

  // ... rest of relations ...
}
```

### Step 3: Update SupportTicket Model with SLA Fields

In the SupportTicket model, add SLA-related fields before the createdAt field:

```prisma
model SupportTicket {
  // ... existing fields up to aiDetectedPriority ...

  // SLA Deadlines
  responseSLADeadline   DateTime? // When first response is due
  resolutionSLADeadline DateTime? // When resolution is due

  // SLA State
  responseSLAStatus     String    @default("on_track") // on_track, approaching, critical, breached
  resolutionSLAStatus   String    @default("on_track")

  // SLA Pause tracking
  slaPausedAt           DateTime? // When SLA was paused
  slaPausedReason       String?   // "waiting_on_user"

  // SLA History (recorded when ticket resolved/closed)
  actualResponseTime    Int?      // Minutes from creation to first admin response
  actualResolutionTime  Int?      // Minutes from creation to resolved (excluding paused time)
  responseSLAMet        Boolean?  // Was response SLA met?
  resolutionSLAMet      Boolean?  // Was resolution SLA met?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ... rest of model ...
}
```

### Step 4: Add Indexes for SLA Fields

Add indexes after the existing indexes in SupportTicket model:

```prisma
  @@index([responseSLADeadline])
  @@index([resolutionSLADeadline])
  @@index([responseSLAStatus])
  @@index([resolutionSLAStatus])
```

### Step 5: Create Migration

Run from `packages/api` directory:

```bash
npx prisma migrate dev --name add_sla_tracking
```

Expected output: Migration created successfully

### Step 6: Verify Migration

Check the generated migration file in `packages/api/prisma/migrations/[timestamp]_add_sla_tracking/migration.sql`

Verify it includes:
- CREATE TABLE "Holiday"
- ALTER TABLE "User" ADD COLUMN for holidaysCreated
- ALTER TABLE "SupportTicket" ADD COLUMN for all new SLA fields
- CREATE INDEX statements for new indexes

### Step 7: Apply Migration

Run:

```bash
npx prisma migrate deploy
```

Expected output: Migration applied successfully

### Step 8: Generate Prisma Client

Run:

```bash
npx prisma generate
```

Expected output: Prisma Client generated successfully

### Step 9: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 10: Commit Schema Changes

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(api): add SLA tracking database schema

- Add Holiday model for business days calculation
- Add SLA deadline and status fields to SupportTicket
- Add SLA pause tracking for waiting_on_user status
- Add SLA history metrics (response time, resolution time, SLA met flags)
- Add indexes for SLA queries

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `packages/api/package.json`

### Step 1: Install date-fns Libraries

Run from `packages/api` directory:

```bash
npm install date-fns date-fns-tz
```

Expected output: Packages installed successfully

### Step 2: Verify Installation

Check `packages/api/package.json` contains:

```json
{
  "dependencies": {
    "date-fns": "^3.0.0",
    "date-fns-tz": "^2.0.0"
  }
}
```

(Versions may vary)

### Step 3: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 4: Commit Dependency Changes

```bash
git add packages/api/package.json package-lock.json
git commit -m "chore(api): install date-fns for SLA business hours calculation

- Install date-fns for date manipulation
- Install date-fns-tz for timezone handling (EST/EDT)

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 3: Seed Federal Holidays

**Files:**
- Create: `packages/api/prisma/seeds/seed-holidays.ts`
- Modify: `packages/api/prisma/seed.ts`

### Step 1: Create Holiday Seed File

Create `packages/api/prisma/seeds/seed-holidays.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHolidays() {
  console.log('Seeding federal holidays...');

  // Get first platform admin to assign as creator
  const platformAdmin = await prisma.user.findFirst({
    where: { isPlatformAdmin: true },
  });

  if (!platformAdmin) {
    console.warn('No platform admin found, skipping holiday seed');
    return;
  }

  const federalHolidays = [
    {
      name: "New Year's Day",
      date: new Date('2025-01-01'),
      isRecurring: true,
    },
    {
      name: 'Memorial Day',
      date: new Date('2025-05-26'), // Last Monday in May 2025
      isRecurring: true,
    },
    {
      name: 'Independence Day',
      date: new Date('2025-07-04'),
      isRecurring: true,
    },
    {
      name: 'Labor Day',
      date: new Date('2025-09-01'), // First Monday in September 2025
      isRecurring: true,
    },
    {
      name: 'Thanksgiving',
      date: new Date('2025-11-27'), // 4th Thursday in November 2025
      isRecurring: true,
    },
    {
      name: 'Christmas Day',
      date: new Date('2025-12-25'),
      isRecurring: true,
    },
  ];

  for (const holiday of federalHolidays) {
    await prisma.holiday.upsert({
      where: {
        // Composite unique check (we'll use name + year for now)
        // Since we don't have a unique constraint, we'll check if exists first
        id: '', // Will never match, forces create
      },
      update: {},
      create: {
        ...holiday,
        createdById: platformAdmin.id,
      },
    });
  }

  console.log(`Seeded ${federalHolidays.length} federal holidays`);
}

export { seedHolidays };
```

### Step 2: Update Main Seed File

Modify `packages/api/prisma/seed.ts` to import and call holiday seed:

Add import at top:

```typescript
import { seedHolidays } from './seeds/seed-holidays';
```

Add call in main function before the final log:

```typescript
async function main() {
  // ... existing seed code ...

  // Seed federal holidays
  await seedHolidays();

  console.log('Seeding completed successfully');
}
```

### Step 3: Create Seeds Directory

Run from `packages/api`:

```bash
mkdir -p prisma/seeds
```

### Step 4: Run Seed

Run from `packages/api`:

```bash
npm run seed
```

Expected output: "Seeded 6 federal holidays"

### Step 5: Verify Holidays in Database

Run:

```bash
npx prisma studio
```

Open Holiday table and verify 6 holidays exist with isRecurring = true

### Step 6: Commit Holiday Seed

```bash
git add packages/api/prisma/seeds/seed-holidays.ts packages/api/prisma/seed.ts
git commit -m "feat(api): seed federal holidays for SLA calculations

- Create holiday seed script with 6 US federal holidays
- All holidays marked as recurring
- Holidays used to exclude non-business days from SLA calculations

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 4: Create SLA Calculator Service

**Files:**
- Create: `packages/api/src/sla/sla-calculator.service.ts`
- Create: `packages/api/src/sla/sla.module.ts`
- Create: `packages/api/src/sla/constants.ts`

### Step 1: Create SLA Constants File

Create `packages/api/src/sla/constants.ts`:

```typescript
/**
 * SLA targets in hours based on priority level
 * All times are in business hours (Mon-Fri 10 AM - 10 PM EST)
 */
export const SLA_TARGETS = {
  urgent: {
    response: 4, // 4 hours
    resolution: 24, // 1 day
  },
  high: {
    response: 24, // 1 day
    resolution: 120, // 5 days
  },
  medium: {
    response: 72, // 3 days
    resolution: 720, // 30 days
  },
  low: {
    response: 120, // 5 days
    resolution: 2160, // 90 days
  },
  feature: {
    response: 120, // 5 days
    resolution: null, // Roadmap-driven, no SLA
  },
};

/**
 * Business hours configuration
 */
export const BUSINESS_HOURS = {
  timezone: 'America/New_York',
  startHour: 10, // 10 AM
  endHour: 22, // 10 PM
  weekdays: [1, 2, 3, 4, 5], // Monday-Friday
};

/**
 * SLA status thresholds (percentage of time elapsed)
 */
export const SLA_THRESHOLDS = {
  approaching: 60, // Yellow warning
  critical: 80, // Orange warning
  breached: 100, // Red alert
};
```

### Step 2: Create SLA Calculator Service

Create `packages/api/src/sla/sla-calculator.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  addHours,
  addMinutes,
  differenceInMinutes,
  format,
  getDay,
  getHours,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SLA_TARGETS, BUSINESS_HOURS, SLA_THRESHOLDS } from './constants';

export type SLAStatus = 'on_track' | 'approaching' | 'critical' | 'breached';
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'feature';

interface Holiday {
  id: string;
  date: Date;
  name: string;
  isRecurring: boolean;
}

@Injectable()
export class SlaCalculatorService {
  private readonly logger = new Logger(SlaCalculatorService.name);
  private holidayCache: Holiday[] = [];
  private holidayCacheExpiry: Date = new Date(0);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate SLA deadline from a start time
   */
  async calculateDeadline(
    startTime: Date,
    slaHours: number,
  ): Promise<Date | null> {
    if (slaHours === null || slaHours === undefined) {
      return null; // No SLA for this priority level
    }

    const holidays = await this.getHolidays();

    // Convert start time to business timezone
    const startInTz = toZonedTime(startTime, BUSINESS_HOURS.timezone);

    // Add business hours to get deadline
    const deadline = this.addBusinessHours(startInTz, slaHours, holidays);

    // Convert back to UTC for storage
    return fromZonedTime(deadline, BUSINESS_HOURS.timezone);
  }

  /**
   * Add business hours to a date
   */
  private addBusinessHours(
    start: Date,
    hoursToAdd: number,
    holidays: Holiday[],
  ): Date {
    let current = new Date(start);
    let hoursAdded = 0;

    // If start time is outside business hours, advance to next business hour
    current = this.advanceToNextBusinessHour(current, holidays);

    // Add hours one at a time
    while (hoursAdded < hoursToAdd) {
      if (this.isBusinessHour(current, holidays)) {
        hoursAdded++;
        current = addHours(current, 1);
      } else {
        // Advance to next business hour
        current = this.advanceToNextBusinessHour(current, holidays);
      }
    }

    return current;
  }

  /**
   * Check if a given time is within business hours
   */
  private isBusinessHour(date: Date, holidays: Holiday[]): boolean {
    // Check if weekend
    const dayOfWeek = getDay(date);
    if (!BUSINESS_HOURS.weekdays.includes(dayOfWeek)) {
      return false;
    }

    // Check if holiday
    if (this.isHoliday(date, holidays)) {
      return false;
    }

    // Check if within business hours (10 AM - 10 PM)
    const hour = getHours(date);
    return hour >= BUSINESS_HOURS.startHour && hour < BUSINESS_HOURS.endHour;
  }

  /**
   * Check if a date is a holiday
   */
  private isHoliday(date: Date, holidays: Holiday[]): boolean {
    const dateStart = startOfDay(date);

    return holidays.some((holiday) => {
      const holidayDate = startOfDay(holiday.date);

      if (holiday.isRecurring) {
        // For recurring holidays, check month and day only
        return (
          holidayDate.getMonth() === dateStart.getMonth() &&
          holidayDate.getDate() === dateStart.getDate()
        );
      } else {
        // For non-recurring, check exact date
        return isSameDay(holidayDate, dateStart);
      }
    });
  }

  /**
   * Advance to the next business hour
   */
  private advanceToNextBusinessHour(
    current: Date,
    holidays: Holiday[],
  ): Date {
    let next = new Date(current);

    // If currently in business hours, return as-is
    if (this.isBusinessHour(next, holidays)) {
      return next;
    }

    // If after business hours today, advance to next day 10 AM
    const hour = getHours(next);
    if (hour >= BUSINESS_HOURS.endHour || hour < BUSINESS_HOURS.startHour) {
      // Set to next day at start hour
      next = startOfDay(addHours(next, 24 - hour + BUSINESS_HOURS.startHour));
    }

    // Keep advancing by day until we hit a business day
    while (!this.isBusinessHour(next, holidays)) {
      next = addHours(next, 24);
      next = startOfDay(next);
      next = addHours(next, BUSINESS_HOURS.startHour);
    }

    return next;
  }

  /**
   * Calculate business minutes between two dates
   */
  calculateBusinessMinutes(start: Date, end: Date): number {
    const holidays = this.holidayCache; // Use cached holidays
    let minutes = 0;
    let current = new Date(start);

    // Convert to business timezone
    const startInTz = toZonedTime(current, BUSINESS_HOURS.timezone);
    const endInTz = toZonedTime(end, BUSINESS_HOURS.timezone);

    current = new Date(startInTz);
    const endTime = new Date(endInTz);

    // Count business minutes
    while (current < endTime) {
      if (this.isBusinessHour(current, holidays)) {
        minutes++;
      }
      current = addMinutes(current, 1);

      // Performance optimization: if we're counting many days, skip ahead
      if (differenceInMinutes(endTime, current) > 60 * 24) {
        // Skip to next business day if not in business hours
        if (!this.isBusinessHour(current, holidays)) {
          current = this.advanceToNextBusinessHour(current, holidays);
        }
      }
    }

    return minutes;
  }

  /**
   * Calculate current SLA status
   */
  calculateSLAStatus(
    createdAt: Date,
    deadline: Date | null,
    pausedMinutes: number = 0,
  ): SLAStatus {
    if (!deadline) {
      return 'on_track'; // No SLA for this priority
    }

    const totalMinutes = this.calculateBusinessMinutes(createdAt, deadline);
    const elapsedMinutes =
      this.calculateBusinessMinutes(createdAt, new Date()) - pausedMinutes;
    const percentElapsed = (elapsedMinutes / totalMinutes) * 100;

    if (percentElapsed >= SLA_THRESHOLDS.breached) return 'breached';
    if (percentElapsed >= SLA_THRESHOLDS.critical) return 'critical';
    if (percentElapsed >= SLA_THRESHOLDS.approaching) return 'approaching';
    return 'on_track';
  }

  /**
   * Get SLA hours for a priority level
   */
  getSLAHours(priority: Priority, type: 'response' | 'resolution'): number {
    const target = SLA_TARGETS[priority];
    if (!target) {
      this.logger.warn(`Unknown priority: ${priority}, defaulting to medium`);
      return SLA_TARGETS.medium[type];
    }
    return target[type];
  }

  /**
   * Pause SLA for a ticket
   */
  async pauseSLA(ticketId: string, reason: string): Promise<void> {
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        slaPausedAt: new Date(),
        slaPausedReason: reason,
      },
    });

    this.logger.log(`SLA paused for ticket ${ticketId}: ${reason}`);
  }

  /**
   * Resume SLA for a ticket
   */
  async resumeSLA(ticketId: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || !ticket.slaPausedAt) {
      return; // Nothing to resume
    }

    // Calculate pause duration in business minutes
    const pauseDuration = this.calculateBusinessMinutes(
      ticket.slaPausedAt,
      new Date(),
    );

    // Extend deadlines by pause duration
    const newResponseDeadline = ticket.responseSLADeadline
      ? addMinutes(ticket.responseSLADeadline, pauseDuration)
      : null;

    const newResolutionDeadline = ticket.resolutionSLADeadline
      ? addMinutes(ticket.resolutionSLADeadline, pauseDuration)
      : null;

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        responseSLADeadline: newResponseDeadline,
        resolutionSLADeadline: newResolutionDeadline,
        slaPausedAt: null,
        slaPausedReason: null,
      },
    });

    this.logger.log(
      `SLA resumed for ticket ${ticketId}, extended by ${pauseDuration} minutes`,
    );
  }

  /**
   * Get holidays with caching
   */
  private async getHolidays(): Promise<Holiday[]> {
    // Refresh cache if expired (24 hours)
    if (new Date() > this.holidayCacheExpiry) {
      this.holidayCache = await this.prisma.holiday.findMany({
        orderBy: { date: 'asc' },
      });

      // Set cache expiry to 24 hours from now
      this.holidayCacheExpiry = addHours(new Date(), 24);

      this.logger.debug(`Holiday cache refreshed: ${this.holidayCache.length} holidays loaded`);
    }

    return this.holidayCache;
  }
}
```

### Step 3: Create SLA Module

Create `packages/api/src/sla/sla.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SlaCalculatorService } from './sla-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SlaCalculatorService],
  exports: [SlaCalculatorService],
})
export class SlaModule {}
```

### Step 4: Register SLA Module in App Module

Modify `packages/api/src/app/app.module.ts`:

Add import:

```typescript
import { SlaModule } from '../sla/sla.module';
```

Add to imports array:

```typescript
@Module({
  imports: [
    // ... existing imports ...
    SlaModule,
  ],
  // ... rest of module
})
```

### Step 5: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 6: Commit SLA Calculator Service

```bash
git add packages/api/src/sla/
git add packages/api/src/app/app.module.ts
git commit -m "feat(api): create SLA calculator service

- Add SLA constants (targets, business hours, thresholds)
- Implement business hours calculation (Mon-Fri 10 AM - 10 PM EST)
- Handle holiday exclusions with recurring holiday support
- Calculate SLA deadlines by adding business hours
- Calculate SLA status (on_track/approaching/critical/breached)
- Implement pause/resume SLA logic
- Holiday caching for performance (24-hour cache)

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 5: Create Holiday Service

**Files:**
- Create: `packages/api/src/holiday/holiday.service.ts`
- Create: `packages/api/src/holiday/holiday.module.ts`
- Create: `packages/api/src/holiday/dto/create-holiday.dto.ts`
- Create: `packages/api/src/holiday/dto/update-holiday.dto.ts`

### Step 1: Create Holiday DTOs

Create `packages/api/src/holiday/dto/create-holiday.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsDate, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHolidayDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Holiday name must be at least 3 characters' })
  @MaxLength(100, { message: 'Holiday name must not exceed 100 characters' })
  name: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
```

Create `packages/api/src/holiday/dto/update-holiday.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateHolidayDto } from './create-holiday.dto';

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}
```

### Step 2: Create Holiday Service

Create `packages/api/src/holiday/holiday.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new holiday
   */
  async create(dto: CreateHolidayDto, userId: string) {
    const holiday = await this.prisma.holiday.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Holiday created: ${holiday.name} on ${holiday.date}`);

    return holiday;
  }

  /**
   * Get all holidays
   */
  async findAll() {
    return this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get a single holiday
   */
  async findOne(id: string) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return holiday;
  }

  /**
   * Update a holiday
   */
  async update(id: string, dto: UpdateHolidayDto) {
    const holiday = await this.findOne(id); // Verifies it exists

    const updated = await this.prisma.holiday.update({
      where: { id },
      data: dto,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Holiday updated: ${updated.name}`);

    return updated;
  }

  /**
   * Delete a holiday
   */
  async remove(id: string) {
    const holiday = await this.findOne(id); // Verifies it exists

    await this.prisma.holiday.delete({
      where: { id },
    });

    this.logger.log(`Holiday deleted: ${holiday.name}`);

    return { message: 'Holiday deleted successfully' };
  }
}
```

### Step 3: Create Holiday Module

Create `packages/api/src/holiday/holiday.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
```

### Step 4: Register Holiday Module

Modify `packages/api/src/app/app.module.ts`:

Add import:

```typescript
import { HolidayModule } from '../holiday/holiday.module';
```

Add to imports array:

```typescript
imports: [
  // ... existing imports ...
  HolidayModule,
],
```

### Step 5: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 6: Commit Holiday Service

```bash
git add packages/api/src/holiday/
git add packages/api/src/app/app.module.ts
git commit -m "feat(api): create holiday service for SLA management

- Add CreateHolidayDto and UpdateHolidayDto with validation
- Implement CRUD operations for holidays
- Include creator information in responses
- Add comprehensive logging

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 6: Create Holiday Management API

**Files:**
- Create: `packages/api/src/holiday/holiday.controller.ts`
- Modify: `packages/api/src/holiday/holiday.module.ts`

### Step 1: Create Holiday Controller

Create `packages/api/src/holiday/holiday.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Controller('admin/holidays')
@UseGuards(JwtAuthGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  /**
   * Get all holidays
   * Accessible by all authenticated users (for viewing)
   */
  @Get()
  async findAll() {
    return this.holidayService.findAll();
  }

  /**
   * Get a single holiday
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.holidayService.findOne(id);
  }

  /**
   * Create a new holiday (platform admin only)
   */
  @Post()
  async create(@Body() dto: CreateHolidayDto, @Request() req) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.create(dto, req.user.id);
  }

  /**
   * Update a holiday (platform admin only)
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
    @Request() req,
  ) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.update(id, dto);
  }

  /**
   * Delete a holiday (platform admin only)
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.remove(id);
  }

  /**
   * Helper to ensure user is platform admin
   */
  private ensurePlatformAdmin(user: any) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can manage holidays',
      );
    }
  }
}
```

### Step 2: Register Controller in Holiday Module

Modify `packages/api/src/holiday/holiday.module.ts`:

Add controller import:

```typescript
import { HolidayController } from './holiday.controller';
```

Add controllers array:

```typescript
@Module({
  imports: [PrismaModule],
  providers: [HolidayService],
  controllers: [HolidayController], // Add this
  exports: [HolidayService],
})
export class HolidayModule {}
```

### Step 3: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 4: Test Endpoints (Manual)

Start API server and test with curl or Postman:

```bash
# Get all holidays
GET /admin/holidays

# Get single holiday
GET /admin/holidays/:id

# Create holiday (platform admin only)
POST /admin/holidays
Body: {
  "name": "Test Holiday",
  "date": "2025-12-31",
  "isRecurring": false
}

# Update holiday (platform admin only)
PUT /admin/holidays/:id
Body: {
  "name": "Updated Holiday Name"
}

# Delete holiday (platform admin only)
DELETE /admin/holidays/:id
```

### Step 5: Commit Holiday API

```bash
git add packages/api/src/holiday/
git commit -m "feat(api): add holiday management API endpoints

- GET /admin/holidays - List all holidays (all users)
- GET /admin/holidays/:id - Get single holiday
- POST /admin/holidays - Create holiday (platform admin only)
- PUT /admin/holidays/:id - Update holiday (platform admin only)
- DELETE /admin/holidays/:id - Delete holiday (platform admin only)
- Add authentication and authorization guards

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 7: Integrate SLA into Ticket Creation

**Files:**
- Modify: `packages/api/src/support/support.service.ts`
- Modify: `packages/api/src/support/support.module.ts`

### Step 1: Import SLA Module in Support Module

Modify `packages/api/src/support/support.module.ts`:

Add import:

```typescript
import { SlaModule } from '../sla/sla.module';
```

Add to imports array:

```typescript
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EmailModule,
    SubscriptionModule,
    AiModule,
    SlaModule, // Add this
  ],
  // ... rest of module
})
```

### Step 2: Inject SLA Calculator in Support Service

Modify `packages/api/src/support/support.service.ts`:

Add import:

```typescript
import { SlaCalculatorService } from '../sla/sla-calculator.service';
```

Inject in constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private authService: AuthService,
  private emailService: EmailService,
  private subscriptionService: SubscriptionService,
  private aiService: AiService,
  private slaCalculator: SlaCalculatorService, // Add this
  private logger: Logger,
) {}
```

### Step 3: Calculate SLA Deadlines on Ticket Creation

In the `createTicket` method, after AI priority detection, add SLA calculation:

Find the ticket creation code (around line 90-150):

```typescript
async createTicket(dto: CreateTicketDto, userId: string): Promise<any> {
  // ... existing code for user lookup, AI priority detection ...

  // Calculate SLA deadlines based on priority
  const responseHours = this.slaCalculator.getSLAHours(priority, 'response');
  const resolutionHours = this.slaCalculator.getSLAHours(priority, 'resolution');

  const responseSLADeadline = await this.slaCalculator.calculateDeadline(
    new Date(),
    responseHours,
  );

  const resolutionSLADeadline = await this.slaCalculator.calculateDeadline(
    new Date(),
    resolutionHours,
  );

  // Create ticket with SLA deadlines
  const ticket = await this.prisma.supportTicket.create({
    data: {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority,
      aiDetectedPriority,
      status: 'open',
      createdById: userId,
      organizationId: user.organizationMemberships[0]?.organizationId || null,
      tags: dto.tags || [],
      workPriorityScore: this.calculateWorkPriorityScore(priority, 0, orgSize),

      // SLA fields
      responseSLADeadline,
      resolutionSLADeadline,
      responseSLAStatus: 'on_track',
      resolutionSLAStatus: resolutionSLADeadline ? 'on_track' : null,
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

  this.logger.log(
    `Ticket created with SLA: ${ticket.id} - Response due: ${responseSLADeadline}, Resolution due: ${resolutionSLADeadline}`,
  );

  return ticket;
}
```

### Step 4: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 5: Test Ticket Creation

Start API and create a test ticket. Verify:
- `responseSLADeadline` is set
- `resolutionSLADeadline` is set (or null for feature priority)
- `responseSLAStatus` is 'on_track'
- `resolutionSLAStatus` is 'on_track' (or null for feature)

### Step 6: Commit SLA Integration in Ticket Creation

```bash
git add packages/api/src/support/
git commit -m "feat(api): integrate SLA calculation into ticket creation

- Calculate response and resolution SLA deadlines on ticket creation
- Set initial SLA status to 'on_track'
- Handle feature priority with null resolution deadline
- Log SLA deadlines for monitoring

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 8: Integrate SLA Pause/Resume

**Files:**
- Modify: `packages/api/src/support/support.service.ts`

### Step 1: Add SLA Pause/Resume Logic to Status Changes

In `support.service.ts`, find the `updateTicketStatus` or similar method that changes ticket status.

Add this logic after loading the ticket and before updating:

```typescript
async updateTicketStatus(
  ticketId: string,
  newStatus: string,
  userId: string,
): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Auto-pause SLA when changing to waiting_on_user
  if (
    newStatus === 'waiting_on_user' &&
    ticket.status !== 'waiting_on_user' &&
    !ticket.slaPausedAt
  ) {
    await this.slaCalculator.pauseSLA(ticketId, 'waiting_on_user');
    this.logger.log(`SLA paused for ticket ${ticketId} - waiting on user`);
  }

  // Auto-resume SLA when changing from waiting_on_user
  if (
    ticket.status === 'waiting_on_user' &&
    newStatus !== 'waiting_on_user' &&
    ticket.slaPausedAt
  ) {
    await this.slaCalculator.resumeSLA(ticketId);
    this.logger.log(`SLA resumed for ticket ${ticketId}`);
  }

  // Update status
  const updated = await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: newStatus },
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
    },
  });

  return updated;
}
```

### Step 2: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 3: Test SLA Pause/Resume

Start API and test:
1. Create a ticket → SLA starts
2. Change status to `waiting_on_user` → Verify `slaPausedAt` is set
3. Change status back to `in_progress` → Verify `slaPausedAt` is cleared and deadlines are extended

### Step 4: Commit SLA Pause/Resume Integration

```bash
git add packages/api/src/support/support.service.ts
git commit -m "feat(api): integrate SLA pause/resume on status changes

- Auto-pause SLA when ticket status changes to waiting_on_user
- Auto-resume SLA when ticket status changes from waiting_on_user
- Extend deadlines by pause duration on resume
- Add comprehensive logging for pause/resume events

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 9: Integrate SLA Metrics on Resolution

**Files:**
- Modify: `packages/api/src/support/support.service.ts`

### Step 1: Calculate Response Time on First Admin Message

In the `createMessage` or `addMessage` method, add logic to detect first admin response:

```typescript
async createMessage(
  ticketId: string,
  content: string,
  authorId: string,
  isInternal: boolean = false,
): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        select: { authorRole: true },
      },
    },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Get user to determine role
  const user = await this.prisma.user.findUnique({
    where: { id: authorId },
  });

  const authorRole = user.isPlatformAdmin
    ? 'platform_admin'
    : 'user'; // Simplified role detection

  // Check if this is the first admin response
  const isFirstAdminResponse = !ticket.messages.some((m) =>
    m.authorRole.includes('admin'),
  );

  // Create message
  const message = await this.prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId,
      authorRole,
      content,
      isInternal,
    },
  });

  // If first admin response, record response time and SLA met status
  if (isFirstAdminResponse && authorRole.includes('admin')) {
    const responseTime = this.slaCalculator.calculateBusinessMinutes(
      ticket.createdAt,
      new Date(),
    );

    const responseHours = this.slaCalculator.getSLAHours(
      ticket.priority as any,
      'response',
    );
    const responseSLAMinutes = responseHours * 60;

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        actualResponseTime: responseTime,
        responseSLAMet: responseTime <= responseSLAMinutes,
      },
    });

    this.logger.log(
      `First admin response for ticket ${ticketId}: ${responseTime} minutes (SLA: ${responseSLAMinutes} minutes, Met: ${responseTime <= responseSLAMinutes})`,
    );
  }

  return message;
}
```

### Step 2: Calculate Resolution Time on Ticket Resolution

In the `resolveTicket` method, add resolution time calculation:

```typescript
async resolveTicket(
  ticketId: string,
  adminId: string,
  dto: ResolveTicketDto,
): Promise<any> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Calculate pause duration
  const pausedMinutes = ticket.slaPausedAt
    ? this.slaCalculator.calculateBusinessMinutes(
        ticket.slaPausedAt,
        new Date(),
      )
    : 0;

  // Calculate total resolution time
  const totalResolutionTime = this.slaCalculator.calculateBusinessMinutes(
    ticket.createdAt,
    new Date(),
  );

  // Subtract paused time to get actual resolution time
  const actualResolutionTime = totalResolutionTime - pausedMinutes;

  // Check if resolution SLA was met
  const resolutionHours = this.slaCalculator.getSLAHours(
    ticket.priority as any,
    'resolution',
  );
  const resolutionSLAMinutes = resolutionHours ? resolutionHours * 60 : null;

  const resolutionSLAMet = resolutionSLAMinutes
    ? actualResolutionTime <= resolutionSLAMinutes
    : null;

  // Auto-resume if paused
  if (ticket.slaPausedAt) {
    await this.slaCalculator.resumeSLA(ticketId);
  }

  // Update ticket
  const updated = await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedById: adminId,
      resolution: dto.resolution,
      actualResolutionTime,
      resolutionSLAMet,
    },
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      resolvedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  this.logger.log(
    `Ticket ${ticketId} resolved: ${actualResolutionTime} minutes (SLA: ${resolutionSLAMinutes} minutes, Met: ${resolutionSLAMet})`,
  );

  return updated;
}
```

### Step 3: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 4: Test SLA Metrics Recording

Start API and test:
1. Create ticket → SLA deadlines set
2. Admin sends first message → Verify `actualResponseTime` and `responseSLAMet` recorded
3. Resolve ticket → Verify `actualResolutionTime` and `resolutionSLAMet` recorded

### Step 5: Commit SLA Metrics Integration

```bash
git add packages/api/src/support/support.service.ts
git commit -m "feat(api): record SLA metrics on response and resolution

- Calculate and record response time on first admin message
- Calculate response SLA met status
- Calculate and record resolution time on ticket resolution
- Exclude paused time from resolution calculations
- Calculate resolution SLA met status
- Add comprehensive logging for metrics

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 10: Create SLA Scheduler

**Files:**
- Create: `packages/api/src/sla/sla.scheduler.ts`
- Modify: `packages/api/src/sla/sla.module.ts`
- Modify: `packages/api/src/app/app.module.ts`

### Step 1: Create SLA Scheduler Service

Create `packages/api/src/sla/sla.scheduler.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SlaCalculatorService } from './sla-calculator.service';

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private prisma: PrismaService,
    private slaCalculator: SlaCalculatorService,
  ) {}

  /**
   * Update SLA statuses for all active tickets
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'slaStatusUpdater',
    timeZone: 'America/New_York',
  })
  async updateSLAStatuses() {
    this.logger.log('Starting SLA status update job...');

    try {
      // Fetch all active tickets
      const activeTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: { in: ['open', 'in_progress', 'waiting_on_user'] },
        },
        select: {
          id: true,
          createdAt: true,
          responseSLADeadline: true,
          resolutionSLADeadline: true,
          responseSLAStatus: true,
          resolutionSLAStatus: true,
          slaPausedAt: true,
        },
      });

      let updatedCount = 0;
      let notificationCount = 0;

      for (const ticket of activeTickets) {
        try {
          // Calculate pause duration if paused
          const pausedMinutes = ticket.slaPausedAt
            ? this.slaCalculator.calculateBusinessMinutes(
                ticket.slaPausedAt,
                new Date(),
              )
            : 0;

          // Calculate current response SLA status
          const newResponseStatus = this.slaCalculator.calculateSLAStatus(
            ticket.createdAt,
            ticket.responseSLADeadline,
            pausedMinutes,
          );

          // Calculate current resolution SLA status
          const newResolutionStatus = this.slaCalculator.calculateSLAStatus(
            ticket.createdAt,
            ticket.resolutionSLADeadline,
            pausedMinutes,
          );

          // Check if status changed
          const responseChanged =
            newResponseStatus !== ticket.responseSLAStatus;
          const resolutionChanged =
            newResolutionStatus !== ticket.resolutionSLAStatus;

          if (responseChanged || resolutionChanged) {
            // Update database
            await this.prisma.supportTicket.update({
              where: { id: ticket.id },
              data: {
                responseSLAStatus: newResponseStatus,
                resolutionSLAStatus: newResolutionStatus,
              },
            });

            updatedCount++;

            // Send notification if entering critical or breached state
            if (
              this.shouldNotify(
                ticket.responseSLAStatus,
                newResponseStatus,
              ) ||
              this.shouldNotify(
                ticket.resolutionSLAStatus,
                newResolutionStatus,
              )
            ) {
              await this.sendSLANotification(
                ticket,
                newResponseStatus,
                newResolutionStatus,
              );
              notificationCount++;
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to update SLA for ticket ${ticket.id}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `SLA status update complete: ${updatedCount} tickets updated, ${notificationCount} notifications sent`,
      );
    } catch (error) {
      this.logger.error('SLA status update job failed', error.stack);
    }
  }

  /**
   * Determine if a notification should be sent
   */
  private shouldNotify(oldStatus: string, newStatus: string): boolean {
    // Notify when entering critical or breached state
    return (
      (newStatus === 'critical' || newStatus === 'breached') &&
      oldStatus !== newStatus
    );
  }

  /**
   * Send SLA notification to assigned admin or all platform admins
   */
  private async sendSLANotification(
    ticket: any,
    responseSLAStatus: string,
    resolutionSLAStatus: string,
  ) {
    const ticketDetails = await this.prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        responseSLADeadline: true,
        resolutionSLADeadline: true,
      },
    });

    // Determine which SLA is most urgent
    const mostUrgentSLA =
      responseSLAStatus === 'breached' ||
      (responseSLAStatus === 'critical' &&
        resolutionSLAStatus !== 'breached')
        ? 'response'
        : 'resolution';

    const deadline =
      mostUrgentSLA === 'response'
        ? ticketDetails.responseSLADeadline
        : ticketDetails.resolutionSLADeadline;

    const statusLabel =
      responseSLAStatus === 'breached' || resolutionSLAStatus === 'breached'
        ? 'Breached'
        : 'Critical';

    // Calculate time remaining
    const minutesRemaining = this.slaCalculator.calculateBusinessMinutes(
      new Date(),
      deadline,
    );

    const timeText =
      minutesRemaining > 0
        ? `due in ${this.formatMinutes(minutesRemaining)}`
        : `overdue by ${this.formatMinutes(Math.abs(minutesRemaining))}`;

    // Determine recipient (assigned admin or all platform admins)
    let recipientIds: string[] = [];
    if (ticketDetails.assignedToId) {
      recipientIds = [ticketDetails.assignedToId];
    } else {
      const platformAdmins = await this.prisma.user.findMany({
        where: { isPlatformAdmin: true },
        select: { id: true },
      });
      recipientIds = platformAdmins.map((admin) => admin.id);
    }

    // Create notifications
    for (const recipientId of recipientIds) {
      await this.prisma.notification.create({
        data: {
          recipientId,
          senderId: null,
          category: 'sla_warning',
          title: `SLA ${statusLabel}`,
          message: `Ticket #${ticketDetails.id.substring(0, 8)}: "${ticketDetails.title}" - ${mostUrgentSLA === 'response' ? 'Response' : 'Resolution'} SLA ${timeText}`,
          linkTo: `/support/tickets/${ticketDetails.id}`,
        },
      });
    }

    this.logger.log(
      `SLA notification sent for ticket ${ticket.id} to ${recipientIds.length} recipient(s)`,
    );
  }

  /**
   * Format minutes into human-readable time
   */
  private formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  }
}
```

### Step 2: Register Scheduler in SLA Module

Modify `packages/api/src/sla/sla.module.ts`:

Add import:

```typescript
import { SlaScheduler } from './sla.scheduler';
```

Add to providers:

```typescript
@Module({
  imports: [PrismaModule],
  providers: [SlaCalculatorService, SlaScheduler], // Add SlaScheduler
  exports: [SlaCalculatorService],
})
export class SlaModule {}
```

### Step 3: Import ScheduleModule in App Module

Modify `packages/api/src/app/app.module.ts`:

Add import:

```typescript
import { ScheduleModule } from '@nestjs/schedule';
```

Add to imports array (at the beginning):

```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(), // Add this first
    // ... rest of imports
  ],
  // ... rest of module
})
```

### Step 4: Verify TypeScript Compilation

Run from `packages/api`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 5: Test Scheduler

Start API server and verify in logs:
- "SLA status update job..." appears every 15 minutes
- Check that scheduler is registered: Look for "Mapped {/*, GET}" or scheduler-related logs

Create a test ticket with urgent priority and wait 15 minutes to see status updates.

### Step 6: Commit SLA Scheduler

```bash
git add packages/api/src/sla/
git add packages/api/src/app/app.module.ts
git commit -m "feat(api): create SLA status updater scheduled job

- Add scheduled job running every 15 minutes
- Calculate current SLA status for all active tickets
- Update database when status changes
- Send in-app notifications for critical/breached SLAs
- Log update summary for monitoring
- Format time remaining in human-readable format

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 11: Frontend - SLA Badge Component

**Files:**
- Create: `packages/web/src/components/support/SLABadge.tsx`
- Create: `packages/web/src/components/support/SLATooltip.tsx`

### Step 1: Create SLA Badge Component

Create `packages/web/src/components/support/SLABadge.tsx`:

```typescript
'use client';

import React from 'react';

export type SLAStatus = 'on_track' | 'approaching' | 'critical' | 'breached' | 'paused';

interface SLABadgeProps {
  status: SLAStatus;
  type?: 'response' | 'resolution';
  className?: string;
}

export function SLABadge({ status, type, className = '' }: SLABadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approaching':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'breached':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusDot = () => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500';
      case 'approaching':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-orange-500';
      case 'breached':
        return 'bg-red-500';
      case 'paused':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()} ${className}`}
      title={`${type ? type.charAt(0).toUpperCase() + type.slice(1) + ' ' : ''}SLA: ${status.replace('_', ' ')}`}
    >
      <span className={`w-2 h-2 rounded-full ${getStatusDot()}`}></span>
      {status === 'paused' ? 'Paused' : type === 'response' ? 'Response' : 'Resolution'}
    </span>
  );
}
```

### Step 2: Create SLA Tooltip Component

Create `packages/web/src/components/support/SLATooltip.tsx`:

```typescript
'use client';

import React from 'react';

interface SLATooltipProps {
  responseSLAStatus: string;
  resolutionSLAStatus: string;
  responseSLADeadline: string | null;
  resolutionSLADeadline: string | null;
  slaPausedAt: string | null;
  className?: string;
}

export function SLATooltip({
  responseSLAStatus,
  resolutionSLAStatus,
  responseSLADeadline,
  resolutionSLADeadline,
  slaPausedAt,
  className = '',
}: SLATooltipProps) {
  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs < 0) {
      // Overdue
      const overdueMins = Math.abs(Math.floor(diffMs / 1000 / 60));
      return `Overdue by ${formatMinutes(overdueMins)}`;
    } else {
      // Time remaining
      const remainingMins = Math.floor(diffMs / 1000 / 60);
      return `${formatMinutes(remainingMins)} remaining`;
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'approaching':
        return 'Approaching';
      case 'critical':
        return 'Critical';
      case 'breached':
        return 'Breached';
      default:
        return status;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-3 ${className}`}>
      {slaPausedAt && (
        <div className="mb-2 pb-2 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">SLA Paused</span> - Waiting on User
          </p>
          <p className="text-xs text-gray-500">
            Since {new Date(slaPausedAt).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {responseSLADeadline && (
          <div>
            <p className="text-xs font-semibold text-gray-700">Response SLA</p>
            <p className="text-xs text-gray-600">
              {getStatusLabel(responseSLAStatus)}:{' '}
              {formatTimeRemaining(responseSLADeadline)}
            </p>
          </div>
        )}

        {resolutionSLADeadline && (
          <div>
            <p className="text-xs font-semibold text-gray-700">Resolution SLA</p>
            <p className="text-xs text-gray-600">
              {getStatusLabel(resolutionSLAStatus)}:{' '}
              {formatTimeRemaining(resolutionSLADeadline)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Verify TypeScript Compilation

Run from `packages/web`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 4: Test Components

Create a test page or add to existing ticket list to verify:
- Badge displays correct colors
- Tooltip shows on hover
- Time remaining calculated correctly

### Step 5: Commit SLA Badge Components

```bash
git add packages/web/src/components/support/SLABadge.tsx
git add packages/web/src/components/support/SLATooltip.tsx
git commit -m "feat(web): create SLA badge and tooltip components

- Add SLABadge component with color-coded status indicators
- Add SLATooltip component with countdown timers
- Support all SLA statuses (on_track, approaching, critical, breached, paused)
- Format time remaining in human-readable format
- Show pause status when applicable

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 12: Frontend - Ticket List SLA Integration

**Files:**
- Modify: `packages/web/src/app/admin/support/page.tsx`

### Step 1: Import SLA Components

In `packages/web/src/app/admin/support/page.tsx`, add imports:

```typescript
import { SLABadge } from '@/components/support/SLABadge';
import { SLATooltip } from '@/components/support/SLATooltip';
```

### Step 2: Add SLA State Management

Add state for SLA tooltip visibility:

```typescript
const [hoveredTicketSLA, setHoveredTicketSLA] = useState<string | null>(null);
```

### Step 3: Add SLA Filter to Filters

Add SLA status filter to existing filters:

```typescript
const [slaFilter, setSlaFilter] = useState<string>('all');

// In JSX, add filter dropdown
<select
  value={slaFilter}
  onChange={(e) => setSlaFilter(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded"
>
  <option value="all">All SLA Status</option>
  <option value="on_track">On Track</option>
  <option value="approaching">Approaching</option>
  <option value="critical">Critical</option>
  <option value="breached">Breached</option>
  <option value="paused">Paused</option>
</select>
```

### Step 4: Filter Tickets by SLA Status

Modify the ticket filtering logic:

```typescript
const filteredTickets = tickets.filter((ticket) => {
  // ... existing filters ...

  // SLA filter
  if (slaFilter !== 'all') {
    const mostUrgentStatus =
      ticket.responseSLAStatus === 'breached' ||
      (ticket.responseSLAStatus === 'critical' &&
        ticket.resolutionSLAStatus !== 'breached')
        ? ticket.responseSLAStatus
        : ticket.resolutionSLAStatus;

    if (ticket.slaPausedAt) {
      if (slaFilter !== 'paused') return false;
    } else if (mostUrgentStatus !== slaFilter) {
      return false;
    }
  }

  return true;
});
```

### Step 5: Add SLA Badge to Ticket List

In the ticket row rendering, add SLA badge next to ticket title:

```typescript
<div className="flex items-center gap-2">
  <Link href={`/admin/support/tickets/${ticket.id}`}>
    {ticket.title}
  </Link>

  {/* SLA Badge */}
  <div
    className="relative"
    onMouseEnter={() => setHoveredTicketSLA(ticket.id)}
    onMouseLeave={() => setHoveredTicketSLA(null)}
  >
    <SLABadge
      status={
        ticket.slaPausedAt
          ? 'paused'
          : ticket.responseSLAStatus === 'breached' ||
            (ticket.responseSLAStatus === 'critical' &&
              ticket.resolutionSLAStatus !== 'breached')
          ? ticket.responseSLAStatus
          : ticket.resolutionSLAStatus
      }
      type={
        ticket.responseSLAStatus === 'breached' ||
        (ticket.responseSLAStatus === 'critical' &&
          ticket.resolutionSLAStatus !== 'breached')
          ? 'response'
          : 'resolution'
      }
    />

    {/* Tooltip */}
    {hoveredTicketSLA === ticket.id && (
      <div className="absolute z-10 left-0 top-full mt-1">
        <SLATooltip
          responseSLAStatus={ticket.responseSLAStatus}
          resolutionSLAStatus={ticket.resolutionSLAStatus}
          responseSLADeadline={ticket.responseSLADeadline}
          resolutionSLADeadline={ticket.resolutionSLADeadline}
          slaPausedAt={ticket.slaPausedAt}
        />
      </div>
    )}
  </div>
</div>
```

### Step 6: Add SLA Sort Option

Add SLA urgency to sort options:

```typescript
const [sortBy, setSortBy] = useState<string>('created');

// Add to sort dropdown
<option value="sla_urgency">SLA Urgency</option>

// In sorting logic
const sortedTickets = [...filteredTickets].sort((a, b) => {
  // ... existing sort cases ...

  if (sortBy === 'sla_urgency') {
    const getUrgencyScore = (ticket) => {
      if (ticket.slaPausedAt) return 5; // Paused is least urgent
      const status =
        ticket.responseSLAStatus === 'breached' ||
        (ticket.responseSLAStatus === 'critical' &&
          ticket.resolutionSLAStatus !== 'breached')
          ? ticket.responseSLAStatus
          : ticket.resolutionSLAStatus;

      switch (status) {
        case 'breached':
          return 1;
        case 'critical':
          return 2;
        case 'approaching':
          return 3;
        case 'on_track':
          return 4;
        default:
          return 5;
      }
    };

    return getUrgencyScore(a) - getUrgencyScore(b);
  }

  // ... rest of sorting
});
```

### Step 7: Verify TypeScript Compilation

Run from `packages/web`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 8: Test SLA Integration

Start web app and verify:
- SLA badges appear on ticket list
- Hover shows tooltip with countdown timers
- Filter by SLA status works
- Sort by SLA urgency works

### Step 9: Commit Ticket List SLA Integration

```bash
git add packages/web/src/app/admin/support/page.tsx
git commit -m "feat(web): integrate SLA indicators into ticket list

- Add SLA badge display showing most urgent SLA status
- Add hover tooltip with detailed SLA countdown
- Add SLA status filter (all, on_track, approaching, critical, breached, paused)
- Add SLA urgency sort option
- Display pause status when ticket waiting on user

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 13: Frontend - Holiday Management UI

**Files:**
- Create: `packages/web/src/app/admin/holidays/page.tsx`
- Create: `packages/web/src/components/admin/HolidayForm.tsx`

### Step 1: Create Holiday Management Page

Create `packages/web/src/app/admin/holidays/page.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { HolidayForm } from '@/components/admin/HolidayForm';

interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function HolidayManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/admin/holidays');
      return;
    }

    if (!user?.isPlatformAdmin) {
      router.push('/admin');
      return;
    }

    loadHolidays();
  }, [isAuthenticated, user, router]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/admin/holidays');
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: { name: string; date: string; isRecurring: boolean }) => {
    try {
      const response = await apiPost('/admin/holidays', data);
      if (response.ok) {
        setShowAddForm(false);
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to add holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    }
  };

  const handleEdit = async (data: { name: string; date: string; isRecurring: boolean }) => {
    if (!editingHoliday) return;

    try {
      const response = await apiPut(`/admin/holidays/${editingHoliday.id}`, data);
      if (response.ok) {
        setEditingHoliday(null);
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to update holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      alert('Failed to update holiday');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await apiDelete(`/admin/holidays/${id}`);
      if (response.ok) {
        await loadHolidays();
      } else {
        const error = await response.json();
        alert(`Failed to delete holiday: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-gray-600">Loading holidays...</p>
      </div>
    );
  }

  const isPastHoliday = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Holiday Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Holiday
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Holidays are excluded from SLA business hours calculations (Mon-Fri 10 AM - 10 PM EST).
      </p>

      {/* Add Holiday Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Add New Holiday</h2>
          <HolidayForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Edit Holiday Form */}
      {editingHoliday && (
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Edit Holiday</h2>
          <HolidayForm
            initialData={{
              name: editingHoliday.name,
              date: editingHoliday.date.split('T')[0],
              isRecurring: editingHoliday.isRecurring,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingHoliday(null)}
          />
        </div>
      )}

      {/* Holiday List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recurring
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created By
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No holidays configured. Add your first holiday to exclude it from SLA calculations.
                </td>
              </tr>
            ) : (
              holidays.map((holiday) => (
                <tr
                  key={holiday.id}
                  className={isPastHoliday(holiday.date) ? 'bg-gray-50 text-gray-500' : ''}
                >
                  <td className="px-4 py-3 text-sm">
                    {new Date(holiday.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{holiday.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {holiday.isRecurring ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {holiday.createdBy.firstName} {holiday.createdBy.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => setEditingHoliday(holiday)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.id, holiday.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Step 2: Create Holiday Form Component

Create `packages/web/src/components/admin/HolidayForm.tsx`:

```typescript
'use client';

import React, { useState } from 'react';

interface HolidayFormProps {
  initialData?: {
    name: string;
    date: string;
    isRecurring: boolean;
  };
  onSubmit: (data: { name: string; date: string; isRecurring: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function HolidayForm({ initialData, onSubmit, onCancel }: HolidayFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (name.length < 3) {
      setError('Holiday name must be at least 3 characters');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name, date, isRecurring });
      // Success - form will be closed by parent
    } catch (err) {
      setError('Failed to save holiday');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Holiday Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., New Year's Day, Christmas"
          required
          minLength={3}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isRecurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
        <label htmlFor="isRecurring" className="text-sm text-gray-700">
          Recurring (applies to future years)
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Recurring holidays will automatically apply to the same date every year.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : initialData ? 'Update Holiday' : 'Add Holiday'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

### Step 3: Add Navigation Link to Holiday Management

Modify `packages/web/src/app/admin/layout.tsx` or admin navigation:

Add link to holiday management:

```typescript
<Link href="/admin/holidays">
  Holiday Management
</Link>
```

### Step 4: Verify TypeScript Compilation

Run from `packages/web`:

```bash
npx tsc --noEmit
```

Expected: No errors

### Step 5: Build Web Package

Run from root:

```bash
npx nx build web
```

Expected: Build succeeds

### Step 6: Test Holiday Management

Start web app and verify:
- Navigate to /admin/holidays (platform admin only)
- View list of holidays
- Add new holiday
- Edit existing holiday
- Delete holiday
- Verify past holidays shown in muted color

### Step 7: Commit Holiday Management UI

```bash
git add packages/web/src/app/admin/holidays/
git add packages/web/src/components/admin/HolidayForm.tsx
git commit -m "feat(web): add holiday management UI

- Create holiday management page (platform admin only)
- Add HolidayForm component with validation
- Support add, edit, delete holiday operations
- Display recurring status with badge
- Show past holidays in muted color
- Add form validation (3-100 char name, required date)
- Add navigation link to admin section

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 14: Admin Dashboard SLA Stats

**Files:**
- Modify: `packages/api/src/admin/admin-status.controller.ts`
- Modify: `packages/web/src/app/admin/page.tsx`

### Step 1: Add SLA Stats to Admin Status Endpoint

Modify `packages/api/src/admin/admin-status.controller.ts`:

In the `getStatus` method, add SLA health statistics:

```typescript
async getStatus(@Request() req) {
  // ... existing stats code ...

  // SLA Health Statistics
  const slaHealth = {
    // Count breached SLAs
    breachedResponse: await this.prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        responseSLAStatus: 'breached',
      },
    }),
    breachedResolution: await this.prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        resolutionSLAStatus: 'breached',
      },
    }),

    // Count critical SLAs
    criticalResponse: await this.prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        responseSLAStatus: 'critical',
      },
    }),
    criticalResolution: await this.prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        resolutionSLAStatus: 'critical',
      },
    }),

    // SLA compliance rate (last 30 days)
    complianceRate: await this.calculateComplianceRate(),
  };

  return {
    // ... existing stats ...
    slaHealth,
  };
}

// Add helper method
private async calculateComplianceRate() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const resolvedTickets = await this.prisma.supportTicket.findMany({
    where: {
      resolvedAt: { gte: thirtyDaysAgo },
      actualResponseTime: { not: null },
    },
    select: {
      responseSLAMet: true,
      resolutionSLAMet: true,
    },
  });

  if (resolvedTickets.length === 0) {
    return {
      overall: 100,
      response: 100,
      resolution: 100,
    };
  }

  const responseMet = resolvedTickets.filter((t) => t.responseSLAMet === true).length;
  const resolutionMet = resolvedTickets.filter((t) => t.resolutionSLAMet === true).length;
  const totalResponseSLAs = resolvedTickets.filter((t) => t.responseSLAMet !== null).length;
  const totalResolutionSLAs = resolvedTickets.filter((t) => t.resolutionSLAMet !== null).length;

  const responseRate = totalResponseSLAs > 0 ? (responseMet / totalResponseSLAs) * 100 : 100;
  const resolutionRate = totalResolutionSLAs > 0 ? (resolutionMet / totalResolutionSLAs) * 100 : 100;
  const overallRate = ((responseMet + resolutionMet) / (totalResponseSLAs + totalResolutionSLAs)) * 100;

  return {
    overall: Math.round(overallRate),
    response: Math.round(responseRate),
    resolution: Math.round(resolutionRate),
  };
}
```

### Step 2: Display SLA Stats on Admin Dashboard

Modify `packages/web/src/app/admin/page.tsx`:

Add SLA health section to the dashboard:

```typescript
{/* SLA Health Section */}
{stats.slaHealth && (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">SLA Health</h2>

    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Breached SLAs */}
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-600 font-semibold">Breached</p>
        <p className="text-2xl font-bold text-red-800">
          {stats.slaHealth.breachedResponse + stats.slaHealth.breachedResolution}
        </p>
        <p className="text-xs text-red-600">
          {stats.slaHealth.breachedResponse} response, {stats.slaHealth.breachedResolution} resolution
        </p>
      </div>

      {/* Critical SLAs */}
      <div className="p-4 bg-orange-50 border border-orange-200 rounded">
        <p className="text-sm text-orange-600 font-semibold">Critical</p>
        <p className="text-2xl font-bold text-orange-800">
          {stats.slaHealth.criticalResponse + stats.slaHealth.criticalResolution}
        </p>
        <p className="text-xs text-orange-600">
          {stats.slaHealth.criticalResponse} response, {stats.slaHealth.criticalResolution} resolution
        </p>
      </div>
    </div>

    {/* Compliance Rates */}
    <div className="border-t border-gray-200 pt-4">
      <p className="text-sm text-gray-600 font-semibold mb-3">
        SLA Compliance (Last 30 Days)
      </p>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Overall</span>
            <span className="font-semibold">{stats.slaHealth.complianceRate.overall}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${stats.slaHealth.complianceRate.overall}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Response SLA</span>
            <span className="font-semibold">{stats.slaHealth.complianceRate.response}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${stats.slaHealth.complianceRate.response}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Resolution SLA</span>
            <span className="font-semibold">{stats.slaHealth.complianceRate.resolution}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${stats.slaHealth.complianceRate.resolution}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>

    {/* Link to tickets */}
    <div className="mt-4 pt-4 border-t border-gray-200">
      <Link
        href="/admin/support?slaFilter=breached"
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        View breached tickets →
      </Link>
    </div>
  </div>
)}
```

### Step 3: Verify TypeScript Compilation

Backend:
```bash
cd packages/api && npx tsc --noEmit
```

Frontend:
```bash
cd packages/web && npx tsc --noEmit
```

Expected: No errors

### Step 4: Test Admin Dashboard

Start API and web app, navigate to /admin as platform admin.

Verify:
- SLA health section displays
- Breached and critical counts are correct
- Compliance rates display with progress bars
- Link to view breached tickets works

### Step 5: Commit Admin Dashboard SLA Stats

```bash
git add packages/api/src/admin/admin-status.controller.ts
git add packages/web/src/app/admin/page.tsx
git commit -m "feat: add SLA health statistics to admin dashboard

API:
- Add breached/critical SLA counts to status endpoint
- Calculate SLA compliance rate for last 30 days
- Break down compliance by response and resolution SLAs

Web:
- Display breached and critical SLA counts
- Show compliance rates with progress bars
- Add link to view breached tickets
- Color-coded indicators (red for breached, orange for critical)

Part of Phase 2B: SLA Tracking + Escalation"
```

---

## Task 15: Final Testing and Verification

**Files:**
- Create: `docs/testing/phase2b-verification-checklist.md`

### Step 1: Create Verification Checklist

Create `docs/testing/phase2b-verification-checklist.md`:

```markdown
# Phase 2B: SLA Tracking + Escalation - Verification Checklist

This checklist verifies all features of Phase 2B: SLA Tracking + Escalation.

---

## Automated Tests

### TypeScript Compilation

- [ ] API compiles without errors: `cd packages/api && npx tsc --noEmit`
- [ ] Web compiles without errors: `cd packages/web && npx tsc --noEmit`

### Database

- [ ] Schema migration applied: Check `prisma/migrations/` for `add_sla_tracking`
- [ ] Holiday table exists: `npx prisma studio` → Holiday table visible
- [ ] SupportTicket has SLA fields: Check schema for all new fields

### Build

- [ ] API builds: `npx nx build api`
- [ ] Web builds: `npx nx build web`

---

## Functional Tests

### 1. SLA Calculation

**Test Urgent Priority (4-hour response, 1-day resolution):**
- [ ] Create urgent ticket on Monday 2 PM
- [ ] Verify responseSLADeadline = Monday 6 PM (4 business hours)
- [ ] Verify resolutionSLADeadline = Tuesday 2 PM (24 business hours)
- [ ] Verify responseSLAStatus = 'on_track'
- [ ] Verify resolutionSLAStatus = 'on_track'

**Test High Priority (1-day response, 5-day resolution):**
- [ ] Create high priority ticket on Friday 8 PM
- [ ] Verify response deadline skips weekend, lands on Monday
- [ ] Verify resolution deadline = following Friday

**Test Medium Priority (3-day response, 30-day resolution):**
- [ ] Create medium priority ticket
- [ ] Verify deadlines calculated correctly

**Test Feature Priority (5-day response, no resolution SLA):**
- [ ] Create feature request ticket
- [ ] Verify resolutionSLADeadline = null

### 2. Business Hours Calculation

**Weekend Exclusion:**
- [ ] Create ticket Friday 9 PM
- [ ] Verify SLA clock doesn't count Saturday/Sunday
- [ ] Verify deadline resumes Monday 10 AM

**Holiday Exclusion:**
- [ ] Add a test holiday (tomorrow's date)
- [ ] Create ticket today
- [ ] Verify holiday is excluded from SLA calculation
- [ ] Verify deadline accounts for holiday

**After Hours:**
- [ ] Create ticket at 11 PM (after business hours)
- [ ] Verify SLA starts at next business hour (10 AM next day)

### 3. SLA Status Updates

**Approaching (60% threshold):**
- [ ] Wait for or simulate 60% of SLA time elapsed
- [ ] Verify responseSLAStatus changes to 'approaching'
- [ ] Verify badge turns yellow

**Critical (80% threshold):**
- [ ] Wait for or simulate 80% of SLA time elapsed
- [ ] Verify responseSLAStatus changes to 'critical'
- [ ] Verify badge turns orange
- [ ] Verify notification is sent

**Breached (100% threshold):**
- [ ] Wait for or simulate SLA deadline passing
- [ ] Verify responseSLAStatus changes to 'breached'
- [ ] Verify badge turns red
- [ ] Verify notification is sent

### 4. SLA Pause/Resume

**Pause on waiting_on_user:**
- [ ] Create ticket
- [ ] Change status to 'waiting_on_user'
- [ ] Verify slaPausedAt is set
- [ ] Verify slaPausedReason = 'waiting_on_user'
- [ ] Verify badge shows "Paused"

**Resume from waiting_on_user:**
- [ ] Resume ticket (change status to 'in_progress')
- [ ] Verify slaPausedAt is cleared
- [ ] Verify deadlines are extended by pause duration
- [ ] Verify SLA status recalculated

**Multiple Pause Cycles:**
- [ ] Pause ticket twice with different durations
- [ ] Verify cumulative pause time added to deadline

### 5. SLA Metrics Recording

**Response Time:**
- [ ] Create ticket
- [ ] Admin sends first message
- [ ] Verify actualResponseTime is recorded (in minutes)
- [ ] Verify responseSLAMet is set correctly (true/false)

**Resolution Time:**
- [ ] Resolve ticket with resolution text
- [ ] Verify actualResolutionTime is recorded
- [ ] Verify resolutionSLAMet is set correctly
- [ ] Verify paused time is excluded from calculation

### 6. SLA Scheduler

**Job Registration:**
- [ ] Start API server
- [ ] Check logs for "SLA status update job..." every 15 minutes
- [ ] Verify job is registered: Check NestJS scheduler logs

**Status Updates:**
- [ ] Create ticket approaching SLA breach
- [ ] Wait 15 minutes for job to run
- [ ] Verify ticket status updated
- [ ] Check logs for "SLA status update complete: X tickets updated"

**Notification Sending:**
- [ ] Ticket enters critical state during job run
- [ ] Verify notification created
- [ ] Verify notification appears in in-app notification bell
- [ ] Verify notification links to correct ticket

### 7. Holiday Management

**Add Holiday:**
- [ ] Login as platform admin
- [ ] Navigate to /admin/holidays
- [ ] Add new holiday with name and date
- [ ] Verify holiday appears in list

**Add Recurring Holiday:**
- [ ] Add holiday with recurring checkbox
- [ ] Verify isRecurring badge shows "Yes"
- [ ] Verify SLA calculations use holiday for future years

**Edit Holiday:**
- [ ] Edit holiday name and date
- [ ] Verify changes saved
- [ ] Verify SLA calculations use updated holiday

**Delete Holiday:**
- [ ] Delete holiday
- [ ] Confirm deletion
- [ ] Verify holiday removed from list
- [ ] Verify SLA calculations no longer exclude that date

**Access Control:**
- [ ] Try to access /admin/holidays as non-admin
- [ ] Verify redirected or forbidden
- [ ] Try API endpoints as non-admin
- [ ] Verify 403 Forbidden responses

### 8. Frontend - SLA Badges

**Badge Display:**
- [ ] View ticket list
- [ ] Verify SLA badge appears next to ticket title
- [ ] Verify badge color matches status:
  - Green = on_track
  - Yellow = approaching
  - Orange = critical
  - Red = breached
  - Gray = paused

**Badge Tooltip:**
- [ ] Hover over SLA badge
- [ ] Verify tooltip appears with:
  - Response SLA status and countdown
  - Resolution SLA status and countdown
  - Pause status if applicable

**Most Urgent SLA:**
- [ ] Create ticket with breached response SLA but on-track resolution
- [ ] Verify badge shows response SLA status (red)
- [ ] Create ticket with critical resolution but on-track response
- [ ] Verify badge shows resolution SLA status

### 9. Frontend - Ticket List Filters

**SLA Status Filter:**
- [ ] Filter by "On Track"
- [ ] Verify only on-track tickets shown
- [ ] Filter by "Critical"
- [ ] Verify only critical tickets shown
- [ ] Filter by "Breached"
- [ ] Verify only breached tickets shown
- [ ] Filter by "Paused"
- [ ] Verify only paused tickets shown

**SLA Urgency Sort:**
- [ ] Sort by "SLA Urgency"
- [ ] Verify order: Breached → Critical → Approaching → On Track → Paused

### 10. Admin Dashboard Stats

**SLA Health Display:**
- [ ] Navigate to /admin as platform admin
- [ ] Verify SLA Health section displays
- [ ] Verify breached count matches actual breached tickets
- [ ] Verify critical count matches actual critical tickets

**Compliance Rates:**
- [ ] Verify overall compliance % displayed
- [ ] Verify response compliance % displayed
- [ ] Verify resolution compliance % displayed
- [ ] Verify progress bars show correct percentages

**Link to Breached Tickets:**
- [ ] Click "View breached tickets →"
- [ ] Verify navigates to ticket list filtered by breached status

---

## Edge Cases

### Ticket Created Outside Business Hours

- [ ] Create ticket Saturday 3 PM
- [ ] Verify SLA starts Monday 10 AM
- [ ] Verify deadline calculated from Monday 10 AM

### Ticket Created During Holiday

- [ ] Create ticket on a configured holiday
- [ ] Verify SLA starts next business day
- [ ] Verify deadline excludes holiday

### Paused Ticket Resolved

- [ ] Pause ticket (waiting_on_user)
- [ ] Resolve ticket while paused
- [ ] Verify SLA auto-resumes
- [ ] Verify metrics calculated correctly

### Feature Request (No Resolution SLA)

- [ ] Create feature request ticket
- [ ] Verify only response SLA badge shown
- [ ] Verify no resolution SLA deadline
- [ ] Resolve ticket
- [ ] Verify resolutionSLAMet = null

### Daylight Saving Time Transition

- [ ] Create ticket before DST transition
- [ ] Deadline spans DST change
- [ ] Verify deadline accounts for time change correctly

---

## Performance Tests

### SLA Calculator Performance

- [ ] Create 100 test tickets
- [ ] Measure time for SLA calculation
- [ ] Expected: < 5 seconds for 100 tickets

### Scheduler Job Performance

- [ ] Have 1000+ active tickets
- [ ] Monitor scheduler job execution time
- [ ] Expected: Complete within 5 minutes

### Holiday Cache

- [ ] Verify holiday cache works (check logs for "Holiday cache refreshed")
- [ ] Verify cache expires after 24 hours
- [ ] Verify cache refresh doesn't block operations

---

## Integration Tests

### Full Ticket Lifecycle with SLA

1. **Create:**
   - [ ] Create urgent ticket
   - [ ] Verify SLA deadlines set

2. **First Response:**
   - [ ] Admin sends first message
   - [ ] Verify response time recorded
   - [ ] Verify responseSLAMet calculated

3. **Status Changes:**
   - [ ] Change to 'in_progress'
   - [ ] Verify SLA continues
   - [ ] Change to 'waiting_on_user'
   - [ ] Verify SLA pauses

4. **Resume:**
   - [ ] Change to 'in_progress'
   - [ ] Verify SLA resumes
   - [ ] Verify deadline extended

5. **Resolution:**
   - [ ] Resolve ticket
   - [ ] Verify resolution time recorded
   - [ ] Verify resolutionSLAMet calculated
   - [ ] Verify paused time excluded

### Holiday Impact on Active Tickets

- [ ] Have active ticket with SLA deadline after tomorrow
- [ ] Add holiday for tomorrow
- [ ] Wait for scheduler to run (15 min)
- [ ] Verify deadline recalculated (Note: Current design doesn't recalculate, verify this is intentional)

---

## Security Tests

### Holiday Management Access Control

- [ ] Try to access /admin/holidays as org admin
- [ ] Verify access denied
- [ ] Try to access as regular user
- [ ] Verify access denied
- [ ] Access as platform admin
- [ ] Verify access granted

### API Endpoint Authorization

- [ ] Try POST /admin/holidays as non-admin
- [ ] Verify 403 Forbidden
- [ ] Try PUT /admin/holidays/:id as non-admin
- [ ] Verify 403 Forbidden
- [ ] Try DELETE /admin/holidays/:id as non-admin
- [ ] Verify 403 Forbidden

---

## Error Handling

### Invalid Data

- [ ] Create ticket with invalid priority
- [ ] Verify defaults to 'medium'
- [ ] Create ticket without createdAt
- [ ] Verify defaults to current time

### Missing Holidays

- [ ] Delete all holidays
- [ ] Create ticket
- [ ] Verify SLA calculation still works (no holidays excluded)
- [ ] Check logs for warning

### Scheduler Failure

- [ ] Simulate database error during scheduler run
- [ ] Verify job logs error and continues
- [ ] Verify next run still executes

---

## Success Criteria

**All tests must pass:**
- [ ] All automated tests pass
- [ ] All functional tests pass
- [ ] All edge cases handled correctly
- [ ] Performance within acceptable ranges
- [ ] Security controls working
- [ ] Error handling graceful

**User Experience:**
- [ ] Admins can easily see which tickets need attention
- [ ] SLA status is clear and intuitive
- [ ] Notifications are timely and actionable
- [ ] Holiday management is straightforward

**System Reliability:**
- [ ] Scheduler runs consistently every 15 minutes
- [ ] No errors in logs under normal operation
- [ ] Database queries are performant
- [ ] Holiday cache improves performance

---

## Deployment Checklist

Before deploying to production:

- [ ] Run all database migrations
- [ ] Seed federal holidays
- [ ] Calculate initial SLA deadlines for open tickets (one-time script)
- [ ] Verify scheduler registers on API start
- [ ] Monitor first few scheduler runs
- [ ] Verify business hours timezone is correct (America/New_York)
- [ ] Document SLA policy for users
- [ ] Train admins on holiday management
- [ ] Set up monitoring for SLA breach alerts

---

**Testing Complete:** ___________
**Tested By:** ___________
**Date:** ___________
**Sign-off:** ___________
```

### Step 2: Run Automated Tests

Run TypeScript compilation:

```bash
# API
cd packages/api && npx tsc --noEmit

# Web
cd packages/web && npx tsc --noEmit
```

Expected: No errors

### Step 3: Verify Database Schema

```bash
cd packages/api
npx prisma studio
```

Verify:
- Holiday table exists
- SupportTicket has new SLA fields

### Step 4: Run Builds

```bash
# From root
npx nx build api
npx nx build web
```

Expected: Both build successfully

### Step 5: Commit Verification Checklist

```bash
git add docs/testing/phase2b-verification-checklist.md
git commit -m "docs: add Phase 2B verification checklist

- Comprehensive test plan for SLA tracking features
- Automated tests (compilation, schema, builds)
- Functional tests for all SLA features
- Edge cases and error handling
- Performance and security tests
- Deployment checklist

Part of Phase 2B: SLA Tracking + Escalation"
```

### Step 6: Document Implementation Complete

All 15 tasks are complete. Phase 2B implementation is ready for manual testing.

---

**End of Implementation Plan**

---

## Execution Options

Plan complete and saved to `docs/plans/2025-11-18-phase2b-sla-tracking-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach would you like?**
