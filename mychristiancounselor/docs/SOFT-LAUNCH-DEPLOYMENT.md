# Soft Launch Deployment Guide

**Date:** December 9, 2025
**Branch:** master
**Version:** soft-launch.26 (API), soft-launch.25 (Web)

---

## Pre-Deployment Checklist

- [x] All changes committed to git (7 commits)
- [ ] Changes pushed to GitHub
- [ ] Docker installed and running
- [ ] AWS CLI configured
- [ ] Database backup completed

---

## Step 1: Push Git Changes

```bash
# Push all commits to remote
git push origin master
```

---

## Step 2: Build and Push API Docker Image

```bash
# Navigate to project root
cd /mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor

# Build API Docker image
docker build -f packages/api/Dockerfile -t api:soft-launch.26 .

# Tag for Lightsail
docker tag api:soft-launch.26 :api.soft-launch.26

# Push to Lightsail container registry
aws lightsail push-container-image \
  --service-name api \
  --label soft-launch.26 \
  --image api:soft-launch.26 \
  --region us-east-2
```

**Expected output:**
```
Refer to this image as ":api.soft-launch.26" in deployments.
```

---

## Step 3: Deploy API Service

Update the deployment configuration and deploy:

```bash
# Update lightsail-api-deployment.json with new image tag
# Change line 5 from:
#   "image": ":api.crisis-detection-fix.22"
# To:
#   "image": ":api.soft-launch.26"

# Deploy API
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

**Monitor deployment:**
```bash
# Check deployment status
aws lightsail get-container-services \
  --service-name api \
  --region us-east-2 \
  --query 'containerServices[0].state' \
  --output text

# Watch until it shows "RUNNING"
```

---

## Step 4: Build and Push Web Docker Image

```bash
# Build Web Docker image
docker build -f packages/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
  -t web:soft-launch.25 .

# Tag for Lightsail
docker tag web:soft-launch.25 :web.soft-launch.25

# Push to Lightsail container registry
aws lightsail push-container-image \
  --service-name web \
  --label soft-launch.25 \
  --image web:soft-launch.25 \
  --region us-east-2
```

---

## Step 5: Deploy Web Service

Update the deployment configuration and deploy:

```bash
# Update lightsail-web-deployment.json with new image tag
# Change line 5 from:
#   "image": ":web.subscription-link-fix.24"
# To:
#   "image": ":web.soft-launch.25"

# Deploy Web
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

**Monitor deployment:**
```bash
# Check deployment status
aws lightsail get-container-services \
  --service-name web \
  --region us-east-2 \
  --query 'containerServices[0].state' \
  --output text

# Watch until it shows "RUNNING"
```

---

## Step 6: Run Database Migration (CRITICAL)

**IMPORTANT:** The account deletion feature requires new database columns.

### Option 1: Via RDS Query Editor (Recommended)

1. Go to AWS RDS Console: https://console.aws.amazon.com/rds/
2. Select your database: `mychristiancounselor`
3. Click "Query Editor"
4. Connect with master credentials
5. Run this SQL:

```sql
ALTER TABLE "User"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP,
  ADD COLUMN "deletionRequestedBy" TEXT;
```

6. Verify:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name IN ('deletionRequestedAt', 'deletionRequestedBy');
```

### Option 2: Via psql

```bash
# Connect to production database
psql "postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require"

# Run migration
ALTER TABLE "User"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP,
  ADD COLUMN "deletionRequestedBy" TEXT;

# Verify
\d "User"

# Exit
\q
```

### Option 3: Via Prisma Migrate (if available on production server)

```bash
# SSH into API container or run via Lightsail CLI
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

---

## Step 7: Verify Deployment

### API Health Check

```bash
# Check API is responding
curl https://api.mychristiancounselor.online/health/live

# Expected response:
# {"status":"alive","timestamp":"...","pid":...,"memory":{...}}
```

### Web Health Check

