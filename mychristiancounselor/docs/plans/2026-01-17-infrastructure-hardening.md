# Infrastructure Hardening: Rate Limiting, Redis Eviction, API Versioning

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-enable production rate limiting, fix Redis eviction policy to prevent BullMQ data loss, and implement API versioning for backward compatibility.

**Architecture:** Three independent infrastructure improvements: (1) Enable NestJS ThrottlerGuard with production-appropriate limits and add webhook throttling, (2) Change Redis eviction policy from allkeys-lru to noeviction in Lightsail deployment, (3) Add /v1/ prefix to all API endpoints and update frontend API client.

**Tech Stack:** NestJS 11 + @nestjs/throttler, Redis 7-alpine, Next.js 16 API client

---

## Task 1: Re-Enable Rate Limiting with Production Limits

**Files:**
- Modify: `packages/api/src/app/app.module.ts:48-52,98-102`
- Modify: `packages/api/src/webhooks/webhooks.controller.ts:1,14`
- Create: `packages/api/src/app/app.module.spec.ts`

**Step 1: Update ThrottlerModule configuration to production limits**

In `packages/api/src/app/app.module.ts`, change lines 48-52:

```typescript
// BEFORE (lines 48-52):
ThrottlerModule.forRoot([
  {
    name: 'default',
    ttl: 60000, // 60 seconds
    limit: 1000, // TODO: Restore to 100/10 for production deployment
  },
  {
    name: 'strict',
    ttl: 60000,
    limit: 100, // For auth endpoints
  },
]),

// AFTER:
ThrottlerModule.forRoot([
  {
    name: 'default',
    ttl: 60000, // 60 seconds
    limit: 100, // Production limit: 100 requests per minute per IP
  },
  {
    name: 'strict',
    ttl: 60000, // 60 seconds
    limit: 20, // Auth endpoints: 20 requests per minute per IP
  },
  {
    name: 'webhook',
    ttl: 60000, // 60 seconds
    limit: 50, // Webhooks: 50 requests per minute per IP
  },
]),
```

**Step 2: Uncomment ThrottlerGuard to enable rate limiting globally**

In `packages/api/src/app/app.module.ts`, change lines 98-102:

```typescript
// BEFORE (lines 98-102):
// Temporarily disabled for development - re-enable for production!
// {
//   provide: APP_GUARD,
//   useClass: ThrottlerGuard, // Rate limiting (prevent abuse)
// },

// AFTER:
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard, // Rate limiting (prevent abuse)
},
```

**Step 3: Add rate limiting to webhook endpoint**

In `packages/api/src/webhooks/webhooks.controller.ts`, add imports and decorator:

```typescript
// Add to imports at top of file (line 1 area):
import { Throttle } from '@nestjs/throttler';

// Add decorator to webhook handler method (around line 14):
@Post('postmark/inbound')
@Public()
@Throttle({ webhook: { limit: 50, ttl: 60000 } }) // Use webhook rate limit profile
@UseGuards(PostmarkSignatureGuard)
async handlePostmarkInbound(@Body() body: PostmarkInboundWebhook) {
  // ... existing code
}
```

**Step 4: Write test for rate limiting configuration**

Create `packages/api/src/app/app.module.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppModule } from './app.module';

describe('AppModule Rate Limiting', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should have ThrottlerGuard registered as APP_GUARD', () => {
    const guards = module
      .get('APP_GUARD', { strict: false })
      .map((guard: any) => guard.constructor.name);

    expect(guards).toContain('ThrottlerGuard');
  });

  it('should configure default throttle profile with production limits', () => {
    const throttlerOptions = module.get('THROTTLER_OPTIONS');
    const defaultProfile = throttlerOptions.throttlers.find(
      (t: any) => t.name === 'default'
    );

    expect(defaultProfile).toBeDefined();
    expect(defaultProfile.limit).toBe(100);
    expect(defaultProfile.ttl).toBe(60000);
  });

  it('should configure strict throttle profile for auth endpoints', () => {
    const throttlerOptions = module.get('THROTTLER_OPTIONS');
    const strictProfile = throttlerOptions.throttlers.find(
      (t: any) => t.name === 'strict'
    );

    expect(strictProfile).toBeDefined();
    expect(strictProfile.limit).toBe(20);
    expect(strictProfile.ttl).toBe(60000);
  });

  it('should configure webhook throttle profile', () => {
    const throttlerOptions = module.get('THROTTLER_OPTIONS');
    const webhookProfile = throttlerOptions.throttlers.find(
      (t: any) => t.name === 'webhook'
    );

    expect(webhookProfile).toBeDefined();
    expect(webhookProfile.limit).toBe(50);
    expect(webhookProfile.ttl).toBe(60000);
  });
});
```

**Step 5: Run the test**

```bash
cd packages/api
npx nx test api --testFile=app.module.spec.ts
```

Expected: Tests should pass (4 passing)

**Step 6: Test rate limiting manually with curl**

Start the API server:
```bash
npx nx serve api
```

In another terminal, test rate limiting:
```bash
# Test default rate limit (should fail after 100 requests)
for i in {1..105}; do
  curl -s -w "%{http_code}\n" http://localhost:3697/health -o /dev/null
done
```

