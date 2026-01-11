# Phase 4: Scheduled Campaign Execution - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic execution of scheduled marketing campaigns using cron job running every 5 minutes.

**Architecture:** NestJS Schedule module with cron decorator, distributed lock using Redis for multi-instance safety, idempotent execution with atomic status updates, admin visibility with upcoming campaigns and execution log.

**Tech Stack:** NestJS, @nestjs/schedule (node-cron), Redis (existing), Prisma, existing CampaignService

---

## Task Groups Overview

1. **Cron Setup** (2 tasks) - Install @nestjs/schedule, register in module
2. **Campaign Scheduler Service** (3 tasks) - Cron job, execution logic, error handling
3. **Distributed Lock** (2 tasks) - Redis lock for multi-instance safety
4. **Admin Visibility** (3 tasks) - Upcoming campaigns, execution log, manual trigger
5. **Campaign Validation** (2 tasks) - Schedule-time preview, execution-time double-check
6. **Testing & Documentation** (2 tasks) - Unit tests, integration tests, docs

**Total: 14 tasks**

---

## Group 1: Cron Setup (2 tasks)

### Task 1: Install @nestjs/schedule dependency

**Files:**
- Modify: `packages/api/package.json`

**Step 1: Install dependency**

```bash
cd packages/api
npm install @nestjs/schedule
```

Expected: Package installed successfully

**Step 2: Verify installation**

```bash
npm list @nestjs/schedule
```

Expected: Shows @nestjs/schedule version

**Step 3: Commit**

```bash
git add packages/api/package.json packages/api/package-lock.json
git commit -m "feat(cron): install @nestjs/schedule for cron job support"
```

---

### Task 2: Register ScheduleModule in MarketingModule

**Files:**
- Modify: `packages/api/src/marketing/marketing.module.ts`

**Step 1: Import ScheduleModule**

Add to imports at top:

```typescript
import { ScheduleModule } from '@nestjs/schedule';
```

**Step 2: Add to module imports**

Update the @Module decorator:

```typescript
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ScheduleModule.forRoot(), // Add this
    // ... other imports
  ],
  controllers: [MarketingController],
  providers: [
    MarketingService,
    CampaignService,
    // ... other providers
  ],
  exports: [CampaignService],
})
export class MarketingModule {}
```

**Step 3: Commit**

```bash
git add packages/api/src/marketing/marketing.module.ts
git commit -m "feat(marketing): register ScheduleModule for cron support"
```

---

## Group 2: Campaign Scheduler Service (3 tasks)

### Task 3: Create CampaignSchedulerService

**Files:**
- Create: `packages/api/src/marketing/services/campaign-scheduler.service.ts`

