# Database Migration Strategy

## Overview

This document outlines the production database migration process for MyChristianCounselor. Proper migration procedures ensure zero data loss and minimal downtime.

---

## Production Migration Workflow

### Pre-Migration Checklist

- [ ] All migrations tested in staging environment
- [ ] Database backup completed and verified
- [ ] Rollback plan prepared and tested
- [ ] Maintenance window scheduled (if required)
- [ ] Team notified of deployment timeline
- [ ] Migration script reviewed by at least one other developer

### Migration Steps

#### 1. Backup Database

```bash
# Automated AWS RDS backup (recommended)
aws rds create-db-snapshot \
  --db-instance-identifier mychristiancounselor-prod \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)

# Or manual PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM _prisma_migrations;"
```

**Important:** Store backup in secure location (AWS S3 with versioning enabled)

#### 2. Enable Maintenance Mode (Optional)

For breaking schema changes that require downtime:

```bash
# Set environment variable to enable maintenance mode
export MAINTENANCE_MODE=true

# Or use AWS ECS to update task definition
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --task-definition api-maintenance:1
```

Show maintenance page to users (503 Service Temporarily Unavailable)

#### 3. Run Prisma Migrations

```bash
# Navigate to API directory
cd packages/api

# Review pending migrations
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy

# Verify migrations succeeded
npx prisma migrate status
```

**Expected output:**
```
Database schema is up to date!
```

#### 4. Run Database Seed (If Needed)

Only run for fresh databases or when new seed data is required:

```bash
npm run seed
```

#### 5. Deploy New Application Code

```bash
# Build Docker image
docker build -t mychristiancounselor-api:latest -f packages/api/Dockerfile .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag mychristiancounselor-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:latest

# Update ECS service
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --force-new-deployment
```

#### 6. Smoke Test Critical Paths

```bash
# Health check
curl https://api.mychristiancounselor.online/health

# User registration (create test user)
curl -X POST https://api.mychristiancounselor.online/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST https://api.mychristiancounselor.online/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Create counseling session (with auth token)
curl -X POST https://api.mychristiancounselor.online/counsel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

#### 7. Monitor Error Rates

```bash
# Check Sentry for errors
# Check CloudWatch logs
aws logs tail /aws/ecs/mychristiancounselor-api --follow

# Check database connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'mychristiancounselor_production';"
```

#### 8. Disable Maintenance Mode

```bash
unset MAINTENANCE_MODE

# Or revert to normal task definition
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --task-definition api:latest
```

---

## Rollback Procedures

### When to Rollback

Rollback if:
- Migration fails with errors
- Application fails to start after migration
- Critical functionality broken
- Error rate exceeds 5%
- Database performance degrades significantly

### Rollback Steps

#### Option 1: Revert Migration (Preferred)

```bash
# Check migration history
npx prisma migrate status

# If last migration is marked as failed or rolled back:
# 1. Fix the migration SQL
# 2. Mark migration as rolled back in _prisma_migrations table
psql $DATABASE_URL -c "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = '<migration-name>';"

# 3. Create new corrective migration
npx prisma migrate dev --name fix_previous_migration
npx prisma migrate deploy
```

#### Option 2: Restore from Backup (Last Resort)

**⚠️ WARNING: This will lose all data created after backup**

```bash
# Stop application to prevent new writes
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --desired-count 0

# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mychristiancounselor-prod-restored \
  --db-snapshot-identifier pre-migration-20240101-120000

# Or restore from pg_dump
psql $DATABASE_URL < backup-20240101-120000.sql

# Restart application with previous code version
docker tag <account-id>.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:previous-stable latest
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --force-new-deployment \
  --desired-count 2
```

#### Option 3: Deploy Previous Application Version

If migration succeeded but application code has issues:

```bash
# Rollback to previous Docker image
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:previous-stable