Expected: First 100 requests return 200, remaining 5 return 429 (Too Many Requests)

**Step 7: Commit rate limiting changes**

```bash
git add packages/api/src/app/app.module.ts
git add packages/api/src/app/app.module.spec.ts
git add packages/api/src/webhooks/webhooks.controller.ts
git commit -m "feat(security): re-enable rate limiting with production limits

- Set default profile to 100 req/min (was 1000)
- Set strict profile to 20 req/min (was 100) for auth endpoints
- Add webhook profile at 50 req/min
- Enable ThrottlerGuard globally
- Add rate limiting to Postmark webhook endpoint
- Add tests for rate limiting configuration

Closes security vulnerability allowing DDoS and brute force attacks."
```

---

## Task 2: Fix Redis Eviction Policy for BullMQ

**Files:**
- Modify: `lightsail-api-deployment.json:15-21`
- Create: `docs/operations/redis-configuration.md`

**Step 1: Update Redis eviction policy in Lightsail deployment config**

In `lightsail-api-deployment.json`, change lines 15-21 (the redis container command):

```json
// BEFORE:
"redis": {
  "image": "redis:7-alpine",
  "command": [
    "redis-server",
    "--maxmemory", "128mb",
    "--maxmemory-policy", "allkeys-lru"
  ]
},

// AFTER:
"redis": {
  "image": "redis:7-alpine",
  "command": [
    "redis-server",
    "--maxmemory", "256mb",
    "--maxmemory-policy", "noeviction",
    "--appendonly", "yes",
    "--appendfsync", "everysec"
  ]
},
```

**Rationale:**
- `noeviction`: Prevents Redis from evicting any keys when memory limit reached. BullMQ job data will never be lost.
- `256mb`: Doubled memory limit to accommodate job queue growth (from 128mb)
- `appendonly yes`: Enable AOF persistence for data durability
- `appendfsync everysec`: Write to disk every second (balance between performance and durability)

**Step 2: Create Redis configuration documentation**

Create `docs/operations/redis-configuration.md`:

```markdown
# Redis Configuration

## Production Configuration

**Container:** redis:7-alpine in AWS Lightsail

**Memory Limit:** 256MB

**Eviction Policy:** noeviction

### Why noeviction?

BullMQ (our job queue system) stores critical job data in Redis:
- Pending jobs (book evaluations, email sending, cleanup tasks)
- Job metadata (status, progress, error messages)
- Failed job data for retry logic

With `allkeys-lru` eviction policy, Redis would remove job data when memory is full, causing:
- Lost jobs (never executed)
- Lost error information (can't debug failures)
- Broken retry logic (can't retry if job data is gone)

With `noeviction` policy, Redis will reject new writes when full, which:
- Triggers application-level errors (visible in logs)
- Preserves existing job data
- Allows operators to increase memory or clean up old jobs

### Persistence (AOF)

**Enabled:** Yes (`appendonly yes`)
**Sync Strategy:** everysec (`appendfsync everysec`)

AOF (Append-Only File) ensures job data survives Redis restarts:
- Every state-changing command written to log file
- On restart, Redis replays log to restore data
- `everysec` writes to disk every second (balance performance/durability)

### Monitoring

**Key Metrics to Monitor:**

1. **Memory Usage:**
   ```bash
   redis-cli INFO memory | grep used_memory_human
   ```
   Alert if >80% of 256MB (>205MB)

2. **Eviction Events:**
   ```bash
   redis-cli INFO stats | grep evicted_keys
   ```
   Should always be 0 with noeviction policy

3. **Rejected Connections:**
   ```bash
   redis-cli INFO stats | grep rejected_connections
   ```
   Non-zero indicates memory exhaustion

4. **AOF Status:**
   ```bash
   redis-cli INFO persistence | grep aof_enabled
   ```
   Should show 1 (enabled)

### Memory Exhaustion Response

If Redis reaches 256MB limit:

1. **Immediate:** Clear completed jobs older than 7 days
   ```bash
   # Via API admin endpoint
   curl -X POST https://api.mychristiancounselor.online/admin/queue/cleanup \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Short-term:** Increase memory limit to 512MB
   - Update `lightsail-api-deployment.json` maxmemory
   - Redeploy API service

3. **Long-term:** Implement job retention policy
   - Auto-cleanup jobs >30 days old
   - Archive failed jobs to PostgreSQL
   - Monitor job creation rate vs. completion rate

### Configuration Changes

To update Redis configuration:

1. Edit `lightsail-api-deployment.json`
2. Commit changes
3. Deploy: `aws lightsail create-container-service-deployment --service-name api --cli-input-json file://lightsail-api-deployment.json --region us-east-2`
4. Wait 5-10 minutes for deployment
5. Verify: `redis-cli CONFIG GET maxmemory-policy` (should show "noeviction")

**Note:** Changing eviction policy on live Redis will NOT affect existing data. Jobs in progress will continue unaffected.

## Local Development

Local Redis uses default configuration (no eviction policy change needed):

```bash
# Start local Redis
redis-server
```