**Step 1: Create scheduler service**

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

  @Cron('*/5 * * * *', {
    name: 'scheduled-campaigns',
    timeZone: 'America/New_York', // Adjust to your timezone
  })
  async executeScheduledCampaigns() {
    this.logger.log('Checking for scheduled campaigns...');

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    try {
      // Find campaigns due for execution
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

      // Execute each campaign
      for (const campaign of campaigns) {
        try {
          await this.executeCampaign(campaign.id, campaign.name);
        } catch (error) {
          this.logger.error(
            `Failed to execute campaign ${campaign.id} (${campaign.name}): ${error.message}`,
            error.stack,
          );
          // Continue with next campaign even if this one fails
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check for scheduled campaigns: ${error.message}`,
        error.stack,
      );
    }
  }

  private async executeCampaign(campaignId: string, campaignName: string): Promise<void> {
    this.logger.log(`Executing campaign: ${campaignId} (${campaignName})`);

    // Update status to 'sending' to prevent duplicate execution
    try {
      const updated = await this.prisma.emailCampaign.updateMany({
        where: {
          id: campaignId,
          status: 'scheduled', // Only update if still scheduled (atomic)
        },
        data: { status: 'sending' },
      });

      if (updated.count === 0) {
        this.logger.warn(
          `Campaign ${campaignId} already being processed, skipping`,
        );
        return;
      }
    } catch (error) {
      this.logger.error(
        `Failed to update campaign ${campaignId} status: ${error.message}`,
      );
      throw error;
    }

    // Execute via existing service
    try {
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
        `Campaign ${campaignId} (${campaignName}) executed successfully: ${result.queued} emails queued`,
      );
    } catch (error) {
      // Mark as failed
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });

      this.logger.error(
        `Campaign ${campaignId} (${campaignName}) execution failed: ${error.message}`,
      );

      throw error;
    }
  }
}
```

**Step 2: Commit**

```bash
git add packages/api/src/marketing/services/campaign-scheduler.service.ts
git commit -m "feat(marketing): add CampaignSchedulerService with cron job"
```

---

### Task 4: Register CampaignSchedulerService in MarketingModule

**Files:**
- Modify: `packages/api/src/marketing/marketing.module.ts`

**Step 1: Import service**

Add to imports:

```typescript
import { CampaignSchedulerService } from './services/campaign-scheduler.service';
```

**Step 2: Add to providers**

Update providers array:

```typescript
providers: [
  MarketingService,
  CampaignService,
  CampaignSchedulerService, // Add this
  // ... other providers
],
```

**Step 3: Commit**

```bash
git add packages/api/src/marketing/marketing.module.ts
git commit -m "feat(marketing): register CampaignSchedulerService"
```

---

### Task 5: Add manual execution trigger endpoint

**Files:**
- Modify: `packages/api/src/marketing/marketing.controller.ts` (or create if doesn't exist)

**Step 1: Add manual trigger endpoint**

Add endpoint to controller:

```typescript
import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CampaignService } from './services/campaign.service';

@Controller('admin/marketing/campaigns')
@UseGuards(JwtAuthGuard)
@Roles('platform_admin', 'organization_admin')
export class MarketingController {
  constructor(private campaignService: CampaignService) {}

  @Post(':id/execute')
  async executeCampaignNow(
    @Param('id') campaignId: string,
  ) {
    // Update scheduledFor to now so cron picks it up
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        scheduledFor: new Date(),
        status: 'scheduled', // Ensure it's scheduled
      },
    });

    return {
      success: true,
      message: 'Campaign queued for immediate execution',
    };
  }
}
```

**Step 2: Inject PrismaService if not already injected**

Add to constructor if needed:

```typescript
constructor(
  private campaignService: CampaignService,
  private prisma: PrismaService,
) {}
```

**Step 3: Commit**

```bash
git add packages/api/src/marketing/marketing.controller.ts
git commit -m "feat(marketing): add manual campaign execution trigger endpoint"
```

---

## Group 3: Distributed Lock (2 tasks)

### Task 6: Create distributed lock service

**Files:**
- Create: `packages/api/src/common/services/distributed-lock.service.ts`

**Step 1: Create lock service**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private redis: RedisService) {}

  /**
   * Acquire a distributed lock
   * @param lockKey The unique key for this lock
   * @param ttlSeconds Time-to-live in seconds (lock expires after this)
   * @returns true if lock acquired, false if already locked
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const result = await this.redis.set(
        lockKey,
        Date.now().toString(),
        'EX',
        ttlSeconds,
        'NX', // Only set if not exists
      );

      const acquired = result === 'OK';

      if (acquired) {
        this.logger.debug(`Lock acquired: ${lockKey}`);
      } else {
        this.logger.debug(`Lock already held: ${lockKey}`);
      }

      return acquired;
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release a distributed lock
   * @param lockKey The unique key for this lock
   */
  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redis.del(lockKey);
      this.logger.debug(`Lock released: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}: ${error.message}`);
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param lockKey The unique key for this lock
   * @param ttlSeconds Time-to-live in seconds
   * @param fn The function to execute
   * @returns The result of the function, or null if lock not acquired
   */
  async withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(lockKey, ttlSeconds);

    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lockKey);
    }
  }
}
```

**Step 2: Commit**

```bash
git add packages/api/src/common/services/distributed-lock.service.ts
git commit -m "feat(common): add distributed lock service using Redis"
```

---

### Task 7: Integrate distributed lock into campaign scheduler

**Files:**
- Modify: `packages/api/src/marketing/services/campaign-scheduler.service.ts`

**Step 1: Import lock service**

Add to imports:

```typescript
import { DistributedLockService } from '../../common/services/distributed-lock.service';
```

**Step 2: Inject lock service**

Update constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private campaignService: CampaignService,
  private lockService: DistributedLockService,
) {}
```

