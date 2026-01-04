# Sentry Alerts Configuration

## Overview
This document explains how to configure Sentry alerts to detect application issues immediately.

## Prerequisites
- Sentry account with project configured
- SENTRY_DSN environment variable set in production
- Access to Sentry project settings

## Alert Rules to Configure

### 1. High Error Rate Alert
**Purpose:** Detect when application is experiencing many errors

**Configuration:**
1. Go to https://sentry.io/organizations/[your-org]/alerts/rules/
2. Click "Create Alert Rule"
3. Select "Issues"
4. Configure:
   - **When**: "The issue is seen"
   - **Conditions**: "more than 10 times in 5 minutes"
   - **Environment**: "production"
   - **Actions**: Send notification to Email/Slack

### 2. Fatal Error Alert
**Purpose:** Detect application startup failures and critical errors

**Configuration:**
1. Create new alert rule
2. Configure:
   - **When**: "The issue is seen"
   - **Conditions**: "AND level equals fatal"
   - **Environment**: "production"
   - **Actions**: Send notification immediately (high priority)

### 3. Startup Failure Alert
**Purpose:** Detect when application fails to start

**Configuration:**
1. Create new alert rule
2. Configure:
   - **When**: "The issue is seen"
   - **Conditions**: "AND tags match startup=failed"
   - **Environment**: "production"
   - **Actions**: Send notification immediately (critical priority)

### 4. Database Connection Failure Alert
**Purpose**: Detect database connectivity issues

**Configuration:**
1. Create new alert rule
2. Configure:
   - **When**: "The issue is seen"
   - **Conditions**: "AND message contains Database"
   - **Environment**: "production"
   - **Actions**: Send notification to Email/Slack

### 5. Redis Connection Failure Alert
**Purpose:** Detect Redis connectivity issues

**Configuration:**
1. Create new alert rule
2. Configure:
   - **When**: "The issue is seen"
   - **Conditions**: "AND message contains Redis"
   - **Environment**: "production"
   - **Actions**: Send notification to Email/Slack

## Notification Channels

### Email Notifications
1. Go to Settings → Integrations → Email
2. Add email addresses for:
   - Primary developer
   - On-call engineer
   - Operations team

### Slack Integration (Recommended)
1. Go to Settings → Integrations → Slack
2. Click "Add Workspace"
3. Authorize Sentry for your Slack workspace
4. Configure channel for alerts (e.g., #production-alerts)
5. Set notification preferences

### SMS/Phone (Optional but Recommended)
1. Use PagerDuty integration for SMS alerts
2. Go to Settings → Integrations → PagerDuty
3. Connect your PagerDuty account
4. Configure escalation policies

## Testing Alerts

### Test High Error Rate Alert
```typescript
// Temporarily add to any endpoint
for (let i = 0; i < 15; i++) {
  throw new Error('Test alert - please ignore');
}
```

### Test Startup Failure Alert
```bash
# Temporarily break DATABASE_URL in .env
# Restart API and verify alert is sent
```

### Test Database Alert
```bash
# Stop database temporarily
docker stop your-postgres-container
# Verify alert is sent when health check fails
```

## Alert Priority Levels

**Critical (Immediate Response Required):**
- Startup failures (tag: startup=failed)
- Fatal errors (level: fatal)
- Database connection failures

**High (Response within 15 minutes):**
- High error rate (>10 errors in 5 minutes)
- Redis connection failures

**Medium (Response within 1 hour):**
- Individual errors
- Performance degradation

## Best Practices

1. **Don't Over-Alert**: Too many alerts lead to alert fatigue
2. **Test Regularly**: Test alerts quarterly to ensure they work
3. **Document Responses**: Create runbooks for common alerts
4. **Review Weekly**: Review Sentry dashboard weekly for trends
5. **Adjust Thresholds**: Tune alert thresholds based on actual usage

## Current Startup Logging

The application now logs each startup phase explicitly:

```
🚀 Starting MyChristianCounselor API...
   Node.js version: v20.x.x
   Environment: production
   Timestamp: 2026-01-04T...

📦 Creating NestJS application...
✅ NestJS application created
📝 Initializing Winston logger...
✅ Winston logger initialized
🗄️  Testing database connection...
✅ Database connection established
🔴 Testing Redis connection...
✅ Redis connection established
🔒 Configuring HTTPS redirect...
✅ HTTPS redirect configured
🛡️  Configuring security headers...
✅ Security headers configured
🌐 Configuring CORS...
✅ CORS enabled for origins: ...
🔧 Configuring global exception filter...
✅ Global exception filter configured
✔️  Enabling request validation...
✅ Request validation enabled
📚 Setting up Swagger API documentation...
✅ Swagger documentation configured
🎧 Starting server on port 3697...

═══════════════════════════════════════════════════════
✅ APPLICATION SUCCESSFULLY STARTED
═══════════════════════════════════════════════════════
🚀 API server listening on port 3697
...
```

**If ANY of these steps fail, the application will NOT reach "APPLICATION SUCCESSFULLY STARTED"**

This makes partial startup failures immediately visible in logs.

## Health Check Endpoints

### /health/live
- Simple liveness check
- Returns 200 if Node.js process is running
- Used by AWS to determine if container should be restarted

### /health/ready
- Comprehensive readiness check
- Validates:
  - Database connectivity
  - Redis connectivity
  - Environment variables loaded
- Returns 503 if ANY check fails
- Used by AWS to determine if service should receive traffic

**IMPORTANT:** Always use `/health/ready` for load balancer health checks, not `/health/live`

## Next Steps

1. Configure all alert rules in Sentry dashboard
2. Set up Slack integration for instant notifications
3. Test each alert rule to verify it works
4. Document response procedures for each alert type
5. Review alerts weekly and adjust thresholds as needed
