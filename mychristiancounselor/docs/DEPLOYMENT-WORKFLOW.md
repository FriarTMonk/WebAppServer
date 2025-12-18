# Optimized Deployment Workflow

**Date**: December 9, 2025
**Purpose**: Avoid Docker memory issues and speed up builds

---

## Standard Deployment Process

This workflow builds applications locally first, then uses simple Dockerfiles to package pre-built artifacts.

### Step 1: Build Locally

**Build API:**
```bash
npx nx build api --configuration=production
```

**Build Web:**
```bash
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --configuration=production
```

### Step 2: Build Docker Images

**API** (uses standard Dockerfile):
```bash
docker build -f packages/api/Dockerfile -t api:VERSION .
```

**Web** (uses prebuilt Dockerfile):
```bash
docker build -f Dockerfile.web-prebuilt -t web:VERSION .
```

### Step 3: Push to Lightsail

**Push API:**
```bash
aws lightsail push-container-image \
  --service-name api \
  --label VERSION \
  --image api:VERSION \
  --region us-east-2
```

**Push Web:**
```bash
aws lightsail push-container-image \
  --service-name web \
  --label VERSION \
  --image web:VERSION \
  --region us-east-2
```

**Note**: Large images (300MB+) can take 10-15 minutes to push.

### Step 4: Update Deployment Configs

**Update API deployment config:**
```bash
# Edit lightsail-api-deployment.json
# Change: "image": ":api.VERSION"
```

**Update Web deployment config:**
```bash
# Edit lightsail-web-deployment.json
# Change: "image": ":web.VERSION"
```

### Step 5: Deploy Services

**Deploy API:**
```bash
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

**Deploy Web:**
```bash
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

### Step 6: Verify Deployment

**Check service status:**
```bash
aws lightsail get-container-services \
  --service-name api \
  --region us-east-2 \
  --query 'containerServices[0].state' \
  --output text
```

**Test health endpoints:**
```bash
# API
curl https://api.mychristiancounselor.online/health/live

# Web
curl https://mychristiancounselor.online/
```

---

## Why This Approach?

### Advantages

1. **Avoids Docker Memory Issues**
   - Next.js builds can require 8GB+ RAM in Docker
   - Building locally uses system memory more efficiently
   - No SIGSEGV crashes

2. **Faster Builds**
   - Local builds use NX cache
   - Simple Dockerfiles just copy files (< 10 seconds)
   - No need to install dependencies in Docker

3. **More Reliable**
   - Local builds can be verified before Docker step
   - Easier to debug build issues
   - Can test builds before packaging

4. **Consistent with CI/CD**
   - GitHub Actions would follow same pattern
   - Build artifacts once, package multiple times if needed

### Disadvantages

1. **Requires local Node.js environment**
   - Must have correct Node version installed
   - Dependencies must be installed locally

2. **Two-step process**
   - Build locally, then Docker
   - More commands to run

3. **Build artifacts in repo**
   - Need to ensure dist/ folders are in .dockerignore
   - Build output not automatically cleaned

---

## Dockerfile.web-prebuilt

Simple Dockerfile for packaging pre-built Web app:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy pre-built output
COPY --chown=nextjs:nodejs packages/web/.next/standalone ./
COPY --chown=nextjs:nodejs packages/web/.next/static ./packages/web/.next/static
COPY --chown=nextjs:nodejs packages/web/public ./packages/web/public

USER nextjs
EXPOSE 3699

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3699', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/web/server.js"]
```

---

## Health Check Configuration

### API Health Check
- **Path**: `/health/live`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Healthy Threshold**: 2 checks
- **Unhealthy Threshold**: 3 checks
- **Success Codes**: 200-299

### Web Health Check
- **Path**: `/` (root)
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Healthy Threshold**: 2 checks
- **Unhealthy Threshold**: 3 checks
- **Success Codes**: 200-299

---

## Version Naming Convention

Use descriptive version labels:

- **Feature**: `feature-name.##` (e.g., `soft-launch.26`)
- **Bug Fix**: `bugfix-name.##` (e.g., `csrf-fix.27`)
- **Hotfix**: `hotfix-name.##` (e.g., `memory-leak.28`)
- **CI Build**: `ci-build-##` (e.g., `ci-build-123`)

---

## Troubleshooting

### Push Stalls/Times Out
- Large images take time (10-15 min for 300MB+)
- Check network connection
- Layers marked "Layer already exists" = using cache (good)
- Be patient - AWS processes layers sequentially

### Build Fails Locally
- Check Node version: `node --version` (should be 18 or 20)
- Clear NX cache: `npx nx reset`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check environment variables are set

### Deployment Fails
- Verify image was pushed: `aws lightsail get-container-images --service-name api`
- Check deployment JSON has correct image tag
- View logs: `aws lightsail get-container-log --service-name api --container-name api`
- Verify health check endpoint works

### Health Check Fails
- Check container logs for startup errors
- Verify environment variables are correct
- Test endpoint locally first
- Increase start-period if app needs more time to start

---

## Future Improvements

1. **Automate with Script**
   - Create single script that does all steps
   - Handle version incrementing automatically
   - Verify each step before proceeding

2. **GitHub Actions**
   - Auto-deploy on push to master
   - Run tests before deployment
   - Notify on deployment success/failure

3. **API Prebuilt Dockerfile**
   - Create similar approach for API
   - May require Prisma client generation handling

4. **Rollback Script**
   - Quick script to revert to previous version
   - Store last-known-good version

---

## Quick Reference

**Build & Deploy in One Go:**
```bash
# Build
npx nx build api --configuration=production
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --configuration=production

# Docker
docker build -f packages/api/Dockerfile -t api:soft-launch.26 .
docker build -f Dockerfile.web-prebuilt -t web:soft-launch.25 .

# Push (will take time)
aws lightsail push-container-image --service-name api --label soft-launch.26 --image api:soft-launch.26 --region us-east-2 &
aws lightsail push-container-image --service-name web --label soft-launch.25 --image web:soft-launch.25 --region us-east-2 &

# Wait for both to complete, then deploy
aws lightsail create-container-service-deployment --service-name api --cli-input-json file://lightsail-api-deployment.json --region us-east-2
aws lightsail create-container-service-deployment --service-name web --cli-input-json file://lightsail-web-deployment.json --region us-east-2
```

---

## See Also

- `docs/SOFT-LAUNCH-DEPLOYMENT.md` - Detailed deployment guide for soft launch
- `scripts/deploy-soft-launch.sh` - Automated deployment script
- `docs/DATABASE-BACKUP-RESTORE.md` - Database backup procedures