# Update ECS service
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --task-definition api:previous-version
```

---

## Migration Best Practices

### Development Workflow

1. **Create migration in development:**
   ```bash
   npx prisma migrate dev --name descriptive_migration_name
   ```

2. **Test migration locally:**
   ```bash
   # Apply and test
   npm run test
   ```

3. **Commit migration files:**
   ```bash
   git add prisma/migrations/
   git commit -m "feat: add migration for new feature"
   ```

4. **Test in staging:**
   ```bash
   # Deploy to staging environment
   npx prisma migrate deploy
   ```

5. **Deploy to production** (follow workflow above)

### Schema Change Guidelines

#### Safe Changes (No Downtime Required)
- Adding new tables
- Adding nullable columns
- Adding indexes (use `CREATE INDEX CONCURRENTLY`)
- Renaming columns (with dual-write period)
- Adding enum values (PostgreSQL 12+)

#### Risky Changes (Require Careful Planning)
- Removing columns (requires multi-phase deployment)
- Changing column types
- Adding non-nullable columns (add as nullable first, then backfill, then make non-nullable)
- Removing tables (requires data migration first)
- Foreign key constraints (can lock tables)

### Multi-Phase Migrations

For breaking changes, use multi-phase approach:

#### Phase 1: Additive Changes
```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  // NEW: Add new column as nullable
  emailVerified Boolean? @default(false)
}
```

#### Phase 2: Backfill Data
```sql
-- Run in separate migration
UPDATE "User" SET "emailVerified" = true WHERE "verificationToken" IS NULL;
```

#### Phase 3: Make Non-Nullable
```prisma
model User {
  id            String  @id @default(uuid())
  email         String  @unique
  emailVerified Boolean @default(false) // Now required
}
```

---

## Emergency Contacts

### Database Issues
- **Primary:** Platform Admin (latuck369@gmail.com)
- **Backup:** AWS Support (if RDS issues)

### Application Issues
- **Sentry Alerts:** Check https://sentry.io
- **CloudWatch Logs:** Check AWS Console

---

## Maintenance Windows

### Recommended Schedule
- **Day:** Tuesday or Wednesday (mid-week, non-holiday)
- **Time:** 2:00 AM - 4:00 AM EST (lowest traffic)
- **Duration:** Maximum 2 hours
- **Frequency:** As needed (ideally monthly for non-critical updates)

### Notification Timeline
- **7 days before:** Announce maintenance window
- **24 hours before:** Reminder notification
- **1 hour before:** Final warning
- **During maintenance:** Status page updates every 15 minutes
- **After completion:** Success notification with release notes

---

## Monitoring Post-Migration

Monitor these metrics for 24 hours after migration:

### Critical Metrics
- **Error rate:** Should be < 1%
- **Response time:** Should be < 500ms (p95)
- **Database connections:** Should not exceed 80% of pool
- **CPU usage:** Should be < 70%
- **Memory usage:** Should be < 85%

### Tools
- **Sentry:** Real-time error tracking
- **CloudWatch:** Infrastructure metrics
- **DataDog/New Relic:** APM (if configured)
- **PgHero:** Database performance monitoring

### Alert Thresholds
- Error rate > 5% → Page on-call engineer
- Response time > 2s → Investigate immediately
- Database connections > 90% → Scale up connection pool
- Any migration marked as "failed" → Rollback immediately

---

## Testing Migrations

### Local Testing

```bash
# Create test database
createdb mychristiancounselor_test

# Apply migrations to test database
DATABASE_URL="postgresql://localhost:5432/mychristiancounselor_test" npx prisma migrate deploy

# Run full test suite
npm run test

# Drop test database
dropdb mychristiancounselor_test
```

### Staging Testing

```bash
# Staging environment should mirror production
# Test with production-like data volume
# Run load tests after migration

# Example load test
npx artillery run load-test.yml
```

---

## Pre-Deployment Checklist Script

Create this script as `scripts/pre-migration-check.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Pre-migration checks..."

# Check Prisma schema is valid
npx prisma validate

# Check for pending migrations
PENDING=$(npx prisma migrate status | grep "pending" || echo "")
if [ -n "$PENDING" ]; then
  echo "✅ Found pending migrations"
else
  echo "ℹ️  No pending migrations"
fi

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;" > /dev/null
echo "✅ Database connection successful"

# Check all tests pass
npm run test
echo "✅ All tests passing"

# Check TypeScript compilation
npx tsc --noEmit
echo "✅ TypeScript compilation successful"

# Verify backup exists
echo "⚠️  Ensure you have created a backup before proceeding!"
read -p "Have you created a backup? (yes/no): " backup_confirm
if [ "$backup_confirm" != "yes" ]; then
  echo "❌ Please create a backup first"
  exit 1
fi

echo "✅ Pre-migration checks complete!"
echo "Ready to run: npx prisma migrate deploy"
```

Make it executable:
```bash
chmod +x scripts/pre-migration-check.sh
```

---

## Summary

**Key Principles:**
1. ✅ **Always backup before migrating**
2. ✅ **Test in staging first**
3. ✅ **Have a rollback plan**
4. ✅ **Monitor after deployment**
5. ✅ **Use multi-phase migrations for breaking changes**
6. ✅ **Communicate with team and users**

**For Production Deployments:**
- Follow the 8-step workflow
- Never skip the backup step
- Always test smoke tests
- Monitor for at least 24 hours

**For Emergencies:**
- Stay calm
- Check Sentry and CloudWatch logs
- Follow rollback procedures
- Document what happened for post-mortem
