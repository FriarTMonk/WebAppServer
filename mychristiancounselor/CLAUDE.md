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