For local testing with noeviction policy:
```bash
redis-server --maxmemory 128mb --maxmemory-policy noeviction
```
```

**Step 3: Verify JSON syntax**

```bash
# Validate JSON syntax
cat lightsail-api-deployment.json | python -m json.tool > /dev/null
```

Expected: No output (valid JSON)

**Step 4: Commit Redis configuration changes**

```bash
git add lightsail-api-deployment.json
git add docs/operations/redis-configuration.md
git commit -m "fix(infrastructure): change Redis eviction policy to noeviction

- Change from allkeys-lru to noeviction to prevent BullMQ job data loss
- Increase memory limit from 128mb to 256mb
- Enable AOF persistence for data durability
- Add comprehensive Redis configuration documentation

BREAKING: Operators must monitor Redis memory usage and respond to
exhaustion alerts. See docs/operations/redis-configuration.md for
monitoring and response procedures.

Fixes critical issue where job data could be evicted under memory
pressure, causing lost evaluations and failed email sends."
```

**Step 5: Document deployment procedure**

Add to `CLAUDE.md` in the "CRITICAL: AWS Lightsail Redis Configuration" section:

```markdown
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
```

**Step 6: Commit CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: add Redis eviction policy deployment instructions to CLAUDE.md"
```

---

## Task 3: Add API Versioning (/v1/ prefix)

**Files:**
- Modify: `packages/api/src/main.ts:35-36`
- Modify: `packages/web/src/lib/api.ts:3`
- Create: `docs/api-versioning-strategy.md`
- Create: `packages/api/src/common/decorators/api-version.decorator.ts`

**Step 1: Enable global API versioning in NestJS**

In `packages/api/src/main.ts`, add versioning configuration after app creation (around line 35):

```typescript
// BEFORE (line 35-36):
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors({
    // ... existing code

// AFTER:
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API Versioning - all routes prefixed with /v1/
  app.setGlobalPrefix('v1', {
    exclude: [
      'health',           // /health (no version)
      'health/ready',     // /health/ready
      'health/live',      // /health/live
    ],
  });

  // CORS configuration
  app.enableCors({
    // ... existing code
```

**Rationale:**
- Health check endpoints remain unversioned (required by Lightsail health checks)
- All other endpoints get `/v1/` prefix automatically
- Future breaking changes will use `/v2/` without affecting v1 clients

**Step 2: Update Swagger documentation path**

In `packages/api/src/main.ts`, update Swagger setup (around line 80):

```typescript
// BEFORE:
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

// AFTER:
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('v1/api/docs', app, document); // Swagger docs at /v1/api/docs
```

**Step 3: Update frontend API client base path**

In `packages/web/src/lib/api.ts`, update the base URL (line 3):

```typescript
// BEFORE (line 3):
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

// AFTER:
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
```

**Step 4: Create API versioning strategy document**

Create `docs/api-versioning-strategy.md`:

```markdown
# API Versioning Strategy

## Current Version: v1

**Base URL:** `https://api.mychristiancounselor.online/v1`

**Effective Date:** 2026-01-17

## Versioning Approach

**URI Path Versioning:** Version number in URL path (e.g., `/v1/auth/login`, `/v2/auth/login`)

**Why URI Path Versioning?**
- Clear and explicit (version visible in URL)
- Easy to test and debug (can call v1 and v2 separately)
- Works with all HTTP clients (no custom headers needed)
- Simple to document (Swagger shows version in path)
- Compatible with API gateways and proxies

## Version Lifecycle

### Active Versions

**v1 (Current):**
- Status: Active, fully supported
- Released: 2026-01-17
- Sunset Date: TBD (no plans to deprecate)
- Documentation: https://api.mychristiancounselor.online/v1/api/docs

### Version Support Policy

**Support Phases:**

1. **Active Support** (indefinite)
   - Bug fixes applied
   - Security patches applied
   - New features may be added (non-breaking)
   - Full documentation maintained

2. **Deprecated** (12 months minimum)
   - No new features
   - Critical bug fixes only
   - Security patches applied
   - Sunset date announced
   - Migration guide provided
   - Deprecation warnings in API responses (header: `X-API-Deprecated: true`)

3. **Sunset** (end of life)
   - Version removed
   - Returns 410 Gone for all requests
   - Redirect header provided (header: `X-API-Redirect: /v{new_version}/...`)

**Minimum Support Period:** 12 months from deprecation announcement to sunset

## Breaking Changes

**What Constitutes a Breaking Change:**

- Removing an endpoint
- Removing a required field from request
- Adding a required field to request (without default)
- Changing field data type (string → number)
- Changing HTTP method (GET → POST)
- Changing response structure (nested object becomes array)
- Changing authentication method
- Changing error codes or structure

**What is NOT a Breaking Change:**

- Adding a new endpoint
- Adding optional fields to request
- Adding fields to response
- Adding new error codes (with existing ones still valid)
- Performance improvements
- Internal implementation changes
- Fixing bugs that made API non-compliant with docs

## Creating a New Version (Future)

**When to Create v2:**

Create a new major version when:
- Multiple breaking changes have accumulated
- Major feature requires breaking changes
- Security requires breaking change
- Minimum 6 months since last major version

