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
   - Execute via `CampaignExecutionService.executeCampaign()`
   - Validate 90-day cooldown at execution time
   - Skip ineligible recipients
   - Update status to `sent` or `failed`
5. **Release lock**

## Safety Mechanisms

### Distributed Lock
- Uses Redis `SET key value EX ttl NX` (atomic)
- TTL: 5 minutes (matches cron interval)
- Prevents multiple instances from executing same campaigns
- Implemented via `DistributedLockService.withLock()`

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
- Failed campaigns logged with full error details

## 90-Day Cooldown Validation

The 90-day cooldown is enforced at execution time by `CampaignExecutionService`:

- Before queuing emails, validates each recipient
- Skips recipients who have received a campaign in the last 90 days
- Logs skipped recipients with reasons
- Returns `ExecutionSummary` with sent, failed, and skipped counts

## API Endpoints

### Get Upcoming Campaigns (Next 24 Hours)
```
GET /api/marketing/campaigns/scheduled

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

### Get Execution Log (Recent Executions)
```
GET /api/marketing/campaigns/execution-log?limit=50

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
POST /api/marketing/campaigns/:id/execute

Response: {
  success: true,
  message: "Campaign queued for immediate execution"
}
```

Updates the campaign's `scheduledFor` to now and ensures status is `scheduled`, allowing the cron job to pick it up on the next run (within 5 minutes).

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
[CampaignSchedulerService] Campaign abc-123 (Spring Outreach) executed successfully: 42 sent, 0 failed, 3 skipped
```

### Errors
```
[CampaignSchedulerService] Failed to execute campaign abc-123 (Spring Outreach): Connection timeout
[CampaignSchedulerService] Campaign abc-123 (Spring Outreach) execution failed: Connection timeout
```

### Lock Acquisition
```
[CampaignSchedulerService] Another instance is executing campaigns, skipping
```

## Testing

Run unit tests:
```bash
npx jest --config packages/api/jest.config.js --testPathPatterns=campaign-scheduler.service.spec
```

Expected: 6 tests passing
- Should be defined
- Should find campaigns due for execution
- Should skip if no campaigns are due
- Should handle execution errors gracefully
- Should skip when lock is already held
- Should prevent duplicate execution with atomic update

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

## Architecture

### Services

**CampaignSchedulerService** (`src/marketing/services/campaign-scheduler.service.ts`)
- Cron job orchestration
- Distributed lock acquisition
- Campaign execution coordination

**CampaignExecutionService** (`src/marketing/campaign-execution.service.ts`)
- Individual campaign execution
- 90-day cooldown validation
- Email queuing
- Status updates

**DistributedLockService** (`src/common/services/distributed-lock.service.ts`)
- Redis-based distributed locking
- Atomic lock acquisition/release
- Lock expiration via TTL

**RedisService** (`src/common/services/redis.service.ts`)
- Wrapper around ioredis client
- Connection lifecycle management
- Type-safe Redis operations

### Database Schema

**EmailCampaign**
- `status`: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
- `scheduledFor`: Timestamp for scheduled execution
- `sentAt`: Timestamp when campaign was sent

### Multi-Instance Safety

The system uses two layers of protection against duplicate execution:

1. **Distributed Lock (Primary)**
   - Redis-based lock prevents multiple instances from running simultaneously
   - Lock key: `campaign-scheduler-lock`
   - TTL: 5 minutes (matches cron interval)

2. **Atomic Status Update (Fallback)**
   - Database-level atomicity ensures only one instance can update status
   - Only updates if status is still `scheduled`
   - If update count is 0, campaign was already picked up by another process

This dual-layer approach provides redundancy in case Redis is unavailable or experiences network partitions.

## Deployment Considerations

### Redis Configuration
Ensure Redis is configured in the API service:
```json
{
  "REDIS_HOST": "localhost",
  "REDIS_PORT": "6379"
}
```

**IMPORTANT**: In AWS Lightsail container services, use `localhost` not `redis` for REDIS_HOST, as all containers in the same service share the same network namespace.

### Cron Job Scaling
- Cron jobs run on all API instances
- Distributed lock ensures only one instance executes at a time
- Safe to scale horizontally without coordination

### Monitoring
- Check CloudWatch logs for execution patterns
- Monitor Redis connection health
- Alert on repeated lock acquisition failures
- Track campaign failure rates
