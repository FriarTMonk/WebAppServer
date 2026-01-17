- Clean_Restart: Stop Web & API (Node, NPM, and NX processes); Clear all cache including build; Re-Build API & Web; Start API & Web

## CRITICAL: Next.js Production Build Requirements

**ENVIRONMENT VARIABLES MUST BE SET AT BUILD TIME, NOT RUNTIME**

Next.js `NEXT_PUBLIC_*` environment variables are baked into the JavaScript bundle at BUILD time. Setting them at runtime (in Docker env or Lightsail deployment config) will NOT work!

### Correct Build Process for Production:

```bash
# 1. Clear NX cache (REQUIRED to force rebuild)
npx nx reset

# 2. Build Web with production environment variables
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --skip-nx-cache

# 3. Verify the API URL is baked in:
grep -r "api.mychristiancounselor.online" packages/web/.next/ | head -3
# Should show the production URL in compiled JavaScript

# 4. Build Docker image
docker build -f Dockerfile.web-prebuilt -t web:soft-launch-32 .

# 5. Push to Lightsail
aws lightsail push-container-image --service-name web --label soft-launch-32 --image web:soft-launch-32 --region us-east-2

# 6. Update lightsail-web-deployment.json with new image tag
# 7. Deploy
aws lightsail create-container-service-deployment --service-name web --cli-input-json file://lightsail-web-deployment.json --region us-east-2
```

### Common Symptom of This Issue:
- Testimonials don't load (or other client-side API calls fail)
- Browser console shows requests to `localhost:3697` instead of `api.mychristiancounselor.online`
- Checking compiled code shows `localhost:3697` baked into JavaScript

### Why This Happens:
If you run `npx nx build web` WITHOUT the environment variables set, Next.js will use defaults (localhost) and bake those into the bundle. The .env.production file is NOT automatically loaded by NX builds.

## CRITICAL: AWS Lightsail Redis Configuration

**REDIS_HOST MUST BE "localhost" NOT "redis"**

In AWS Lightsail container services, all containers in the same service share the same network namespace. They communicate via **localhost**, NOT via container names.

### Problem:
- Setting `REDIS_HOST: "redis"` causes DNS resolution errors: `ENOTFOUND redis`
- BullMQ job queue cannot connect to Redis
- Book evaluation jobs never run (books stuck with no scores)
- Any background job processing fails

### Solution:
In `lightsail-api-deployment.json`, set:
```json
"REDIS_HOST": "localhost"
```

### Verification:
Check API logs for Redis connection:
```bash
aws lightsail get-container-log --service-name api --container-name api --region us-east-2 | grep -i "redis\|bullmq"
```

Should NOT see: `Error: getaddrinfo ENOTFOUND redis`

### Related Symptoms:
- Books created but `evaluationStatus` stays 'pending' forever
- No theological scores generated
- Job queue operations fail silently

## Redis Eviction Policy Change (2026-01-17)

**Status:** FIXED - Changed to noeviction

**Deployment:**
```bash
# Deploy updated Redis configuration
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

**Verification:**
After deployment completes (~5-10 minutes), connect to API container and verify:
```bash
# Get container logs
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 | grep "maxmemory-policy"
```

Should show: `maxmemory-policy: noeviction`

**Monitoring:** See `docs/operations/redis-configuration.md` for ongoing monitoring procedures.

## Authentication & User Types

**CRITICAL: There are NO anonymous users in this system.**

All users must be authenticated. The three user types are:
1. **Registered** - Basic authenticated users
2. **Subscribed** - Users with active subscriptions
3. **Organization** - Users who are members of organizations

Additionally, **Platform Admins** have elevated permissions including:
- Ability to see ALL books including those with `evaluationStatus: 'pending'`
- Ability to see books with `visibilityTier: 'not_aligned'` (hidden from regular users)
- Full oversight of evaluation system

**Important**: All API endpoints that serve user-facing content MUST require authentication using `@UseGuards(JwtAuthGuard)`. Do NOT use `@Public()` decorator for content endpoints.