**Process:**

1. **Planning Phase** (1 month before)
   - Document all breaking changes
   - Write migration guide
   - Create v2 branch in repository
   - Update Swagger docs for v2

2. **Development Phase**
   - Implement v2 changes in separate controllers/services
   - v1 and v2 coexist in same codebase
   - Share business logic where possible (use services, not controllers)
   - Write v2 tests

3. **Beta Phase** (1 month)
   - Deploy v2 to production (alongside v1)
   - Announce v2 beta to API consumers
   - Collect feedback
   - Fix issues

4. **Release Phase**
   - Announce v2 GA (general availability)
   - Mark v1 as deprecated (12-month sunset countdown)
   - Add deprecation warnings to v1 responses
   - Provide migration guide and tools

5. **Sunset Phase** (after 12+ months)
   - Remove v1 controllers/routes
   - Keep v1 test suite for regression testing v2
   - Archive v1 documentation

## Version Detection

**Client Should:**
- Always specify version in URL path
- Never rely on default version (future-proof)
- Handle 410 Gone gracefully (version sunset)
- Follow `X-API-Redirect` header when present

**Server Provides:**
- `X-API-Version: 1` header in all responses
- `X-API-Deprecated: true` header when version deprecated
- `X-API-Sunset: 2027-06-01` header with sunset date when deprecated
- `X-API-Redirect: /v2/...` header when version sunset (410 response)

## Implementation Examples

**Current (v1):**
```bash
# All endpoints use /v1/ prefix
GET  https://api.mychristiancounselor.online/v1/auth/login
POST https://api.mychristiancounselor.online/v1/books
GET  https://api.mychristiancounselor.online/v1/counsel/sessions
```

**Health Checks (Unversioned):**
```bash
# Health checks remain unversioned for Lightsail
GET https://api.mychristiancounselor.online/health
GET https://api.mychristiancounselor.online/health/ready
GET https://api.mychristiancounselor.online/health/live
```

**Future v2 (Example):**
```bash
# When v2 is released
GET https://api.mychristiancounselor.online/v2/auth/login
GET https://api.mychristiancounselor.online/v1/auth/login  # Still works (deprecated)
```

## Testing Strategy

**Test All Versions:**
- E2E tests run against all active versions
- Each version has separate test suite
- Shared test utilities for common setup

**Version-Specific Tests:**
```typescript
describe('Auth API v1', () => {
  const BASE_URL = 'http://localhost:3697/v1';

  it('POST /auth/login returns access token', async () => {
    const response = await request(BASE_URL)
      .post('/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.headers['x-api-version']).toBe('1');
  });
});
```

## Client Migration Guide Template

**When v2 is Released:**

```markdown
# Migrating from v1 to v2

## Timeline
- v2 Beta: 2027-01-01
- v2 GA: 2027-02-01
- v1 Deprecated: 2027-02-01
- v1 Sunset: 2028-02-01 (12 months)

## Breaking Changes

### 1. Auth Endpoint Consolidation
**v1:** `/auth/login`, `/auth/register`, `/auth/refresh`
**v2:** `/auth` (single endpoint with `action` parameter)

**Migration:**
```javascript
// v1 (old)
POST /v1/auth/login
{ email, password }

// v2 (new)
POST /v2/auth
{ action: 'login', email, password }
```

[More breaking changes...]

## Automated Migration Tool
```bash
npm install -g @mychristiancounselor/api-migrator
api-migrator upgrade --from v1 --to v2 --check-only
```
```

---

## Unversioned Endpoints

The following endpoints remain unversioned (no `/v1/` prefix):

- `/health` - Lightsail health check
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

**Rationale:** Lightsail health check configuration points to `/health` and cannot be easily updated. Versioning health checks provides no value (they never change structure).

---

## References

