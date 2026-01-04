# Operations & Stability Plan

## Overview
This document addresses the recurring outage issues and establishes procedures to prevent them.

## The Four Core Questions

### 1. How do we make sure we are stable?

**Root Causes of Instability:**
- **Partial Startup Failures** - Container passes health checks but application never fully initializes
- **Scale=1 Configuration** - Single container means zero redundancy
- **Missing Environment Variables** - New code requiring env vars deployed without config updates
- **Insufficient Health Checks** - AWS health endpoint checks pass but application is broken

**Solutions Implemented:**

✅ **Automatic Config Updates** (Completed)
- Deploy script now captures new image tags and updates JSON configs automatically
- Prevents deploying stale code
- Ensures environment variables match code requirements
- Creates backups before modifying configs

✅ **Deployment Verification** (Completed)
- `scripts/verify-deployment.sh` runs automatically after each deployment
- Checks:
  - Health endpoint responds correctly
  - CORS headers present
  - Correct image version deployed
  - Environment variables match expectations
- Deployment fails if verification doesn't pass

**Solutions Needed:**

🔲 **Scale to 2 Containers**
- Eliminates single point of failure
- Enables zero-downtime deployments
- AWS automatically load balances and handles failures
- Cost: ~$20/month additional for API service

🔲 **Enhanced Health Checks**
- Add `/health/ready` endpoint that checks:
  - Database connectivity
  - Redis connectivity
  - Critical environment variables loaded
  - Application fully initialized
- Update AWS Lightsail health check path to `/health/ready`

🔲 **Startup Logging Enhancement**
- Add explicit log messages for each startup phase:
  - "Database connection established"
  - "Redis connection established"
  - "All routes mapped"
  - "Application successfully started"
  - "Listening on port 3697"
- Makes partial startup failures immediately visible

### 2. Why do we continue to experience these outages?

