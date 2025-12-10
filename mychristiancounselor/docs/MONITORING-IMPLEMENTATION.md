# Platform Monitoring Implementation

## Overview

Comprehensive monitoring solution with metrics displayed on admin dashboard and external monitoring for alerts.

## Metrics to Track

### System Health

1. **Uptime**
   - API uptime percentage (99.9% target)
   - Last 24 hours, 7 days, 30 days
   - Incident history

2. **Response Time**
   - Average API response time (< 500ms target)
   - P50, P95, P99 percentiles
   - By endpoint

3. **Error Rate**
   - 5xx errors per minute
   - 4xx errors per minute
   - Error breakdown by type

4. **Database**
   - Connection pool status
   - Query performance (slow queries)
   - Database size

5. **Dependencies**
   - OpenAI API status
   - Stripe API status
   - Email service (Postmark) status

### Business Metrics

1. **Users**
   - Total users
   - Active users (last 24h)
   - New signups (today/week/month)

2. **Conversations**
   - Total sessions
   - Active sessions (today)
   - Messages sent (today)

3. **Subscriptions**
   - Active subscriptions
   - Revenue (MRR)
   - Churn rate

4. **Organizations**
   - Total organizations
   - Total members
   - Average members per org

## Implementation

### 1. Backend Health Endpoint

Create `/health/metrics` endpoint that returns system metrics.

**File**: `packages/api/src/health/health.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  // Public health check (for external monitoring)
  @Get()
  async healthCheck() {
    return { status: 'ok', timestamp: new Date() };
  }

  // Detailed metrics (admin only)
  @Get('metrics')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async getMetrics() {
    return this.healthService.getSystemMetrics();
  }
}
```

**File**: `packages/api/src/health/health.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async getSystemMetrics() {
    // Calculate uptime
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const uptimeHours = (uptime / 3600).toFixed(2);

    // Get database metrics
    const [
      totalUsers,
      activeUsers24h,
      newUsersToday,
      totalSessions,
      activeSessions,
      totalMessages,
      messagesToday,
      activeSubscriptions,
      totalOrganizations,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Active users (last 24h - had a session)
      this.prisma.user.count({
        where: {
          sessions: {
            some: {
              lastMessageAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),

      // New users today
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Total counseling sessions
      this.prisma.counselingSession.count(),

      // Active sessions today
      this.prisma.counselingSession.count({
        where: {
          lastMessageAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Total messages
      this.prisma.message.count(),

      // Messages today
      this.prisma.message.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Active subscriptions
      this.prisma.user.count({
        where: {
          subscriptionStatus: 'active',
        },
      }),

      // Total organizations
      this.prisma.organization.count(),
    ]);

    // Calculate response time (from process hrtime)
    const memoryUsage = process.memoryUsage();

    return {
      system: {
        uptime: `${uptimeHours}h`,
        uptimeSeconds: uptime,
        status: 'healthy',
        timestamp: new Date(),
      },

      performance: {
        memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        memoryPercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },

      users: {
        total: totalUsers,
        active24h: activeUsers24h,
        newToday: newUsersToday,
      },

      conversations: {
        totalSessions,
        activeToday: activeSessions,
        totalMessages,
        messagesToday,
      },

      subscriptions: {
        active: activeSubscriptions,
        // Calculate MRR (Monthly Recurring Revenue)
        // This is simplified - should account for different tiers
        mrr: activeSubscriptions * 9.99,
      },

      organizations: {
        total: totalOrganizations,
      },
    };
  }
}
```

### 2. Admin Dashboard Monitoring Component