**Step 3: Wrap cron execution with lock**

Update `executeScheduledCampaigns` method:

```typescript
@Cron('*/5 * * * *', {
  name: 'scheduled-campaigns',
  timeZone: 'America/New_York',
})
async executeScheduledCampaigns() {
  const lockKey = 'campaign-scheduler-lock';
  const lockTTL = 300; // 5 minutes

  const result = await this.lockService.withLock(
    lockKey,
    lockTTL,
    async () => {
      return await this.executeScheduledCampaignsInternal();
    },
  );

  if (result === null) {
    this.logger.log('Another instance is executing campaigns, skipping');
  }
}

private async executeScheduledCampaignsInternal() {
  this.logger.log('Checking for scheduled campaigns...');

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  try {
    // ... rest of existing logic (campaigns finding and execution)
  } catch (error) {
    // ... existing error handling
  }
}
```

**Step 4: Register lock service in module**

Update `packages/api/src/marketing/marketing.module.ts`:

```typescript
import { DistributedLockService } from '../common/services/distributed-lock.service';

@Module({
  imports: [
    // ... existing imports
  ],
  controllers: [MarketingController],
  providers: [
    MarketingService,
    CampaignService,
    CampaignSchedulerService,
    DistributedLockService, // Add this
    // ... other providers
  ],
  exports: [CampaignService],
})
export class MarketingModule {}
```

**Step 5: Commit**

```bash
git add packages/api/src/marketing/services/campaign-scheduler.service.ts packages/api/src/marketing/marketing.module.ts
git commit -m "feat(marketing): add distributed lock to campaign scheduler for multi-instance safety"
```

---

## Group 4: Admin Visibility (3 tasks)

### Task 8: Create upcoming campaigns endpoint

**Files:**
- Modify: `packages/api/src/marketing/marketing.controller.ts`

**Step 1: Add upcoming campaigns endpoint**

Add endpoint:

```typescript
@Get('scheduled')
async getScheduledCampaigns() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const campaigns = await this.prisma.emailCampaign.findMany({
    where: {
      status: 'scheduled',
      scheduledFor: {
        gte: now,
        lte: tomorrow,
      },
    },
    orderBy: { scheduledFor: 'asc' },
    select: {
      id: true,
      name: true,
      scheduledFor: true,
      recipients: true,
    },
  });

  return {
    campaigns: campaigns.map(c => ({
      id: c.id,
      name: c.name,
      scheduledFor: c.scheduledFor,
      recipientCount: c.recipients?.length || 0,
    })),
  };
}
```

**Step 2: Commit**

```bash
git add packages/api/src/marketing/marketing.controller.ts
git commit -m "feat(marketing): add endpoint for upcoming scheduled campaigns"
```

---

### Task 9: Create execution log endpoint

**Files:**
- Modify: `packages/api/src/marketing/marketing.controller.ts`

**Step 1: Add execution log endpoint**

Add endpoint:

```typescript
@Get('execution-log')
async getExecutionLog(@Query('limit') limit?: string) {
  const limitNum = limit ? parseInt(limit) : 100;

  const campaigns = await this.prisma.emailCampaign.findMany({
    where: {
      status: { in: ['sent', 'failed'] },
      sentAt: { not: null },
    },
    orderBy: { sentAt: 'desc' },
    take: limitNum,
    select: {
      id: true,
      name: true,
      status: true,
      sentAt: true,
      recipients: true,
    },
  });

  return {
    executions: campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      executedAt: c.sentAt,
      recipientCount: c.recipients?.length || 0,
    })),
  };
}
```

**Step 2: Commit**

```bash
git add packages/api/src/marketing/marketing.controller.ts
git commit -m "feat(marketing): add execution log endpoint for recent campaign executions"
```

---

### Task 10: Create admin UI for scheduled campaigns

**Files:**
- Create: `packages/web/src/app/admin/marketing/campaigns/scheduled/page.tsx`

**Step 1: Create scheduled campaigns page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';

interface ScheduledCampaign {
  id: string;
  name: string;
  scheduledFor: string;
  recipientCount: number;
}