- [Microsoft API Versioning Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#12-versioning)
- [NestJS Versioning Documentation](https://docs.nestjs.com/techniques/versioning)
- [Semantic Versioning](https://semver.org/)
```

**Step 5: Create API version decorator (for future use)**

Create `packages/api/src/common/decorators/api-version.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

/**
 * API Version Decorator
 *
 * Marks a controller or route as belonging to a specific API version.
 * Currently all routes are v1. This decorator is for future use when v2 is needed.
 *
 * @example
 * ```typescript
 * @Controller('auth')
 * @ApiVersion('1')  // This controller is v1 only
 * export class AuthControllerV1 { }
 *
 * @Controller('auth')
 * @ApiVersion('2')  // This controller is v2 only
 * export class AuthControllerV2 { }
 * ```
 */
export const ApiVersion = (version: string) => SetMetadata('api-version', version);

/**
 * Check if route belongs to specified version
 */
export const getApiVersion = (metadata: any): string | undefined => {
  return metadata ? metadata['api-version'] : undefined;
};
```

**Step 6: Update all environment files with new API URL**

Update `.env.development` (if exists):
```bash
# Add /v1 to API URL
NEXT_PUBLIC_API_URL=http://localhost:3697
# Frontend API client will append /v1 automatically
```

Update `.env.production` (if exists):
```bash
# Production already handled by lightsail-web-deployment.json
# which sets NEXT_PUBLIC_API_URL at build time
```

**Step 7: Test API versioning locally**

Start API and Web servers:
```bash
# Terminal 1: Start API
cd packages/api
npx nx serve api

# Terminal 2: Start Web
cd packages/web
npx nx serve web
```

Test versioned endpoints:
```bash
# Should work (v1 prefix)
curl http://localhost:3697/v1/health

# Should work (unversioned health check)
curl http://localhost:3697/health

# Should fail (old path without version)
curl http://localhost:3697/auth/login
# Expected: 404 Not Found
```

**Step 8: Run all tests to ensure no breakage**

```bash
# Run API tests
cd packages/api
npx nx test api

# Run Web tests
cd packages/web
npx nx test web

# Run E2E tests
npx nx e2e api-e2e
npx nx e2e web-e2e
```

Expected: All tests pass (may need to update test URLs with /v1/)

**Step 9: Commit API versioning changes**

```bash
git add packages/api/src/main.ts
git add packages/web/src/lib/api.ts
git add packages/api/src/common/decorators/api-version.decorator.ts
git add docs/api-versioning-strategy.md
git commit -m "feat(api): implement API versioning with /v1/ prefix

- Add global /v1/ prefix to all API routes (except health checks)
- Update frontend API client to use /v1/ base path
- Update Swagger docs to /v1/api/docs
- Add comprehensive API versioning strategy documentation
- Create ApiVersion decorator for future v2 implementation

BREAKING CHANGE: All API endpoints now require /v1/ prefix.
Health check endpoints remain unversioned (/health, /health/ready, /health/live).

Migration: Update all API calls to include /v1/ prefix.
Example: POST /auth/login → POST /v1/auth/login

Frontend API client updated automatically (no frontend code changes needed)."
```

---

## Task 4: Update Tests for API Versioning

**Files:**
- Modify: `packages/api-e2e/src/api/api.spec.ts` (and other E2E test files)
- Create: `packages/api/src/common/interceptors/api-version-header.interceptor.ts`

**Step 1: Create API version header interceptor**

Create `packages/api/src/common/interceptors/api-version-header.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Adds API version headers to all responses
 *
 * Headers added:
 * - X-API-Version: 1 (current version)
 * - X-API-Deprecated: true (if deprecated, not used yet)
 * - X-API-Sunset: YYYY-MM-DD (if deprecated, not used yet)
 */
@Injectable()
export class ApiVersionHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // Add current version header
    response.setHeader('X-API-Version', '1');

    // TODO: When v2 is released and v1 deprecated, add:
    // response.setHeader('X-API-Deprecated', 'true');
    // response.setHeader('X-API-Sunset', '2027-06-01');

    return next.handle();
  }
}
```

**Step 2: Register interceptor globally**

In `packages/api/src/app/app.module.ts`, add to providers array:

```typescript
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiVersionHeaderInterceptor } from './common/interceptors/api-version-header.interceptor';

@Module({
  providers: [
    // ... existing providers
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiVersionHeaderInterceptor,
    },
  ],
})
```

**Step 3: Update E2E tests to use /v1/ prefix**

Find all E2E test files and update URLs:

```bash
# Find all E2E test files
find packages/api-e2e -name "*.spec.ts" -o -name "*.e2e-spec.ts"
```

For each test file, update requests:

```typescript
// BEFORE:
describe('Auth E2E', () => {
  it('should login successfully', () => {
    return request(app.getHttpServer())
      .post('/auth/login')  // OLD PATH
      .send({ email, password })
      .expect(200);
  });
});

// AFTER:
describe('Auth E2E', () => {
  it('should login successfully', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')  // NEW PATH with /v1/
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-api-version']).toBe('1');  // Check version header
      });
  });
});
```

**Step 4: Create helper function for versioned URLs in tests**

Create `packages/api-e2e/src/support/test-helpers.ts`:

```typescript
/**
 * Get versioned API path
 * @param path - API path without version (e.g., '/auth/login')
 * @param version - API version (default: '1')
 * @returns Versioned path (e.g., '/v1/auth/login')
 */
export function getApiPath(path: string, version: string = '1'): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `/v${version}/${cleanPath}`;
}

/**
 * Get unversioned health check path
 * Health checks remain unversioned for Lightsail compatibility
 */
export function getHealthCheckPath(path: 'health' | 'health/ready' | 'health/live'): string {
  return `/${path}`;
}

// Usage examples:
// getApiPath('auth/login') → '/v1/auth/login'
// getApiPath('auth/login', '2') → '/v2/auth/login'
// getHealthCheckPath('health') → '/health' (unversioned)
```

**Step 5: Update all E2E tests to use helper**

Example update:

```typescript
import { getApiPath, getHealthCheckPath } from '../support/test-helpers';

describe('Auth E2E', () => {
  it('should login successfully', () => {
    return request(app.getHttpServer())
      .post(getApiPath('auth/login'))  // Use helper
      .send({ email, password })
      .expect(200);
  });
});

