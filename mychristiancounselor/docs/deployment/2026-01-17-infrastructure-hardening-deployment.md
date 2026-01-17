# Infrastructure Hardening Deployment Runbook
**Date:** 2026-01-17
**Author:** Claude (Infrastructure Hardening Implementation)
**Status:** Ready for Production Deployment

## Overview

This deployment implements three critical infrastructure improvements:

1. **Rate Limiting** - Re-enable with production limits (100 req/min default, 20 req/min auth, 50 req/min webhooks)
2. **Redis Eviction Policy** - Change from `allkeys-lru` to `noeviction` to prevent BullMQ job data loss
3. **API Versioning** - Add `/v1/` prefix to all API endpoints for backward compatibility

### Components Affected
- **API Container:** Rate limiting configuration, Redis configuration, API versioning
- **Web Container:** Updated API client to use `/v1/` prefix
- **Redis Container:** Eviction policy, memory limits, AOF persistence

### Expected Downtime
- **API Service:** 5-10 minutes (Lightsail container deployment time)
- **Web Service:** 5-10 minutes (Lightsail container deployment time)
- **Total:** ~15-20 minutes if deployed sequentially

### Rollback Complexity
- **Low:** Can rollback to previous container images via Lightsail console
- **Risk:** Redis data persisted via AOF will remain (not destructive)

---

## Pre-Deployment Checklist

### 1. Code Verification
- [ ] All tests pass locally (`npx nx run-many --target=test --all`)
- [ ] API builds successfully (`npx nx build api`)
- [ ] Web builds successfully with production env vars
- [ ] Git status is clean (all changes committed)
- [ ] Current branch: `master` (or feature branch ready for merge)

### 2. Environment Preparation
- [ ] AWS CLI configured with correct credentials
- [ ] Access to Lightsail console (for monitoring)
- [ ] Docker installed and running
- [ ] Terminal window ready for logs monitoring

### 3. Backup & Rollback Readiness
- [ ] Note current API container version: `_______________`
- [ ] Note current Web container version: `_______________`
- [ ] Database backup confirmed recent (within 24h)
- [ ] Redis AOF file backup available (if critical data exists)

### 4. Communication
- [ ] Stakeholders notified of deployment window
- [ ] Support team aware of maintenance
- [ ] Rollback decision maker identified: `_______________`

### 5. Monitoring Setup
- [ ] Sentry dashboard open: https://sentry.io/organizations/mychristiancounselor
- [ ] AWS Lightsail console open: https://lightsail.aws.amazon.com/
- [ ] Terminal ready for live log tailing

---

## Risk Assessment

### High Impact, Low Probability
- **Redis memory exhaustion:** If traffic spikes immediately after deployment with noeviction policy
  - **Mitigation:** Monitor Redis memory closely, have rollback ready
  - **Detection:** Redis logs will show "OOM command not allowed"
  - **Response:** Rollback Redis config or increase memory limit

### Medium Impact, Low Probability
- **Rate limiting too aggressive:** Legitimate users get throttled
  - **Mitigation:** Limits chosen based on current traffic patterns (100 req/min is generous)
  - **Detection:** Increased 429 responses, user complaints
  - **Response:** Adjust throttle limits and redeploy

### Low Impact, Medium Probability
- **API versioning breaks unknown client:** Client not using official web app
  - **Mitigation:** Health checks remain unversioned
  - **Detection:** 404 errors on unversioned paths
  - **Response:** Update client to use `/v1/` prefix

### Low Impact, Low Probability
- **Container deployment timeout:** Lightsail takes longer than usual
  - **Mitigation:** Standard Lightsail deployment process
  - **Detection:** Deployment status stuck in "Activating"
  - **Response:** Wait up to 15 minutes, then investigate logs

---

## Deployment Steps

### Phase 1: Build Web Container (with API versioning)

**Why first:** Web container needs to be built with correct `/v1` API URL baked in

**Step 1.1: Clear NX cache**
```bash
npx nx reset
```

**Expected output:** "Successfully deleted the cache directory"

**Step 1.2: Build Web with production environment variables**
```bash
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --skip-nx-cache
```

**Expected output:**
- Build completes without errors
- Output directory: `packages/web/.next/`

**Step 1.3: Verify API URL is baked in with /v1**
```bash
grep -r "api.mychristiancounselor.online/v1" packages/web/.next/ | head -3
```

