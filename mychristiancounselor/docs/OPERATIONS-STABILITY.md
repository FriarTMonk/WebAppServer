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

🔲 **Enhanced Health Checks** (PRIORITY 1)
- Add `/health/ready` endpoint that checks:
  - Database connectivity
  - Redis connectivity
  - Critical environment variables loaded
  - Application fully initialized
- Update AWS Lightsail health check path to `/health/ready`

🔲 **Startup Logging Enhancement** (PRIORITY 2)
- Add explicit log messages for each startup phase:
  - "Database connection established"
  - "Redis connection established"
  - "All routes mapped"
  - "Application successfully started"
  - "Listening on port 3697"
- Makes partial startup failures immediately visible

🔲 **External Monitoring** (PRIORITY 3)
- Set up UptimeRobot or similar service
- Monitor actual API endpoints (not just `/health/live`)
- Check every 5 minutes
- Alert via email/SMS when down
- Track uptime metrics

🔲 **Sentry Alerts Configuration** (PRIORITY 4)
- Add startup event logging
- Add custom context for all errors
- Set up alerts for high error rates
- Alert on application startup failures
- Alert on database/Redis connection failures

🔲 **Verify Stability** (PRIORITY 5)
- Monitor for 30+ days with 1 container
- Confirm zero unexpected outages
- Confirm all deployments successful
- Confirm issues detected within 5 minutes
- Document any remaining issues

🔲 **Scale to 2 Containers** (FINAL STEP - ONLY AFTER STABILITY PROVEN)
- Do NOT scale until 1 container is 100% stable for 30+ days
- Scaling with broken containers = 2x the failures
- Once stable, scaling provides:
  - Zero-downtime deployments
  - Automatic failover
  - Load balancing
- Cost: ~$20/month additional for API service

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

**Solutions Needed (In Priority Order):**

🔲 **1. Enhanced Health Checks**
- Implement `/health/ready` endpoint (see Priority 1 above)
- Update AWS Lightsail to use `/health/ready` instead of `/health/live`

🔲 **2. Startup Logging**
- Add explicit log messages for each startup phase
- Makes partial startup failures immediately visible

🔲 **3. External Monitoring (UptimeRobot or similar)**
- Monitor actual API endpoints (not just `/health/live`)
- Check every 5 minutes
- Alert via email/SMS when down
- Track uptime metrics

🔲 **4. Enhance Sentry Integration**
- Add startup event logging
- Add custom context for all errors
- Set up alerts for:
  - High error rates
  - Application startup failures
  - Database connection failures
  - Redis connection failures

🔲 **5. CloudWatch Logs Monitoring (Optional)**
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

### Phase 1: Fix Deployment Process (✅ COMPLETED)
✅ Fix deployment script to update JSON configs automatically
✅ Add deployment verification script
✅ Add jq to prerequisites
✅ Create this operations document

### Phase 2: Make One Container 100% Stable (CURRENT FOCUS)
🔲 **Priority 1: Enhanced Health Checks**
  - Implement `/health/ready` endpoint
  - Verify database, Redis, env vars, full startup
  - Update AWS Lightsail health check path

🔲 **Priority 2: Startup Logging**
  - Add explicit log messages for each startup phase
  - Make partial startup failures visible immediately

🔲 **Priority 3: External Monitoring**
  - Set up UptimeRobot or similar
  - Monitor actual API endpoints
  - Configure SMS/email alerts

🔲 **Priority 4: Sentry Alerts**
  - Configure proper error alerting
  - Add startup event logging
  - Set up custom error contexts

🔲 **Priority 5: Verify Stability**
  - Monitor for 30+ days with 1 container
  - Confirm zero unexpected outages
  - Document any remaining issues

### Phase 3: Scale for Zero-Downtime (FUTURE - AFTER STABILITY PROVEN)
🔲 Scale API to 2 containers (ONLY after 30+ days of proven stability)
🔲 Set up CloudWatch Logs monitoring (optional)
🔲 Create monitoring dashboard
🔲 Document runbook for common issues

**IMPORTANT:** Do not proceed to Phase 3 until Phase 2 shows 30+ days of 100% stability. Scaling with unstable containers just means 2x the failures.

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

### Phase 2: Stabilization (Immediate)
| Improvement | Monthly Cost | Impact |
|-------------|-------------|---------|
| Enhanced health checks | $0 | Critical - detect failures |
| Startup logging | $0 | Critical - diagnose issues |
| UptimeRobot Pro | $7 | High - external monitoring |
| Sentry alerts | $0 (included) | High - catch errors faster |
| **Phase 2 Total** | **$7/month** | **Critical for stability** |

### Phase 3: Scaling (After 30+ days stability)
| Improvement | Monthly Cost | Impact |
|-------------|-------------|---------|
| Scale API to 2 containers | ~$20 | High - zero downtime |
| CloudWatch alerts | ~$1 | Medium - log patterns |
| **Phase 3 Total** | **~$21/month** | **Operational excellence** |

**Total Investment:** $28/month for full production-grade stability
**Current Investment:** $7/month to fix root causes first

## Success Metrics

We'll know we've succeeded when:
- Zero unexpected outages for 30 days
- All deployments pass verification checks
- Issues detected within 5 minutes (vs 9+ hours)
- Time to recovery < 10 minutes
- No manual intervention needed for routine deployments

## Next Steps

### Immediate (Phase 2 - Stabilization)
1. Review and approve this operations plan
2. Implement enhanced `/health/ready` endpoint
3. Add comprehensive startup logging
4. Set up UptimeRobot external monitoring
5. Configure Sentry alerts properly
6. Monitor stability for 30+ days

### Future (Phase 3 - After Stability Proven)
7. Review 30-day stability metrics
8. If stable, scale to 2 containers
9. Set up CloudWatch log monitoring (optional)
10. Create operational dashboard

**DO NOT skip to Phase 3 without completing Phase 2 and proving stability.**