describe('Health E2E', () => {
  it('should return health status', () => {
    return request(app.getHttpServer())
      .get(getHealthCheckPath('health'))  // Use unversioned helper
      .expect(200);
  });
});
```

**Step 6: Run E2E tests**

```bash
npx nx e2e api-e2e
```

Expected: All tests pass

**Step 7: Commit test updates**

```bash
git add packages/api/src/common/interceptors/api-version-header.interceptor.ts
git add packages/api/src/app/app.module.ts
git add packages/api-e2e/src/support/test-helpers.ts
git add packages/api-e2e/src/**/*.spec.ts
git commit -m "test: update E2E tests for API versioning

- Add API version header interceptor (X-API-Version: 1)
- Create test helpers for versioned and unversioned paths
- Update all E2E tests to use /v1/ prefix
- Verify version headers in test assertions"
```

---

## Task 5: Documentation and Deployment

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (if exists)
- Create: `docs/deployment/2026-01-17-infrastructure-hardening-deployment.md`

**Step 1: Update CLAUDE.md with new information**

Add new section to `CLAUDE.md`:

```markdown
## API Versioning (2026-01-17)

**Current Version:** v1

**All API endpoints** now require `/v1/` prefix:
- ✅ `/v1/auth/login` (correct)
- ❌ `/auth/login` (incorrect, 404 Not Found)

**Health checks remain unversioned:**
- `/health`, `/health/ready`, `/health/live` (no version prefix)

**Frontend:** API client automatically appends `/v1/` to base URL. No code changes needed.

**Swagger Docs:** https://api.mychristiancounselor.online/v1/api/docs

**See:** `docs/api-versioning-strategy.md` for full versioning strategy.
```

**Step 2: Create deployment runbook**

Create `docs/deployment/2026-01-17-infrastructure-hardening-deployment.md`:

```markdown
# Infrastructure Hardening Deployment Guide

**Date:** 2026-01-17
**Changes:** Rate limiting, Redis eviction policy, API versioning
**Risk Level:** Medium (infrastructure changes, requires downtime for Redis restart)
**Estimated Downtime:** 5-10 minutes (for Redis restart)

---

## Pre-Deployment Checklist

- [ ] Review all changes in this PR
- [ ] All tests passing in CI/CD
- [ ] Staging environment tested (if available)
- [ ] Redis memory usage verified (<80% of 128MB currently)
- [ ] Communication sent to users about brief downtime
- [ ] Backup of current Lightsail deployment config saved

---

## Deployment Steps

### Step 1: Backup Current Configuration

```bash
# Backup current API deployment config
cp lightsail-api-deployment.json lightsail-api-deployment.json.backup.$(date +%Y%m%d)

# Backup current Web deployment config (if needed)
cp lightsail-web-deployment.json lightsail-web-deployment.json.backup.$(date +%Y%m%d)
```

### Step 2: Verify Lightsail Services Are Running

```bash
# Check API service status
aws lightsail get-container-services \
  --service-name api \
  --region us-east-2 \
  --query 'containerServices[0].state' \
  --output text

# Should output: RUNNING
```

### Step 3: Build and Push API Container (with rate limiting and versioning)

```bash
# Navigate to project root
cd /path/to/mychristiancounselor

# Clear NX cache (required to force rebuild)
npx nx reset

# Build API with production environment variables
npx nx build api

# Build Docker image with new tag
docker build -f Dockerfile.api-prebuilt -t api:infrastructure-hardening .

# Push to Lightsail
aws lightsail push-container-image \
  --service-name api \
  --label infrastructure-hardening \
  --image api:infrastructure-hardening \
  --region us-east-2

# Note the full image name from output (needed for deployment JSON)
# Example: :api.infrastructure-hardening.X
```

### Step 4: Update API Deployment JSON

Update `lightsail-api-deployment.json` with new image:

```json
{
  "containers": {
    "api": {
      "image": ":api.infrastructure-hardening.X",  // Use image name from Step 3
      // ... rest of config unchanged
    },
    "redis": {
      // Redis config already updated in code
      "image": "redis:7-alpine",
      "command": [
        "redis-server",
        "--maxmemory", "256mb",
        "--maxmemory-policy", "noeviction",
        "--appendonly", "yes",
        "--appendfsync", "everysec"
      ]
    }
  }
}
```

### Step 5: Deploy API Service (includes Redis restart)

```bash
# Deploy API with new configuration
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2

# Monitor deployment status
watch -n 10 'aws lightsail get-container-services --service-name api --region us-east-2 --query "containerServices[0].state" --output text'

# Wait for status to change: DEPLOYING → RUNNING (5-10 minutes)
```

**Note:** This will restart Redis with new eviction policy. Brief downtime expected (<1 minute).

### Step 6: Build and Push Web Container (with API versioning)

```bash
# Clear NX cache
npx nx reset

# Build Web with production environment variables
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --skip-nx-cache

# Verify API URL is baked into bundle (should show /v1 appended)
grep -r "api.mychristiancounselor.online" packages/web/.next/ | head -3

# Build Docker image
docker build -f Dockerfile.web-prebuilt -t web:infrastructure-hardening .

# Push to Lightsail
aws lightsail push-container-image \
  --service-name web \
  --label infrastructure-hardening \
  --image web:infrastructure-hardening \
  --region us-east-2

# Note the full image name from output
# Example: :web.infrastructure-hardening.X
```