```bash
# Check web app is responding
curl -I https://mychristiancounselor.online/

# Expected: HTTP/2 200
```

### Test New Features

1. **Landing Page:**
   - Visit: https://mychristiancounselor.online/
   - Verify marketing landing page loads
   - Verify cookie consent banner appears
   - Click "Get Started" → redirects to /register

2. **Password Reset:**
   - Visit: https://mychristiancounselor.online/forgot-password
   - Enter email and submit
   - Check email for reset link
   - Complete password reset

3. **Email Verification:**
   - Register new account
   - Check email for verification link
   - Click link and verify email

4. **Account Deletion:**
   - Login
   - Go to: https://mychristiancounselor.online/profile
   - Scroll to "Danger Zone"
   - Test account deletion flow (optional: use test account)

5. **Org Invitation:**
   - Send org invitation
   - Click invitation link
   - Verify redirects to /register (not /signup)
   - Verify redirects to /home after acceptance (not /)

---

## Step 8: Check Deployment Logs

### API Logs

```bash
# View recent logs
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 \
  --page-size 100

# Check for errors
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep -i error
```

### Web Logs

```bash
# View recent logs
aws lightsail get-container-log \
  --service-name web \
  --container-name web \
  --region us-east-2 \
  --page-size 100

# Check for errors
aws lightsail get-container-log \
  --service-name web \
  --container-name web \
  --region us-east-2 | grep -i error
```

---

## Step 9: Set Up Monitoring

### UptimeRobot Setup (Free Tier)

1. Sign up: https://uptimerobot.com
2. Add monitors:
   - **API Health Check**
     - URL: https://api.mychristiancounselor.online/health/live
     - Type: HTTP(s)
     - Interval: 5 minutes
     - Expected keyword: "alive"

   - **Web App**
     - URL: https://mychristiancounselor.online/
     - Type: HTTP(s)
     - Interval: 5 minutes
     - Expected status: 200

3. Configure alerts:
   - Email: your-email@example.com
   - Down for: 5 minutes (1 check)

### Sentry Monitoring

Already configured in both API and Web:
- DSN: `https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016`
- Check dashboard: https://sentry.io/

---

## Step 10: Create Manual Backup (Recommended)

```bash
# Create pre-launch snapshot
./scripts/backup-database.sh "soft-launch-deployment"

# Verify backup created
./scripts/list-backups.sh
```

---

## Rollback Plan (If Needed)

### Rollback API

```bash
# Revert to previous deployment
# Update lightsail-api-deployment.json back to:
#   "image": ":api.crisis-detection-fix.22"

# Redeploy
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

### Rollback Web

```bash
# Update lightsail-web-deployment.json back to:
#   "image": ":web.subscription-link-fix.24"

# Redeploy
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

### Rollback Database (If Migration Causes Issues)

```sql
-- Remove added columns (ONLY if necessary)
ALTER TABLE "User"
  DROP COLUMN "deletionRequestedAt",
  DROP COLUMN "deletionRequestedBy";
```

**Note:** Account deletion feature will not work without these columns.

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] Verify all health checks passing
- [ ] Test all new features (landing page, password reset, email verification, account deletion)
- [ ] Check error rates in Sentry
- [ ] Monitor API/Web logs for errors
- [ ] Verify database migration successful

### Within 24 Hours

- [ ] Run complete testing checklist (docs/SOFT-LAUNCH-TESTING-CHECKLIST.md)
- [ ] Set up UptimeRobot monitoring
- [ ] Configure email alerts
- [ ] Test org invitation flow end-to-end
- [ ] Verify cookie consent banner working
- [ ] Test CSRF protection (make request from different origin)

### Within 1 Week

- [ ] Monitor uptime (target: 99%+)
- [ ] Check error rates (target: <1%)
- [ ] Review Sentry alerts
- [ ] Monitor user signups
- [ ] Check email delivery rates
- [ ] Review database backup status