**Expected output:** Should see production API URL with `/v1` in compiled JavaScript

**Critical:** If you see `localhost:3697` instead of production URL, STOP and rebuild with env vars

**Step 1.4: Build Docker image**
```bash
docker build -f Dockerfile.web-prebuilt -t web:infrastructure-hardening-v1 .
```

**Expected output:**
- Image builds successfully
- Final message: "Successfully tagged web:infrastructure-hardening-v1"

**Step 1.5: Push to Lightsail**
```bash
aws lightsail push-container-image \
  --service-name web \
  --label infrastructure-hardening-v1 \
  --image web:infrastructure-hardening-v1 \
  --region us-east-2
```

**Expected output:**
- Upload progress bars
- Final message with image reference: `:web.infrastructure-hardening-v1.XX`

**Step 1.6: Update lightsail-web-deployment.json**

Edit `lightsail-web-deployment.json` and update the image reference:
```json
{
  "containers": {
    "web": {
      "image": ":web.infrastructure-hardening-v1.XX"
    }
  }
}
```

Replace `XX` with the number from push output.

**Step 1.7: Deploy Web container**
```bash
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

**Expected output:**
- Deployment created with state: "ACTIVATING"
- Wait 5-10 minutes for deployment to complete

**Step 1.8: Monitor Web deployment**
```bash
# Check deployment status
aws lightsail get-container-services \
  --service-name web \
  --region us-east-2 \
  --query 'containerServices[0].state'

# Tail logs during deployment
aws lightsail get-container-log \
  --service-name web \
  --container-name web \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s) \
  --filter-pattern "" \
  --output text
