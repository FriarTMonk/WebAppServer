# Preventing Localhost Deployment

## Problem

Next.js bakes `NEXT_PUBLIC_*` environment variables into the JavaScript bundle at **build time**. If the web package is built with `.env.local` containing `NEXT_PUBLIC_API_URL=http://localhost:3697`, that localhost URL gets compiled into the production bundle and deployed to production - breaking the application.

This has happened twice, and we've implemented safeguards to prevent it from happening again.

## Safeguards Implemented

### 1. Environment File Separation

**Created: `packages/web/.env.production`**
```bash
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016
```

This file contains the correct production values and is automatically used when `NODE_ENV=production`.

**Purpose:**
- `.env.local` is for local development only (already in `.gitignore`)
- `.env.production` contains production values and should be committed
- Next.js automatically prioritizes `.env.production` over `.env.local` in production builds

### 2. Build Validation Script

**Created: `scripts/validate-production-build.sh`**

This script runs before deployment and checks:
- ✅ Next.js build exists (`packages/web/.next`)
- ✅ No localhost URLs in the build (`grep -r "localhost:3697" packages/web/.next/static`)
- ✅ API build exists (`packages/api/dist/main.js`)

If validation fails, it provides clear instructions on how to fix the issue and exits with error code 1, preventing deployment.

### 3. Updated Deployment Script

**Modified: `scripts/deploy-soft-launch.sh`**

Added "Step 0: Validate Production Build" that runs the validation script before building Docker images. If validation fails, deployment is aborted.

## Building for Production

### Correct Way

```bash
# 1. Build API
npx nx build api

# 2. Build Web with production environment
rm -rf packages/web/.next
NODE_ENV=production npx nx build web --skip-nx-cache

# 3. Validate build
bash scripts/validate-production-build.sh

# 4. Use deployment script (includes validation automatically)
bash scripts/deploy-soft-launch.sh
```

### What NOT to Do

```bash
# ❌ BAD: Building without NODE_ENV=production
npx nx build web

# ❌ BAD: Building without clearing cache when env vars change
NODE_ENV=production npx nx build web  # Uses cached build with old env vars
```

## How Next.js Environment Variables Work

1. **Build Time Variables** (`NEXT_PUBLIC_*`):
   - Baked into the JavaScript bundle during `next build`
   - Cannot be changed after build without rebuilding
   - Must be correct before building for production

2. **Environment File Priority** (production build):
   ```
   .env.production.local  (highest priority, gitignored)
   .env.production        (production values, committed)
   .env.local             (local dev, gitignored)
   .env                   (defaults, committed)
   ```

3. **Cache Issues**:
   - Next.js caches builds in `.next` directory
   - NX caches builds in `.nx/cache`
   - Changing environment variables doesn't automatically invalidate cache
   - Always clear cache when environment variables change: `rm -rf packages/web/.next`

## Verification

After building, verify the API URL is correct:

```bash
# Check what API URL is baked into the build
grep -r "NEXT_PUBLIC_API_URL" packages/web/.next/static | head -5

# Should show: https://api.mychristiancounselor.online
# Should NOT show: localhost:3697
```

## Summary

**Safeguards:**
1. ✅ `.env.local` is gitignored (already was)
2. ✅ `.env.production` created with correct production values
3. ✅ `validate-production-build.sh` script checks for localhost URLs
4. ✅ `deploy-soft-launch.sh` runs validation before deployment

**Process:**
1. Build with `NODE_ENV=production` and `--skip-nx-cache`
2. Validation script runs automatically during deployment
3. If localhost URL found, deployment aborts with clear error message
4. Developer must rebuild with correct environment before deploying

This ensures localhost URLs can never be deployed to production again.