### Step 7: Update Web Deployment JSON

Update `lightsail-web-deployment.json` with new image:

```json
{
  "containers": {
    "web": {
      "image": ":web.infrastructure-hardening.X",  // Use image name from Step 6
      // ... rest of config unchanged
    }
  }
}
```

### Step 8: Deploy Web Service

```bash
# Deploy Web
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2

# Monitor deployment
watch -n 10 'aws lightsail get-container-services --service-name web --region us-east-2 --query "containerServices[0].state" --output text'

# Wait for: DEPLOYING → RUNNING (3-5 minutes)
```

---

## Post-Deployment Verification

### Step 1: Verify API Health

```bash
# Check unversioned health endpoint (should work)
curl -i https://api.mychristiancounselor.online/health

# Expected: HTTP 200, JSON with { status: "ok" }
```

### Step 2: Verify API Versioning

```bash
# Check versioned endpoint (should work)
curl -i https://api.mychristiancounselor.online/v1/health

# Expected: HTTP 200, header "X-API-Version: 1"

# Check old path without version (should fail)
curl -i https://api.mychristiancounselor.online/auth/login

# Expected: HTTP 404 Not Found
```

### Step 3: Verify Rate Limiting

```bash
# Test rate limiting (should throttle after 100 requests)
for i in {1..105}; do
  curl -s -w "%{http_code}\n" https://api.mychristiancounselor.online/v1/health -o /dev/null
  sleep 0.1
done

# Expected: First 100 return 200, last 5 return 429 (Too Many Requests)
```

### Step 4: Verify Redis Configuration

```bash
# Get Redis container logs
aws lightsail get-container-log \
  --service-name api \
  --container-name redis \
  --region us-east-2 \
  | grep -E "maxmemory|maxmemory-policy|appendonly"

# Expected output:
# maxmemory: 256mb
# maxmemory-policy: noeviction
# appendonly: yes
```

### Step 5: Verify BullMQ Queue Health

```bash
# Check queue status via admin endpoint (requires admin auth)
curl -X GET https://api.mychristiancounselor.online/v1/admin/queue/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: JSON with queue stats (waiting, active, completed, failed counts)
```

### Step 6: Test Frontend

```bash
# Open web app
open https://www.mychristiancounselor.online

# Test login flow
# Expected: Login works normally (API client handles /v1/ automatically)
```

### Step 7: Monitor Error Rates

```bash
# Check Sentry for errors in last 15 minutes
# https://sentry.io/organizations/mychristiancounselor/issues/

# Expected: No new errors related to 404s or rate limiting
```

---

## Rollback Procedure

If issues are detected, rollback to previous deployment:

### Rollback API

```bash
# Restore backup config
cp lightsail-api-deployment.json.backup.YYYYMMDD lightsail-api-deployment.json

# Deploy previous version
aws lightsail create-container-service-deployment \
  --service-name api \
  --cli-input-json file://lightsail-api-deployment.json \
  --region us-east-2
```

### Rollback Web

```bash
# Restore backup config
cp lightsail-web-deployment.json.backup.YYYYMMDD lightsail-web-deployment.json

# Deploy previous version
aws lightsail create-container-service-deployment \
  --service-name web \
  --cli-input-json file://lightsail-web-deployment.json \
  --region us-east-2
```

---

## Post-Deployment Monitoring

**First 24 Hours:**

1. **Monitor Redis Memory Usage:**
   ```bash
   # Check every 4 hours
   aws lightsail get-container-log --service-name api --container-name redis --region us-east-2 | grep "used_memory_human"
   ```
   Alert if >205MB (80% of 256MB)

2. **Monitor Rate Limiting:**
   Check Sentry for `ThrottlerException` errors
   Alert if >10 per hour (may indicate too-aggressive limits)

3. **Monitor API Errors:**
   Check Sentry for 404 errors
   Alert if significant increase (may indicate frontend not updated)

4. **Monitor Job Queue:**
   Check admin queue dashboard
   Alert if failed jobs increase significantly

**First Week:**

- Review rate limiting effectiveness (are legitimate users being throttled?)
- Review Redis memory trends (is 256MB sufficient?)
- Review API versioning adoption (are clients using /v1/?)
- Collect user feedback on any issues

---

## Communication Template

**Pre-Deployment (1 hour before):**

> Subject: Scheduled Maintenance - MyChristianCounselor Platform
>
> We will be performing system maintenance on [DATE] at [TIME] [TIMEZONE].
>
> Expected downtime: 5-10 minutes
>
> Changes:
> - Enhanced security (rate limiting)
> - Improved system reliability (Redis optimization)
> - API infrastructure improvements
>
> The platform will be temporarily unavailable during this window.
>
> Thank you for your patience!

**Post-Deployment (after verification):**

> Subject: Maintenance Complete - MyChristianCounselor Platform
>
> System maintenance completed successfully at [TIME].
>
> The platform is now fully operational with enhanced security and reliability.
>
> If you experience any issues, please contact support.
>
> Thank you!