```

**Expected status progression:**
1. "ACTIVATING" (5-10 minutes)
2. "RUNNING"

**If deployment fails:**
- Check logs for errors: `aws lightsail get-container-log --service-name web --container-name web`
- Common issues: Build errors, missing env vars, port conflicts
- Rollback: See "Rollback Procedures" section

---

### Phase 2: Deploy API Container (with rate limiting, Redis fix, API versioning)

**Why second:** API deployment includes Redis configuration changes

**Step 2.1: Verify lightsail-api-deployment.json**

Confirm the following changes are present:

```json
{
  "containers": {
    "redis": {
      "image": "redis:7-alpine",
      "command": [
        "redis-server",
        "--maxmemory", "256mb",
        "--maxmemory-policy", "noeviction",
        "--appendonly", "yes",
        "--appendfsync", "everysec"
      ],
      "ports": {
        "6379": "TCP"
      }
    },
    "api": {
      "image": ":api.infrastructure-hardening-v1.XX",
      "environment": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

**Critical checks:**
- [ ] Redis `maxmemory-policy`: "noeviction" (not "allkeys-lru")
- [ ] Redis `maxmemory`: "256mb" (increased from 128mb)
- [ ] Redis `appendonly`: "yes" (AOF persistence enabled)
- [ ] API `REDIS_HOST`: "localhost" (not "redis")

**Step 2.2: Build API**
```bash
npx nx build api
```

**Expected output:**
- Build completes without errors
- Output directory: `dist/packages/api/`

**Step 2.3: Build API Docker image**
```bash
docker build -f Dockerfile.api -t api:infrastructure-hardening-v1 .
```

**Expected output:**
- Image builds successfully
- Final message: "Successfully tagged api:infrastructure-hardening-v1"

**Step 2.4: Push to Lightsail**
```bash
aws lightsail push-container-image \
  --service-name api \
  --label infrastructure-hardening-v1 \
  --image api:infrastructure-hardening-v1 \
  --region us-east-2
```

**Expected output:**
- Upload progress bars
- Final message with image reference: `:api.infrastructure-hardening-v1.XX`

**Step 2.5: Update lightsail-api-deployment.json with image reference**

Update the API container image:
```json
{
  "containers": {
    "api": {
      "image": ":api.infrastructure-hardening-v1.XX"
    }
  }
}
```

**Step 2.6: Deploy API container**
```bash
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

**Expected output:**
- Deployment created with state: "ACTIVATING"
- Wait 5-10 minutes for deployment to complete

**Step 2.7: Monitor API deployment**
```bash
# Check deployment status
aws lightsail get-container-services \
  --service-name api \
  --region us-east-2 \
  --query 'containerServices[0].state'

# Tail API logs
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 \
  --start-time $(date -u -d '5 minutes ago' +%s) \
  --filter-pattern "" \
  --output text
```

**Expected status progression:**
1. "ACTIVATING" (5-10 minutes)
2. "RUNNING"

**Step 2.8: Watch for Redis connection**
```bash
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep -i "redis\|bullmq" | tail -20
```

**Expected output:**
- BullMQ connection established messages
- NO "ENOTFOUND redis" errors
- NO "connection refused" errors

**If deployment fails:**
- Check logs for errors
- Verify Redis container is running: `aws lightsail get-container-log --service-name api --container-name redis`
- Rollback: See "Rollback Procedures" section

---

## Post-Deployment Verification

### 1. Health Checks (Unversioned)

**Test unversioned health endpoints:**
```bash
# Main health check
curl -i https://api.mychristiancounselor.online/health

# Ready check
curl -i https://api.mychristiancounselor.online/health/ready

# Live check
curl -i https://api.mychristiancounselor.online/health/live
```

**Expected response:**
- Status: `200 OK`
- Body: `{"status":"ok","info":{...},"details":{...}}`
- NO redirect to /v1/health (should remain unversioned)

**If health checks fail:**
- CRITICAL: Lightsail health checks will fail, service will become unhealthy
- Rollback immediately (see "Rollback Procedures")

---

### 2. API Versioning

**Test versioned endpoints:**
```bash
# Test v1 prefix works
curl -i https://api.mychristiancounselor.online/v1/api

# Verify version header
curl -I https://api.mychristiancounselor.online/v1/api | grep X-API-Version
```

**Expected response:**
- Status: `200 OK`
- Header: `X-API-Version: 1`
- Body: "Hello World!" (or API response)

**Test old paths redirect or fail:**
```bash
# Old path without /v1 should return 404
curl -i https://api.mychristiancounselor.online/api
```

**Expected response:**
- Status: `404 Not Found`

**If versioning broken:**
- Health checks should still work (unversioned)
- Web app will fail to load data (API calls fail)
- Check Web container logs for 404 errors
- Verify Web build included `/v1` in API URL (see Step 1.3)

---

### 3. Rate Limiting

**Test rate limiting is active:**

**Scenario 1: Normal requests (should succeed)**
```bash
# Make 5 requests quickly
for i in {1..5}; do
  curl -w "\nStatus: %{http_code}\n" https://api.mychristiancounselor.online/v1/api
done
```

**Expected output:**
- All 5 requests: `Status: 200`
- Response time: < 500ms each

**Scenario 2: Burst requests (should throttle after limit)**
```bash
# Make 110 requests quickly (exceed 100/min limit)
for i in {1..110}; do
  curl -s -w "Request $i: %{http_code}\n" https://api.mychristiancounselor.online/v1/api
done | tail -20
```

**Expected output:**
- First 100 requests: `200`
- Requests 101-110: `429` (Too Many Requests)
- Header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**If rate limiting not working:**
- All 110 requests return 200 (rate limiting not active)
- Check API logs: `grep -i throttle` should show ThrottlerGuard messages
- Verify app.module.ts has ThrottlerGuard uncommented
- Non-critical: Can continue, but document issue for follow-up

**Scenario 3: Check auth endpoints use strict profile (20/min)**
```bash
# Make 25 requests to auth endpoint (exceed 20/min limit)
for i in {1..25}; do
  curl -s -w "Request $i: %{http_code}\n" \
    https://api.mychristiancounselor.online/v1/auth/login \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done | tail -10
```

**Expected output:**
- First 20 requests: `401` (Unauthorized - expected, no valid credentials)
- Requests 21-25: `429` (Too Many Requests - rate limit hit)

**If strict profile not working:**
- All 25 requests return 401 (no rate limit hit)
- Check auth controller has @Throttle decorator with 'strict' profile
- Non-critical but should be fixed

---

### 4. Redis Configuration

**Verify Redis eviction policy:**
```bash
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "maxmemory-policy"
```

**Expected output:**
- `# maxmemory-policy noeviction`

**Verify Redis memory limit:**
```bash
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "maxmemory"
```

**Expected output:**
- `# maxmemory 256000000` (256mb in bytes)

**Verify AOF persistence enabled:**
```bash
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "appendonly"
```

**Expected output:**
- `# appendonly yes`
- `AOF enabled` or `Background append only file rewriting started`

**Check Redis memory usage:**
```bash
# Connect to API container and run Redis CLI commands
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "mem" | tail -10
```

**Expected output:**
- Used memory should be reasonable (< 100mb initially)
- No OOM errors

**If Redis config incorrect:**
- Check lightsail-api-deployment.json for typos
- Verify deployment used updated config file
- If allkeys-lru still active: CRITICAL - rollback and redeploy
- See docs/operations/redis-configuration.md for monitoring

---

### 5. Web Application Integration

**Test Web app loads:**
1. Open browser to: https://mychristiancounselor.online
2. Open browser DevTools (F12) → Network tab
3. Filter by "Fetch/XHR"
4. Navigate to various pages (Books, Marketing, etc.)

**Expected behavior:**
- All pages load successfully
- Network tab shows requests to `https://api.mychristiancounselor.online/v1/...`
- NO requests to `localhost:3697`
- NO 404 errors
- Response headers include `X-API-Version: 1`

**If Web app broken:**
- Check browser console for errors
- Look for API 404 errors (versioning issue)
- Look for CORS errors (API not responding)
- Check Web container logs: `aws lightsail get-container-log --service-name web --container-name web`
- If API URL still shows localhost: Web build didn't include env vars correctly
  - Rollback Web container
  - Rebuild with env vars (see Phase 1)
  - Redeploy

**Test specific features:**
- [ ] Login works (auth endpoints with strict rate limit)
- [ ] Books page loads (API versioning)
- [ ] Marketing dashboard loads (API versioning)
- [ ] Testimonials load (API versioning, client-side fetch)

---

### 6. BullMQ Job Queue (Redis dependency)

**Verify BullMQ connects to Redis:**
```bash
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep -i "bullmq" | tail -20
```

**Expected output:**
- BullMQ worker initialized messages
- NO connection errors
- NO "ENOTFOUND redis" errors

**Test job processing (if applicable):**

If you have access to create test jobs (e.g., book evaluation):
1. Create a book via the application
2. Check that book evaluation job runs
3. Verify theological scores are generated

**If BullMQ not working:**
- Check REDIS_HOST is "localhost" not "redis"
- Check Redis container is running
- Check API can connect to Redis on localhost:6379
- See "CRITICAL: AWS Lightsail Redis Configuration" in CLAUDE.md

---

### 7. Monitoring and Alerts

**Check Sentry for new errors:**
1. Open Sentry dashboard: https://sentry.io/organizations/mychristiancounselor
2. Filter by: Last 30 minutes
3. Look for:
   - 404 errors on API endpoints (versioning issue)
   - Rate limiting errors (429 - expected, but check volume)
   - Redis connection errors (CRITICAL)
   - BullMQ errors (job processing failures)

**Expected:**
- No new critical errors
- Some 429 errors are normal (rate limiting working)

**Set up ongoing monitoring:**
- [ ] Sentry alerts configured for critical errors
- [ ] AWS Lightsail health check is green
- [ ] Daily Redis memory check scheduled (see docs/operations/redis-configuration.md)

---

## Success Criteria

All of the following must be true to consider deployment successful:

### Critical (Must Pass)
- [ ] Health checks return 200 OK (unversioned paths)
- [ ] API responds at /v1/ prefix (versioned paths)
- [ ] Web application loads and functions correctly
- [ ] No critical errors in Sentry
- [ ] Redis eviction policy is `noeviction`
- [ ] BullMQ connects to Redis successfully

### Important (Should Pass)
- [ ] Rate limiting returns 429 after exceeding limits
- [ ] Version header `X-API-Version: 1` present on all API responses
- [ ] Web app makes no requests to localhost:3697
- [ ] Redis AOF persistence enabled
- [ ] All test features work (login, books, marketing)

### Nice to Have
- [ ] Rate limiting profiles work correctly (default, strict, webhook)
- [ ] Old unversioned API paths return 404
- [ ] Swagger docs accessible at /v1/api/docs

---

## Rollback Procedures

### When to Rollback

**Immediate rollback if:**
- Health checks fail (Lightsail will mark service unhealthy)
- Web application completely broken (can't load)
- Critical Redis connection errors
- Deployment stuck in "ACTIVATING" for > 15 minutes

**Consider rollback if:**
- Rate limiting too aggressive (many user complaints)
- API versioning breaks unknown clients
- Redis memory exhaustion errors
- BullMQ job processing failures

---

### How to Rollback

Lightsail allows rollback via console (easiest) or CLI.

#### Option 1: Rollback via Lightsail Console (Recommended)

**Web Container:**
1. Go to: https://lightsail.aws.amazon.com/
2. Navigate to: Container services → web
3. Click "Deployments" tab
4. Find previous working deployment
5. Click "Modify your deployment" → "Use previous deployment version"
6. Click "Save and deploy"
7. Wait 5-10 minutes for rollback to complete

**API Container:**
1. Navigate to: Container services → api
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "Modify your deployment" → "Use previous deployment version"
5. Click "Save and deploy"
6. Wait 5-10 minutes for rollback to complete

#### Option 2: Rollback via CLI

**Web Container:**
```bash
# List recent deployments to find previous version
aws lightsail get-container-service-deployments \
  --service-name web \
  --region us-east-2

# Rollback to previous version (update image reference)
# Edit lightsail-web-deployment.json with previous image tag
# Then deploy:
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

**API Container:**
```bash
# List recent deployments
aws lightsail get-container-service-deployments \
  --service-name api \
  --region us-east-2

# Rollback to previous version
# Edit lightsail-api-deployment.json with previous image tag
# AND restore previous Redis configuration (allkeys-lru)
# Then deploy:
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

**IMPORTANT:** If rolling back Redis configuration:
- Change `maxmemory-policy` back to `allkeys-lru`
- Change `maxmemory` back to `128mb`
- Remove `appendonly` commands
- This will restore old behavior (BullMQ data may be evicted)

---

### Partial Rollback Scenarios

**Scenario 1: Web app broken, API working**
- Rollback Web container only
- Keep API changes (rate limiting, Redis, versioning)
- Investigate Web build/deployment issue
- Redeploy Web when fixed

**Scenario 2: Rate limiting too aggressive**
- Don't rollback containers
- Adjust throttle limits in code:
  - Edit `packages/api/src/app/app.module.ts`
  - Increase limits (e.g., 100 → 200 for default)
  - Rebuild and redeploy API only
- Monitor for 429 errors to subside

**Scenario 3: Redis memory exhaustion**
- Don't rollback immediately
- First: Increase Redis memory limit
  - Edit `lightsail-api-deployment.json`
  - Change `--maxmemory` from `256mb` to `512mb`
  - Redeploy API container
- Monitor Redis memory usage
- If still exhausting: Investigate memory leak or job queue bloat
- Last resort: Rollback to allkeys-lru (document job data risk)

**Scenario 4: API versioning breaks unknown client**
- Don't rollback
- Identify client from logs/Sentry errors
- Update client to use `/v1/` prefix
- Document in post-deployment notes

---

## Post-Deployment Monitoring

### First 24 Hours

**Hourly checks:**
- [ ] Check Sentry for new errors (every hour)
- [ ] Check AWS Lightsail service health (every hour)
- [ ] Check Redis memory usage (every 2 hours)

**Commands for monitoring:**
```bash
# Check Redis memory every 2 hours
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "used_memory_human" | tail -1

# Check for rate limiting errors (expected)
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep "429\|throttle" | tail -20

# Check for Redis errors (NOT expected)
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep -i "redis\|oom\|evict" | tail -20
```

**Alert thresholds:**
- Redis memory > 200mb: Warning (approaching limit)
- Redis memory > 240mb: Critical (near exhaustion)
- 429 rate limit errors > 100/hour: Investigate (may need adjustment)
- Any Redis connection errors: Critical (immediate investigation)

---

### First Week

**Daily checks:**
- [ ] Review Sentry error trends
- [ ] Check Redis memory usage trend
- [ ] Review rate limiting logs (are limits appropriate?)
- [ ] Check BullMQ job success rate

**Questions to answer:**
1. Is rate limiting blocking legitimate users? (Check 429 error patterns)
2. Is Redis memory stable? (Should stay well below 256mb)
3. Are jobs processing successfully? (BullMQ queue length stable)
4. Are there any API versioning 404 errors? (Unknown clients)

**Adjust if needed:**
- Rate limiting too strict → Increase limits
- Redis memory growing → Investigate job queue retention policies
- 404 errors from clients → Update clients or document

---

## Communication Templates

### Pre-Deployment Notification

**Subject:** Scheduled Maintenance - MyChristianCounselor API (15-20 min downtime)

**Body:**
```
Hi team,

We'll be deploying infrastructure improvements to the MyChristianCounselor platform:

**When:** [DATE/TIME]
**Duration:** 15-20 minutes
**Impact:** Brief service interruption during deployment

**Changes:**
- Enhanced rate limiting to prevent abuse
- Improved Redis configuration for job queue reliability
- API versioning for future compatibility

**What to expect:**
- Website may show loading errors briefly during deployment
- Service should resume automatically
- No action required from users

I'll send a follow-up when deployment is complete.

Thanks,
[Your Name]
```

---

### Post-Deployment Success

**Subject:** Deployment Complete - MyChristianCounselor Infrastructure

**Body:**
```
Hi team,

Infrastructure deployment completed successfully.

**Status:** All systems operational
**Downtime:** [ACTUAL MINUTES] minutes
**Issues:** None

**Verification:**
✅ Health checks passing
✅ API responding at /v1/
✅ Web application functional
✅ Rate limiting active
✅ Redis configuration updated

**Monitoring:**
- No critical errors in Sentry
- All services healthy in Lightsail
- Redis memory stable

I'll continue monitoring for the next 24 hours.

Thanks,
[Your Name]
```

---

### Post-Deployment Issues

**Subject:** ISSUE: MyChristianCounselor Deployment - [Issue Description]

**Body:**
```
Hi team,

We encountered an issue during/after the infrastructure deployment:

**Issue:** [Brief description]
**Impact:** [User impact - service down, slow, errors]
**Status:** [Investigating / Rollback in progress / Resolved]

**Timeline:**
- [TIME]: Deployment started
- [TIME]: Issue detected
- [TIME]: [Action taken]

**Next steps:**
[What we're doing to resolve]

**ETA for resolution:** [Time estimate]

I'll send updates every [15/30] minutes until resolved.

Thanks,
[Your Name]
```

---

## Appendices

### A. Related Documentation
- Infrastructure Hardening Plan: `docs/plans/2026-01-17-infrastructure-hardening.md`
- API Versioning Strategy: `docs/api-versioning-strategy.md`
- Redis Configuration Guide: `docs/operations/redis-configuration.md`
- CLAUDE.md Critical Sections:
  - API Versioning (2026-01-17)
  - Redis Eviction Policy Change (2026-01-17)
  - AWS Lightsail Redis Configuration

### B. Key File Locations
- **API Module:** `packages/api/src/app/app.module.ts`
- **API Main:** `packages/api/src/main.ts`
- **Web API Client:** `packages/web/src/lib/api.ts`
- **Lightsail API Config:** `lightsail-api-deployment.json` (not in git)
- **Lightsail Web Config:** `lightsail-web-deployment.json` (not in git)

### C. Key Endpoints
- **Production API:** https://api.mychristiancounselor.online/v1/
- **Production Web:** https://mychristiancounselor.online
- **Health Check:** https://api.mychristiancounselor.online/health
- **Swagger Docs:** https://api.mychristiancounselor.online/v1/api/docs
- **Sentry:** https://sentry.io/organizations/mychristiancounselor
- **Lightsail Console:** https://lightsail.aws.amazon.com/

### D. AWS CLI Quick Reference

**View service status:**
```bash
aws lightsail get-container-services \
  --service-name [api|web] \
  --region us-east-2 \
  --query 'containerServices[0].{State:state,Power:power,Scale:scale}'
```

**View recent logs:**
```bash
aws lightsail get-container-log \
  --service-name [api|web] \
  --container-name [api|web|redis] \
  --region us-east-2 \
  --start-time $(date -u -d '10 minutes ago' +%s)
```

**View deployments history:**
```bash
aws lightsail get-container-service-deployments \
  --service-name [api|web] \
  --region us-east-2
```

**View container images:**
```bash
aws lightsail get-container-images \
  --service-name [api|web] \
  --region us-east-2
```

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-17 | Claude | Initial deployment runbook created |

---

**End of Runbook**