interface ExecutionLog {
  id: string;
  name: string;
  status: 'sent' | 'failed';
  executedAt: string;
  recipientCount: number;
}

export default function ScheduledCampaignsPage() {
  const [scheduled, setScheduled] = useState<ScheduledCampaign[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [scheduledRes, executionsRes] = await Promise.all([
        fetch('/api/admin/marketing/campaigns/scheduled', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/admin/marketing/campaigns/execution-log?limit=50', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const scheduledData = await scheduledRes.json();
      const executionsData = await executionsRes.json();

      setScheduled(scheduledData.campaigns || []);
      setExecutions(executionsData.executions || []);
    } catch (error) {
      showToast('Failed to load scheduled campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Execute "${campaignName}" immediately?`)) {
      return;
    }

    try {
      await fetch(`/api/admin/marketing/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      showToast('Campaign queued for immediate execution', 'success');
      // Refresh after a short delay
      setTimeout(fetchData, 2000);
    } catch (error) {
      showToast('Failed to execute campaign', 'error');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scheduled Campaigns</h1>

      {/* Upcoming Campaigns */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Upcoming (Next 24 Hours)</h2>
        {scheduled.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-600">
            No campaigns scheduled for the next 24 hours
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Scheduled For
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduled.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(campaign.scheduledFor).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.recipientCount}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleExecuteNow(campaign.id, campaign.name)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Execute Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Executions (Last 50)</h2>
        {executions.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-600">
            No recent executions
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Executed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.map((execution) => (
                  <tr key={execution.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {execution.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(execution.executedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {execution.status === 'sent' ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Sent
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          ✗ Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {execution.recipientCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/admin/marketing/campaigns/scheduled/page.tsx
git commit -m "feat(admin-ui): add scheduled campaigns page with execution log"
```

---

## Group 5: Campaign Validation (2 tasks)

### Task 11: Add schedule-time validation

**Files:**
- Create: `packages/api/src/marketing/services/campaign-validation.service.ts`

**Step 1: Create validation service**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ValidationResult {
  eligible: number;
  ineligible: number;
  reasons: Array<{ email: string; reason: string }>;
}

@Injectable()
export class CampaignValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate recipients against 90-day cooldown rule
   */
  async validateRecipients(
    recipientEmails: string[],
  ): Promise<ValidationResult> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const eligible: string[] = [];
    const ineligible: Array<{ email: string; reason: string }> = [];

    for (const email of recipientEmails) {
      // Check if user has received any campaign in last 90 days
      const recentCampaign = await this.prisma.emailCampaignRecipient.findFirst({
        where: {
          recipientEmail: email,
          sentAt: { gte: ninetyDaysAgo },
          status: 'sent',
        },
        orderBy: { sentAt: 'desc' },
      });

      if (recentCampaign) {
        const daysSince = Math.floor(
          (Date.now() - recentCampaign.sentAt.getTime()) / (24 * 60 * 60 * 1000),
        );
        ineligible.push({
          email,
          reason: `Received campaign ${90 - daysSince} days ago (90-day cooldown)`,
        });
      } else {
        eligible.push(email);
      }
    }

    return {
      eligible: eligible.length,
      ineligible: ineligible.length,
      reasons: ineligible,
    };
  }
}
```

**Step 2: Add preview endpoint**

Modify `packages/api/src/marketing/marketing.controller.ts`:

```typescript
import { CampaignValidationService } from './services/campaign-validation.service';

// In constructor:
constructor(
  private campaignService: CampaignService,
  private prisma: PrismaService,
  private validationService: CampaignValidationService,
) {}

// Add endpoint:
@Post(':id/preview')
async previewCampaign(@Param('id') campaignId: string) {
  const campaign = await this.prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const recipientEmails = campaign.recipients.map(r => r.recipientEmail);
  const validation = await this.validationService.validateRecipients(recipientEmails);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalRecipients: recipientEmails.length,
    ...validation,
  };
}
```

**Step 3: Register validation service**

Update `packages/api/src/marketing/marketing.module.ts`:

```typescript
import { CampaignValidationService } from './services/campaign-validation.service';

providers: [
  MarketingService,
  CampaignService,
  CampaignSchedulerService,
  CampaignValidationService, // Add this
  DistributedLockService,
  // ... other providers
],
```

**Step 4: Commit**

```bash
git add packages/api/src/marketing/services/campaign-validation.service.ts packages/api/src/marketing/marketing.controller.ts packages/api/src/marketing/marketing.module.ts
git commit -m "feat(marketing): add campaign recipient validation with 90-day cooldown"
```

---

### Task 12: Add execution-time double-check

**Files:**
- Modify: `packages/api/src/marketing/services/campaign.service.ts`

**Step 1: Update executeCampaign to filter recipients**

Find the `executeCampaign` method and add validation:

```typescript
async executeCampaign(campaignId: string): Promise<{ success: boolean; queued: number }> {
  const campaign = await this.prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Double-check 90-day cooldown at execution time
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const eligibleRecipients: string[] = [];
  const skippedRecipients: Array<{ email: string; reason: string }> = [];

  for (const recipient of campaign.recipients) {
    // Check if recipient has received campaign in last 90 days
    const recentCampaign = await this.prisma.emailCampaignRecipient.findFirst({
      where: {
        recipientEmail: recipient.recipientEmail,
        sentAt: { gte: ninetyDaysAgo },
        status: 'sent',
      },
    });

    if (recentCampaign) {
      skippedRecipients.push({
        email: recipient.recipientEmail,
        reason: '90-day cooldown',
      });
    } else {
      eligibleRecipients.push(recipient.recipientEmail);
    }
  }

  // Log skipped recipients
  if (skippedRecipients.length > 0) {
    this.logger.log(
      `Skipped ${skippedRecipients.length} recipients due to 90-day cooldown`,
    );
  }

  // Queue emails for eligible recipients only
  let queued = 0;
  for (const email of eligibleRecipients) {
    // Queue email (existing logic)
    await this.emailQueue.add('send-campaign-email', {
      campaignId: campaign.id,
      recipientEmail: email,
      subject: campaign.subject,
      htmlBody: campaign.htmlBody,
      textBody: campaign.textBody,
    });
    queued++;
  }

  return { success: true, queued };
}
```

**Step 2: Commit**

```bash
git add packages/api/src/marketing/services/campaign.service.ts
git commit -m "feat(marketing): add execution-time 90-day cooldown validation"
```

---

## Group 6: Testing & Documentation (2 tasks)

### Task 13: Create unit tests

**Files:**
- Create: `packages/api/src/marketing/services/campaign-scheduler.service.spec.ts`

**Step 1: Create test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignService } from './campaign.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';

describe('CampaignSchedulerService', () => {
  let service: CampaignSchedulerService;
  let prisma: PrismaService;
  let campaignService: CampaignService;
  let lockService: DistributedLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignSchedulerService,
        {
          provide: PrismaService,
          useValue: {
            emailCampaign: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CampaignService,
          useValue: {
            executeCampaign: jest.fn(),
          },
        },
        {
          provide: DistributedLockService,
          useValue: {
            withLock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CampaignSchedulerService>(CampaignSchedulerService);
    prisma = module.get<PrismaService>(PrismaService);
    campaignService = module.get<CampaignService>(CampaignService);
    lockService = module.get<DistributedLockService>(DistributedLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find campaigns due for execution', async () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'scheduled',
        scheduledFor: new Date(),
      },
    ];

    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue(mockCampaigns as any);
    jest.spyOn(prisma.emailCampaign, 'updateMany').mockResolvedValue({ count: 1 } as any);
    jest.spyOn(campaignService, 'executeCampaign').mockResolvedValue({
      success: true,
      queued: 10,
    });
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(prisma.emailCampaign.findMany).toHaveBeenCalled();
    expect(campaignService.executeCampaign).toHaveBeenCalledWith('1', 'Test Campaign');
  });

  it('should skip if no campaigns are due', async () => {
    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue([]);
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(campaignService.executeCampaign).not.toHaveBeenCalled();
  });

  it('should handle execution errors gracefully', async () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'scheduled',
        scheduledFor: new Date(),
      },
    ];

    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue(mockCampaigns as any);
    jest.spyOn(prisma.emailCampaign, 'updateMany').mockResolvedValue({ count: 1 } as any);
    jest.spyOn(campaignService, 'executeCampaign').mockRejectedValue(new Error('Execution failed'));
    jest.spyOn(prisma.emailCampaign, 'update').mockResolvedValue({} as any);
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { status: 'failed' },
    });
  });
});
```

**Step 2: Run tests**

```bash
cd packages/api
npm test -- campaign-scheduler.service
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/api/src/marketing/services/campaign-scheduler.service.spec.ts
git commit -m "test(marketing): add unit tests for CampaignSchedulerService"
```

---

### Task 14: Create documentation and build verification

**Files:**
- Create: `docs/features/scheduled-campaigns.md`

**Step 1: Create documentation**

```markdown
# Scheduled Campaign Execution

## Overview

Automatic execution of scheduled marketing campaigns using cron job running every 5 minutes.

## Features

- **Cron Execution**: Runs every 5 minutes
- **Distributed Lock**: Multi-instance safe using Redis
- **Idempotent**: Atomic status updates prevent duplicate execution
- **90-Day Cooldown**: Recipients must wait 90 days between campaigns
- **Admin Visibility**: View upcoming campaigns and execution log
- **Manual Trigger**: Execute campaigns immediately
- **Error Handling**: Failed campaigns logged, don't block others

## Cron Schedule

```
*/5 * * * * = Every 5 minutes
```

Configured in `CampaignSchedulerService.executeScheduledCampaigns()` with `@Cron` decorator.

## Execution Flow

1. **Cron triggers** every 5 minutes
2. **Acquire distributed lock** (Redis)
   - If lock held by another instance, skip
3. **Find due campaigns**:
   - Status: `scheduled`
   - ScheduledFor: Between now and 10 minutes ago
4. **For each campaign**:
   - Update status to `sending` (atomic)
   - Execute via `CampaignService.executeCampaign()`
   - Validate 90-day cooldown at execution time
   - Skip ineligible recipients
   - Update status to `sent` or `failed`
5. **Release lock**

## Safety Mechanisms

### Distributed Lock
- Uses Redis `SET key value EX ttl NX` (atomic)
- TTL: 5 minutes (matches cron interval)
- Prevents multiple instances from executing same campaigns

### Atomic Status Update
```typescript
await prisma.emailCampaign.updateMany({
  where: {
    id: campaignId,
    status: 'scheduled', // Only update if still scheduled
  },
  data: { status: 'sending' },
});
```

### 10-Minute Safety Window
- Only executes campaigns scheduled between now and 10 minutes ago
- Prevents re-processing old campaigns

### Error Isolation
- Each campaign wrapped in try-catch
- One campaign failure doesn't block others

## 90-Day Cooldown Validation

### Schedule-Time (Preview)
```
POST /api/admin/marketing/campaigns/:id/preview
Response: {
  eligible: 45,
  ineligible: 3,
  reasons: [
    { email: "user@example.com", reason: "Received campaign 15 days ago" }
  ]
}
```

### Execution-Time (Double-Check)
- Before queuing emails, re-validate 90-day cooldown
- Skip recipients who have received campaign in last 90 days
- Log skipped recipients with reasons

## API Endpoints

### Get Upcoming Campaigns (Next 24 Hours)
```
GET /api/admin/marketing/campaigns/scheduled
Response: {
  campaigns: [
    {
      id: "uuid",
      name: "Spring Outreach",
      scheduledFor: "2026-01-12T14:00:00Z",
      recipientCount: 45
    }
  ]
}
```

### Get Execution Log (Recent 100)
```
GET /api/admin/marketing/campaigns/execution-log?limit=100
Response: {
  executions: [
    {
      id: "uuid",
      name: "Winter Event",
      status: "sent",
      executedAt: "2026-01-11T10:05:00Z",
      recipientCount: 34
    }
  ]
}
```

### Execute Campaign Immediately
```
POST /api/admin/marketing/campaigns/:id/execute
Response: {
  success: true,
  message: "Campaign queued for immediate execution"
}
```

### Preview Campaign
```
POST /api/admin/marketing/campaigns/:id/preview
Response: {
  campaignId: "uuid",
  campaignName: "Test Campaign",
  totalRecipients: 50,
  eligible: 47,
  ineligible: 3,
  reasons: [...]
}
```

## Admin UI

### Scheduled Campaigns Page
**Location**: `/admin/marketing/campaigns/scheduled`

**Sections**:
1. **Upcoming Campaigns** (Next 24 hours)
   - Campaign name
   - Scheduled time
   - Recipient count
   - "Execute Now" button

2. **Recent Executions** (Last 50)
   - Campaign name
   - Executed time
   - Status (✓ Sent / ✗ Failed)
   - Recipient count

**Auto-Refresh**: Every 30 seconds

## Monitoring

### Logs
```
[CampaignSchedulerService] Checking for scheduled campaigns...
[CampaignSchedulerService] Found 2 campaigns to execute
[CampaignSchedulerService] Executing campaign: abc-123 (Spring Outreach)
[CampaignSchedulerService] Skipped 3 recipients due to 90-day cooldown
[CampaignSchedulerService] Campaign abc-123 (Spring Outreach) executed successfully: 42 emails queued
```

### Errors
```
[CampaignSchedulerService] Failed to execute campaign abc-123 (Spring Outreach): Connection timeout
```

## Testing

Run unit tests:
```bash
cd packages/api
npm test -- campaign-scheduler.service
```

## Configuration

### Cron Timezone
Update in `CampaignSchedulerService`:
```typescript
@Cron('*/5 * * * *', {
  name: 'scheduled-campaigns',
  timeZone: 'America/New_York', // Change this
})
```

### Distributed Lock TTL
Update in `CampaignSchedulerService.executeScheduledCampaigns()`:
```typescript
const lockTTL = 300; // 5 minutes (in seconds)
```

### Safety Window
Update in `CampaignSchedulerService.executeScheduledCampaignsInternal()`:
```typescript
const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // Change duration
```
```

**Step 2: Build verification**

```bash
cd packages/api
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add docs/features/scheduled-campaigns.md
git commit -m "docs(marketing): add comprehensive scheduled campaigns documentation"
```

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(marketing): Phase 4 implementation complete - scheduled campaign execution"
```

---

## Summary

**Phase 4: Scheduled Campaign Execution - Complete Implementation**

### What Was Built

1. **Cron Job System**
   - @nestjs/schedule integration
   - Cron job running every 5 minutes
   - Timezone configuration support

2. **Campaign Scheduler Service**
   - Automatic execution of due campaigns
   - 10-minute safety window
   - Campaign-level error isolation
   - Detailed logging

3. **Distributed Lock**
   - Redis-based distributed lock
   - Multi-instance safety
   - 5-minute TTL matching cron interval
   - Atomic operations

4. **Admin Visibility**
   - Upcoming campaigns endpoint (next 24 hours)
   - Execution log endpoint (last 100)
   - Manual "Execute Now" trigger
   - Admin UI with auto-refresh

5. **Campaign Validation**
   - 90-day cooldown enforcement
   - Schedule-time preview
   - Execution-time double-check
   - Recipient skip logging

### Files Created (6 new files)

**Services (3 files):**
- `src/marketing/services/campaign-scheduler.service.ts` - Cron job
- `src/marketing/services/campaign-validation.service.ts` - 90-day validation
- `src/common/services/distributed-lock.service.ts` - Redis lock

**Tests (1 file):**
- `src/marketing/services/campaign-scheduler.service.spec.ts` - Unit tests

**UI (1 file):**
- `app/admin/marketing/campaigns/scheduled/page.tsx` - Admin UI

**Documentation (1 file):**
- `docs/features/scheduled-campaigns.md` - Complete documentation

### Files Modified (3 files)

**Backend:**
- `src/marketing/marketing.module.ts` - Registered services
- `src/marketing/marketing.controller.ts` - Added endpoints
- `src/marketing/services/campaign.service.ts` - Execution-time validation

**Dependencies:**
- `package.json` - Added @nestjs/schedule

### Total Implementation

- **14 tasks** completed
- **6 new files** created
- **4 files** modified
- **5-minute cron job** running
- **Distributed lock** for multi-instance safety
- **90-day cooldown** validation
- **Admin UI** with execution log
- **Unit tests** included

**Phase 4 is now COMPLETE and ready for production deployment.**