**File**: `packages/web/src/components/MonitoringDashboard.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '../lib/auth';

interface SystemMetrics {
  system: {
    uptime: string;
    status: string;
    timestamp: string;
  };
  performance: {
    memoryUsageMB: number;
    memoryTotalMB: number;
    memoryPercentage: number;
  };
  users: {
    total: number;
    active24h: number;
    newToday: number;
  };
  conversations: {
    totalSessions: number;
    activeToday: number;
    totalMessages: number;
    messagesToday: number;
  };
  subscriptions: {
    active: number;
    mrr: number;
  };
  organizations: {
    total: number;
  };
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

      const response = await fetch(`${apiUrl}/health/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading metrics...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-8">Error: {error}</div>;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="System Status"
          value={metrics.system.status}
          color={metrics.system.status === 'healthy' ? 'green' : 'red'}
          icon="✓"
        />
        <MetricCard
          title="Uptime"
          value={metrics.system.uptime}
          subtitle="Current session"
          color="blue"
          icon="⏱️"
        />
        <MetricCard
          title="Memory Usage"
          value={`${metrics.performance.memoryUsageMB}MB`}
          subtitle={`${metrics.performance.memoryPercentage}% of ${metrics.performance.memoryTotalMB}MB`}
          color={metrics.performance.memoryPercentage > 80 ? 'yellow' : 'green'}
          icon="💾"
        />
      </div>

      {/* Users */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Total Users"
            value={metrics.users.total.toLocaleString()}
            color="purple"
          />
          <MetricCard
            title="Active (24h)"
            value={metrics.users.active24h.toLocaleString()}
            subtitle={`${Math.round((metrics.users.active24h / metrics.users.total) * 100)}% of total`}
            color="blue"
          />
          <MetricCard
            title="New Today"
            value={metrics.users.newToday.toLocaleString()}
            color="green"
          />
        </div>
      </div>

      {/* Conversations */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Conversations</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Sessions"
            value={metrics.conversations.totalSessions.toLocaleString()}
            color="teal"
          />
          <MetricCard
            title="Active Today"
            value={metrics.conversations.activeToday.toLocaleString()}
            color="green"
          />
          <MetricCard
            title="Total Messages"
            value={metrics.conversations.totalMessages.toLocaleString()}
            color="indigo"
          />
          <MetricCard
            title="Messages Today"
            value={metrics.conversations.messagesToday.toLocaleString()}
            color="blue"
          />
        </div>
      </div>

      {/* Subscriptions & Organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Subscriptions</h3>
          <div className="space-y-4">
            <MetricCard
              title="Active Subscriptions"
              value={metrics.subscriptions.active.toLocaleString()}
              color="green"
            />
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${metrics.subscriptions.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color="green"
              icon="💰"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Organizations</h3>
          <div className="space-y-4">
            <MetricCard
              title="Total Organizations"
              value={metrics.organizations.total.toLocaleString()}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(metrics.system.timestamp).toLocaleTimeString()}
        <br />
        <span className="text-xs">(Auto-refreshes every 30 seconds)</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'teal' | 'indigo';
  icon?: string;
}

function MetricCard({ title, value, subtitle, color, icon }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    teal: 'bg-teal-50 border-teal-200 text-teal-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {icon && <span className="mr-2">{icon}</span>}
            {value}
          </p>
          {subtitle && (
            <p className="text-xs opacity-60 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Add to Admin Dashboard

**File**: `packages/web/src/app/admin/page.tsx`

Add the monitoring dashboard component:

```typescript
import MonitoringDashboard from '../../components/MonitoringDashboard';

export default function AdminOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Monitoring</h1>
      <MonitoringDashboard />
    </div>
  );
}
```

### 4. External Monitoring (UptimeRobot)

For 24/7 monitoring and alerts, set up UptimeRobot:

#### Step 1: Create UptimeRobot Account
1. Go to https://uptimerobot.com
2. Sign up for free account (50 monitors included)
3. Verify email

#### Step 2: Add Monitors

**API Health Check**
- Type: HTTP(s)
- URL: `https://api.mychristiancounselor.com/health`
- Monitoring Interval: 5 minutes
- Alert When Down: Yes

**Web App**
- Type: HTTP(s)
- URL: `https://app.mychristiancounselor.com`
- Monitoring Interval: 5 minutes
- Alert When Down: Yes

**Database Connectivity**
- Type: Port
- Host: `mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com`
- Port: 5432
- Monitoring Interval: 5 minutes
- Alert When Down: Yes

#### Step 3: Configure Alerts

**Email Alerts**:
- Add your email
- Send alert when monitor goes down
- Send alert when monitor comes back up

**Slack Integration** (Optional):
1. Create Slack webhook
2. Add to UptimeRobot
3. Receive instant notifications

**SMS Alerts** (Paid):
- Add phone number
- Critical monitors only

#### Step 4: Status Page (Optional)

Create public status page:
1. Enable status page in UptimeRobot
2. Custom domain: `status.mychristiancounselor.com`
3. Show/hide specific monitors
4. Customize branding

### 5. Application Performance Monitoring (APM)

For deeper insights, consider adding APM:

**New Relic** (Recommended):
```bash
npm install newrelic

# Create newrelic.js config
```

**Sentry** (Error Tracking):
```bash
npm install @sentry/node @sentry/nextjs

# Configure Sentry in app
```

**DataDog** (Full Stack):
- Application monitoring
- Log aggregation
- Infrastructure monitoring

### 6. Logging & Alerting

**Winston Logging** (Already Configured):
- Error logs
- Warning logs
- Info logs

**Log Aggregation**:
- Send logs to CloudWatch
- Or use LogDNA / Papertrail
- Set up alerts for error spikes

### 7. Metrics to Add Later

**Response Time Tracking**:
```typescript
// Add middleware to track response times
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Store in database or metrics service
    logger.info(`${req.method} ${req.path} - ${duration}ms`);
  });

  next();
});
```

**Slow Query Logging**:
```typescript
// Prisma middleware for slow queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  if (after - before > 1000) { // > 1 second
    logger.warn(`Slow query: ${params.model}.${params.action} - ${after - before}ms`);
  }

  return result;
});
```

## Deployment Checklist

- [ ] Deploy health endpoint to production
- [ ] Add MonitoringDashboard component to admin
- [ ] Create UptimeRobot account
- [ ] Set up monitors for API, Web, Database
- [ ] Configure email alerts
- [ ] Test alerts (pause monitor, verify email received)
- [ ] Document monitoring setup for team
- [ ] Set up weekly uptime reports

## Monitoring Best Practices

1. **Set Alert Thresholds**
   - Uptime < 99.9%
   - Response time > 2 seconds
   - Error rate > 1%
   - Memory usage > 80%

2. **Response Procedures**
   - Document who responds to alerts
   - Escalation path (15 min, 30 min, 1 hour)
   - Incident response checklist

3. **Regular Reviews**
   - Weekly: Review metrics and trends
   - Monthly: Analyze incidents and improvements
   - Quarterly: Capacity planning

4. **Backup Monitoring**
   - Multiple monitoring services
   - Different notification channels
   - Test failover procedures

## Cost Estimate

- UptimeRobot Free: $0 (50 monitors, 5-min intervals)
- UptimeRobot Pro: $7/month (unlimited monitors, 1-min intervals, SMS alerts)
- New Relic: $0-$99/month (depending on usage)
- Sentry: $0-$29/month (depending on events)

**Total**: $0-$150/month for comprehensive monitoring

## Notes

- Health endpoint is public (no auth) for external monitoring
- Metrics endpoint requires platform admin authentication
- Metrics refresh every 30 seconds in admin dashboard
- UptimeRobot checks every 5 minutes (free tier)
- Store historical metrics for trend analysis (future enhancement)