---

## What Changed in This Deployment

### New Features

1. **Password Reset Flow** (2 pages)
   - `/forgot-password` - Request reset link
   - `/reset-password/[token]` - Complete reset with password strength indicator

2. **Email Verification Flow** (2 pages)
   - `/verify-email/[token]` - Verify email automatically
   - `/resend-verification` - Request new verification email

3. **Marketing Landing Page**
   - Root `/` now shows landing page (was conversation view)
   - Conversation view moved to `/home`
   - Anonymous users can access `/home` without signup

4. **GDPR Account Deletion**
   - DELETE `/profile` endpoint
   - 30-day soft delete with grace period
   - Password verification required
   - Tracks who requested deletion

5. **CSRF Protection**
   - Origin/Referer header validation
   - Global guard on all state-changing requests
   - Logs suspicious requests

6. **Cookie Consent Banner**
   - GDPR-compliant consent mechanism
   - Stores preference in localStorage
   - 1-second delay for better UX

### Bug Fixes

1. **Org Invitation Flow**
   - Fixed: `/signup` → `/register` (was 404)
   - Fixed: Post-acceptance redirect to `/home` (was `/`)
   - Fixed: Error page redirect to `/home` (was `/`)

### Database Changes

- Added `deletionRequestedAt` TIMESTAMP to User table
- Added `deletionRequestedBy` TEXT to User table

### Configuration Updates

- CORS_ORIGIN includes www subdomain
- Health check endpoint: `/health/live` (unchanged)
- All environment variables preserved

---

## Deployment Timeline

- **Build:** ~10-15 minutes per service
- **Push:** ~3-5 minutes per image
- **Deploy:** ~5-10 minutes per service
- **Migration:** ~1 minute
- **Verification:** ~30 minutes
- **Total:** ~45-60 minutes

---

## Success Criteria

✅ Deployment successful if:
- [ ] Both services show "RUNNING" state
- [ ] API health check returns `{"status":"alive",...}`
- [ ] Web app loads at https://mychristiancounselor.online/
- [ ] Landing page displays correctly
- [ ] Database migration completed
- [ ] No errors in logs
- [ ] All critical flows tested

---

## Support & Troubleshooting

### Common Issues

**1. Health check failing:**
```bash
# Check if container is running
aws lightsail get-container-services --service-name api --region us-east-2

# Check logs for errors
aws lightsail get-container-log --service-name api --container-name api --region us-east-2
```

**2. Database connection error:**
```bash
# Verify database is accessible
psql "postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require" -c "SELECT 1;"
```

**3. Image push fails:**
```bash
# Re-authenticate with AWS
aws configure
aws lightsail get-container-services --region us-east-2
```

**4. Deployment stuck in "DEPLOYING" state:**
```bash
# Wait 10-15 minutes
# If still stuck, check for container resource limits
aws lightsail get-container-services --service-name api --region us-east-2 --query 'containerServices[0].power'
```

### Getting Help

- **Lightsail Documentation:** https://docs.aws.amazon.com/lightsail/
- **API Logs:** `aws lightsail get-container-log --service-name api --container-name api --region us-east-2`
- **Web Logs:** `aws lightsail get-container-log --service-name web --container-name web --region us-east-2`
- **Sentry Dashboard:** https://sentry.io/
- **Stripe Dashboard:** https://dashboard.stripe.com

---

## Deployment Checklist Summary

- [ ] 1. Push git changes to GitHub
- [ ] 2. Build and push API Docker image
- [ ] 3. Deploy API service
- [ ] 4. Build and push Web Docker image
- [ ] 5. Deploy Web service
- [ ] 6. **CRITICAL:** Run database migration
- [ ] 7. Verify all health checks
- [ ] 8. Test new features
- [ ] 9. Set up monitoring
- [ ] 10. Create backup snapshot

**Good luck with your soft launch!** 🚀