---

## Success Criteria

- [ ] API health checks passing
- [ ] API versioning working (/v1/ required)
- [ ] Rate limiting active (429 responses after limit)
- [ ] Redis using noeviction policy
- [ ] Redis memory at 256MB
- [ ] AOF persistence enabled
- [ ] BullMQ queues processing jobs
- [ ] Frontend login working
- [ ] No error spike in Sentry
- [ ] No user complaints in first 2 hours

---

## Contact Information

**On-Call Engineer:** [Name]
**Backup:** [Name]
**Escalation:** [Name]

**Emergency Rollback Authority:** Platform Admin or CTO
```

**Step 3: Commit documentation**

```bash
git add CLAUDE.md
git add docs/deployment/2026-01-17-infrastructure-hardening-deployment.md
git commit -m "docs: add infrastructure hardening deployment guide

- Update CLAUDE.md with API versioning information
- Create comprehensive deployment runbook
- Include pre-deployment checklist
- Document verification steps
- Add rollback procedures
- Include monitoring guidance
- Add communication templates"
```

---

## Task 6: Final Integration Test

**Step 1: Run complete test suite**

```bash
# API unit tests
npx nx test api

# API E2E tests
npx nx e2e api-e2e

# Web unit tests
npx nx test web

# Web E2E tests
npx nx e2e web-e2e

# Lint all code
npx nx run-many --target=lint --all
```

Expected: All tests pass

**Step 2: Build both applications**

```bash
# Build API
npx nx build api

# Build Web
NEXT_PUBLIC_API_URL=http://localhost:3697 npx nx build web
```

Expected: Both builds succeed

**Step 3: Manual integration test**

Start both services and test manually:

```bash
# Terminal 1: API
npx nx serve api

# Terminal 2: Web
npx nx serve web

# Terminal 3: Test requests
# Test health (unversioned)
curl http://localhost:3697/health

# Test versioned endpoint
curl http://localhost:3697/v1/health

# Test rate limiting
for i in {1..105}; do curl -s -w "%{http_code}\n" http://localhost:3697/v1/health -o /dev/null; done

# Test frontend
open http://localhost:3699
# Manually test login, navigation, book search
```

**Step 4: Create final commit**

```bash
# Check all changes
git status

# Add any remaining files
git add -A

# Final commit
git commit -m "chore: infrastructure hardening complete

All three enhancements implemented and tested:
1. Rate limiting re-enabled with production limits
2. Redis eviction policy changed to noeviction
3. API versioning implemented with /v1/ prefix

Ready for deployment to production."
```

**Step 5: Create pull request**

```bash
# Push to remote
git push origin infrastructure-hardening

# Create PR (if using GitHub CLI)
gh pr create \
  --title "Infrastructure Hardening: Rate Limiting, Redis Eviction, API Versioning" \
  --body "$(cat <<EOF
## Summary

Three critical infrastructure improvements:

1. **Rate Limiting Re-Enabled**
   - Production limits: 100 req/min default, 20 req/min auth, 50 req/min webhooks
   - Prevents DDoS attacks and brute force attempts
   - ThrottlerGuard enabled globally

2. **Redis Eviction Policy Fixed**
   - Changed from allkeys-lru to noeviction
   - Prevents BullMQ job data loss
   - Increased memory limit to 256MB
   - Enabled AOF persistence

3. **API Versioning Implemented**
   - All endpoints now require /v1/ prefix
   - Health checks remain unversioned
   - Frontend updated automatically
   - Comprehensive versioning strategy documented

## Testing

- [x] All unit tests passing
- [x] All E2E tests passing
- [x] Manual integration testing complete
- [x] Rate limiting verified (429 after 100 requests)
- [x] Redis configuration updated
- [x] API versioning working

## Deployment

See \`docs/deployment/2026-01-17-infrastructure-hardening-deployment.md\` for deployment guide.

**Estimated downtime:** 5-10 minutes (for Redis restart)

## Checklist

- [x] Code complete
- [x] Tests passing
- [x] Documentation updated
- [x] Deployment guide created
- [x] CLAUDE.md updated
- [ ] PR approved
- [ ] Ready to deploy

## Breaking Changes

- All API endpoints require /v1/ prefix
- Frontend API client updated automatically
- No frontend code changes needed

EOF
)" \
  --base main
```

---

## Completion Checklist

- [ ] Task 1: Rate limiting re-enabled ✓
- [ ] Task 2: Redis eviction policy fixed ✓
- [ ] Task 3: API versioning implemented ✓
- [ ] Task 4: Tests updated for versioning ✓
- [ ] Task 5: Documentation complete ✓
- [ ] Task 6: Integration testing complete ✓
- [ ] All tests passing
- [ ] Deployment guide created
- [ ] Pull request created
- [ ] Ready for code review

---

**Estimated Total Time:** 4-6 hours (including testing)

**Risk Assessment:** Medium
- Rate limiting: Low risk (can be disabled if issues)
- Redis eviction: Medium risk (requires restart, brief downtime)
- API versioning: Low risk (frontend handles automatically)

**Deployment Window:** Off-peak hours recommended (evening or weekend)