**Pattern Identified:**
1. Deploy script pushes new images with version tags (e.g., `.165`)
2. Deploy script deploys using old JSON config with old tags (e.g., `.162`)
3. Old code deploys instead of new code
4. Old code missing required environment variables or has bugs
5. Container starts but application partially fails
6. AWS health check at `/health/live` still passes (it's too simple)
7. Application appears healthy but doesn't work correctly
8. Eventually fails completely

**Example from Latest Outage:**
- Built API with token budget fix (image `.165`)
- Deployed using old config (image `.162` without `AI_MAX_TOKENS_*` vars)
- API started but never reached "Listening on port 3697"
- Health check passed for 9+ hours while app was broken
- Eventually failed completely with 503 errors

**Why This Kept Happening:**
- Manual JSON updates were error-prone and easy to forget
- No verification step to catch mistakes
- Health checks too simple to detect partial failures
- Scale=1 means no redundancy to cover failures

**Now Fixed:**
- Automatic JSON updates eliminate manual step
- Verification script catches deployment mistakes
- Still need: Better health checks and scale increase

### 3. What isn't the system detecting the outages?

**Current Monitoring Gaps:**

**AWS Lightsail Health Checks:**
- Only checks `/health/live` endpoint
- Endpoint returns 200 if Node.js process is running
- Does NOT verify:
  - Application fully initialized
  - Database accessible
  - Redis accessible
  - Critical env vars loaded
  - Routes actually working

**Sentry:**
- Configured but not fully utilized
- Should be monitoring:
  - Application errors
  - Startup failures
  - Request failures
  - Performance degradation

**Missing External Monitoring:**
- No external health check service
- No alerts when API becomes unreachable
- No monitoring of actual API endpoints (only health endpoint)

**Solutions Needed:**

🔲 **Enhance Sentry Integration**
- Add startup event logging
- Add custom context for all errors
- Set up alerts for:
  - High error rates
  - Application startup failures
  - Database connection failures
  - Redis connection failures

🔲 **External Monitoring (UptimeRobot or similar)**
- Monitor actual API endpoints (not just `/health/live`)
- Check every 5 minutes
- Alert via email/SMS when down
- Track uptime metrics

🔲 **CloudWatch Logs Monitoring**
- Set up log group filters for error patterns
- Alert on specific patterns:
  - "Starting Nest application" without corresponding "Listening on port"
  - Database connection errors
  - Redis connection errors
  - Uncaught exceptions

### 4. Why are deployment procedures failing?

**Root Cause:**
The deployment script had a critical gap:
1. Push new images → generates new tags (`.165`)
2. Deploy using JSON file → but JSON still has old tag (`.162`)
3. Result: Old code deployed instead of new code

**Contributing Factors:**
- Manual JSON updates required
- No verification of deployed version
- No verification of environment variables
- Easy to forget manual steps under time pressure

**Now Fixed:**
- Script automatically captures new image tags
- Script updates JSON configs before deployment
- Verification script checks deployed version
- Verification script checks environment variables
- Deployment fails if verification doesn't pass

**Process Improvements Made:**

✅ **Prerequisites Check**
- Added `jq` to required tools
- Validates tools before starting deployment

✅ **Automatic Config Management**
- Captures image tags from push output
- Updates JSON configs automatically
- Creates backups before modifying

✅ **Verification**
- Runs automatically after deployment
- Checks version, env vars, health, CORS
- Fails deployment if checks don't pass

✅ **Better Error Messages**
- Clear output showing which image was pushed
- Clear output showing which image is being deployed
- Verification results clearly displayed

## Implementation Priority

### Immediate (Completed)
✅ Fix deployment script to update JSON configs automatically
✅ Add deployment verification script
✅ Add jq to prerequisites
✅ Create this operations document

### Short Term (This Week)
🔲 Scale API to 2 containers
🔲 Enhance health checks with `/health/ready` endpoint
🔲 Set up external monitoring (UptimeRobot)
🔲 Configure Sentry alerts properly

### Medium Term (This Month)
🔲 Set up CloudWatch Logs monitoring
🔲 Add comprehensive startup logging
🔲 Document runbook for common issues
🔲 Create monitoring dashboard

## Deployment Checklist

Use this checklist for every deployment to ensure nothing is missed:

**Pre-Deployment:**
- [ ] All tests passing locally
- [ ] Environment variables documented if any changed
- [ ] Prisma migrations applied if schema changed

**During Deployment:**
- [ ] Run `docs/DEPLOYMENT-WORKFLOW.md` procedure
- [ ] Verify script shows correct image tags being deployed
- [ ] Wait for "Deployment Complete" message
- [ ] Verify automated verification passes

**Post-Deployment:**
- [ ] Check logs for "Application successfully started"
- [ ] Test critical user flows manually
- [ ] Monitor Sentry for new errors
- [ ] Check external monitoring dashboard

**If Issues Occur:**
- [ ] Check logs for startup failures
- [ ] Verify environment variables match expectations
- [ ] Check deployed image version matches build
- [ ] Consider rolling back to previous version
- [ ] Document issue for root cause analysis

## Rollback Procedure

If deployment fails verification or issues occur:

```bash
# 1. Get previous deployment version
aws lightsail get-container-services \
  --service-name api \
  --region us-east-2 \
  --query 'containerServices[0].currentDeployment.version'

# 2. Update JSON config with previous image tag
# Edit lightsail-api-deployment.json
# Change image: ":api.soft-launch-32.XXX" to previous version

# 3. Redeploy
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2

# 4. Verify rollback
bash scripts/verify-deployment.sh
```

## Monitoring & Alerts

### Current State
- **AWS Lightsail**: Basic health checks only
- **Sentry**: Configured but minimal alerting
- **External**: None

### Target State
- **AWS Lightsail**: Enhanced `/health/ready` checks
- **Sentry**: Full error tracking with custom contexts and alerts
- **UptimeRobot**: External monitoring with SMS/email alerts
- **CloudWatch**: Log pattern matching with alerts

## Cost Analysis

| Improvement | Monthly Cost | Impact |
|-------------|-------------|---------|
| Scale API to 2 containers | ~$20 | High - eliminates downtime |
| UptimeRobot Pro | $7 | High - external monitoring |
| Enhanced logging | $0 | High - better debugging |
| Sentry alerts | $0 (included) | Medium - catch errors faster |
| CloudWatch alerts | ~$1 | Medium - catch log patterns |
| **Total** | **~$28/month** | **Major stability improvement** |

## Success Metrics

We'll know we've succeeded when:
- Zero unexpected outages for 30 days
- All deployments pass verification checks
- Issues detected within 5 minutes (vs 9+ hours)
- Time to recovery < 10 minutes
- No manual intervention needed for routine deployments

## Next Steps

1. Review this document
2. Approve scaling to 2 containers
3. Implement enhanced health checks
4. Set up external monitoring
5. Configure Sentry alerts
6. Test full deployment cycle with new procedures
