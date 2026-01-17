# API Versioning Strategy

## Overview

MyChristianCounselor API uses **URI Path Versioning** to maintain backward compatibility as the API evolves. All API endpoints (except health checks) are prefixed with a version number (e.g., `/v1/`).

**Current Version:** v1
**Implementation Date:** 2026-01-16
**Status:** Active

## Why API Versioning?

As our platform evolves, we need to make changes to the API without breaking existing clients:

- **Mobile apps** may not update immediately when we deploy backend changes
- **Third-party integrations** depend on stable contracts
- **Web clients** cached in CDNs or browsers may be out of sync
- **Breaking changes** (schema changes, renamed fields, removed endpoints) require time for clients to migrate

API versioning allows us to:
1. Introduce breaking changes in v2 while keeping v1 stable
2. Give clients predictable deprecation timelines
3. Maintain multiple versions simultaneously during migration periods
4. Test new features in v2 without affecting v1 stability

## Versioning Approach

### URI Path Versioning

We use URI path versioning where the version is part of the URL path:

```
https://api.mychristiancounselor.online/v1/auth/login
https://api.mychristiancounselor.online/v1/counsel/sessions
https://api.mychristiancounselor.online/v1/books
```

**Why URI Path over Header Versioning?**
- **Visibility:** Version is immediately clear in URLs and logs
- **Simplicity:** Works with all HTTP clients (curl, browsers, tools)
- **Caching:** CDNs and proxies can cache different versions correctly
- **Testing:** Easy to test multiple versions in parallel
- **Documentation:** Swagger/OpenAPI naturally supports path-based versioning

### Global Prefix

All routes automatically get the `/v1/` prefix via NestJS `app.setGlobalPrefix()`:

```typescript
app.setGlobalPrefix('v1', {
  exclude: [
    'health',           // /health
    'health/ready',     // /health/ready
    'health/live',      // /health/live
  ],
});
```

**Health checks are unversioned** because:
- AWS Lightsail and other load balancers expect fixed health check URLs
- Health checks don't expose business logic or data models
- Breaking changes to health checks are unlikely

## What Constitutes a Breaking Change?

A **breaking change** requires a new major version (v1 → v2). Examples include:

### Data Model Changes
- **Removing a field** from a response
- **Renaming a field** (even if semantically equivalent)
- **Changing a field type** (string → number, date format changes)
- **Making a required field optional** (clients may depend on presence)
- **Changing response structure** (flat → nested, array → object)

### Endpoint Changes
- **Removing an endpoint**
- **Changing HTTP method** (GET → POST)
- **Changing URL path structure** (`/users/:id` → `/accounts/:id`)
- **Changing required parameters** (adding new required param, removing param)

### Behavior Changes
- **Authentication/authorization changes** (new permissions required)
- **Validation rules tightened** (stricter input validation)
- **Error response format changes**
- **Rate limiting reduction**
- **Semantic changes** (same endpoint, different behavior)

## Non-Breaking Changes (Safe in v1)

These changes can be made to v1 without breaking clients:

### Additive Changes
- **Adding new endpoints**
- **Adding optional fields** to requests (with defaults)
- **Adding new fields** to responses (clients ignore unknown fields)
- **Adding new query parameters** (optional)
- **Adding new HTTP headers** (optional)

### Improvements
- **Performance optimizations** (same behavior, faster)
- **Bug fixes** (fixing behavior to match documentation)
- **Error message improvements** (clearer messages, same HTTP codes)
- **Internal refactoring** (no API surface changes)

### Relaxations
- **Loosening validation** (accepting more input formats)
- **Increasing rate limits**
- **Expanding permissions** (making restricted endpoints more accessible)

## Version Lifecycle

### Phase 1: Active Development (v1 - Current)
- **Status:** Stable, actively developed
- **Support:** Full support, new features added
- **Breaking changes:** Not allowed
- **Non-breaking changes:** Allowed and encouraged
- **Timeline:** Indefinite (until v2 is needed)

### Phase 2: Deprecation (Future)
When v2 is introduced, v1 will enter deprecation:
- **Status:** Deprecated
- **Support:** Bug fixes and security patches only
- **New features:** Only in v2
- **Timeline:** 12 months minimum
- **Communication:** Deprecation warnings in responses, emails to API consumers

### Phase 3: Sunset (Future)
After deprecation period ends:
- **Status:** Retired
- **Support:** None
- **Action:** All v1 endpoints return 410 Gone with migration instructions
- **Timeline:** 6 months after deprecation notice

## Creating v2 (Future Process)

When breaking changes are necessary, follow this process:

### 1. Plan Breaking Changes
Document all breaking changes needed:
```markdown
## v2 Breaking Changes
- Remove `/v1/auth/legacy-login` endpoint
- Rename `userId` → `user.id` in all responses
- Change date format from Unix timestamps to ISO 8601
- Require `organizationId` for all counselor endpoints
```

### 2. Implement v2 Routes
Create v2 controllers alongside v1:

```typescript
// v1/auth.controller.ts
@Controller('auth')  // Served at /v1/auth
@ApiVersion('1')
export class AuthControllerV1 {
  @Post('login')
  async login() { /* v1 logic */ }
}

// v2/auth.controller.ts
@Controller('auth')  // Served at /v2/auth
@ApiVersion('2')
export class AuthControllerV2 {
  @Post('login')
  async login() { /* v2 logic with breaking changes */ }
}
```

### 3. Enable v2 Global Prefix
Update `main.ts` to support both versions:

```typescript
// Option A: Multiple prefixes (requires routing changes)
app.setGlobalPrefix('v1');
app.setGlobalPrefix('v2');

// Option B: Version-specific modules
app.setGlobalPrefix('v1', { include: [V1Module] });
app.setGlobalPrefix('v2', { include: [V2Module] });
```

### 4. Update Documentation
- Create separate Swagger docs for v1 and v2
- Document migration guide in `docs/api-migration-v1-to-v2.md`
- Update frontend to use v2 endpoints
- Communicate changes to API consumers

### 5. Deprecation Period
- Add deprecation warnings to v1 responses:
  ```json
  {
    "data": { ... },
    "deprecation": {
      "version": "v1",
      "sunset": "2027-01-16",
      "upgradeUrl": "https://api.mychristiancounselor.online/v2",
      "migrationGuide": "https://docs.mychristiancounselor.online/api-migration"
    }
  }
  ```
- Monitor v1 usage via logging/metrics
- Email API consumers with migration timeline

### 6. Sunset v1
After 12-month deprecation period:
- Update v1 routes to return 410 Gone:
  ```json
  {
    "statusCode": 410,
    "message": "API v1 has been retired. Please upgrade to v2.",
    "upgradeUrl": "https://api.mychristiancounselor.online/v2",
    "migrationGuide": "https://docs.mychristiancounselor.online/api-migration"
  }
  ```
- Remove v1 controller code in next major release
- Archive v1 documentation for historical reference

## Testing Strategy

### Current (v1 Only)

All E2E tests use v1 endpoints:
```typescript
// test/auth.e2e-spec.ts
it('POST /v1/auth/login', async () => {
  return request(app.getHttpServer())
    .post('/v1/auth/login')  // v1 prefix
    .send({ email, password })
    .expect(200);
});
```

### Future (v1 + v2)

When v2 is introduced, run parallel test suites:

```typescript
// test/v1/auth.e2e-spec.ts (v1 tests)
describe('API v1 - Auth (Deprecated)', () => {
  it('POST /v1/auth/login', async () => { ... });
});

// test/v2/auth.e2e-spec.ts (v2 tests)
describe('API v2 - Auth', () => {
  it('POST /v2/auth/login', async () => { ... });
});
```

Run both test suites in CI/CD until v1 is sunset.

## Client Migration Guide (Template)

When v2 is released, provide this guide to API consumers:

### Base URL Changes
```diff
- const API_URL = 'https://api.mychristiancounselor.online/v1';
+ const API_URL = 'https://api.mychristiancounselor.online/v2';
```

### Authentication Changes
```diff
- POST /v1/auth/login
+ POST /v2/auth/login
```

### Response Structure Changes
```diff
// v1 Response
{
-  "userId": "123",
-  "email": "user@example.com"
}

// v2 Response
{
+  "user": {
+    "id": "123",
+    "email": "user@example.com"
+  }
}
```

### Date Format Changes
```diff
// v1: Unix timestamp
- "createdAt": 1642464000

// v2: ISO 8601
+ "createdAt": "2022-01-18T00:00:00.000Z"
```

### Breaking Changes Checklist
- [ ] Update base URL to `/v2`
- [ ] Update response parsing (field renames, structure changes)
- [ ] Update request payloads (required fields, validation rules)
- [ ] Update date/time handling
- [ ] Test all API calls end-to-end
- [ ] Update error handling (new error codes)

### Migration Timeline
- **v2 Release:** 2027-01-16 (example)
- **v1 Deprecation:** 2027-01-16 (12 months to migrate)
- **v1 Sunset:** 2028-01-16 (v1 returns 410 Gone)

### Support
For migration assistance, contact:
- Email: support@mychristiancounselor.online
- Docs: https://docs.mychristiancounselor.online/api-migration
- Slack: #api-v2-migration

## Monitoring & Observability

### Metrics to Track

When multiple versions are active, monitor:

1. **Version Distribution**
   - Requests per version (v1 vs v2)
   - Active clients per version
   - Migration progress over time

2. **Error Rates**
   - Error rate by version
   - 404s on old endpoints (clients using removed routes)
   - 410s on sunset endpoints

3. **Performance**
   - Latency by version (ensure v2 isn't slower)
   - Resource usage per version

4. **Client Adoption**
   - Time to upgrade (average days to migrate)
   - Stragglers still on v1 after deprecation notice
   - Clients hitting sunset endpoints

### Logging

Include API version in all logs:

```typescript
logger.log('Request received', {
  version: 'v1',
  method: 'POST',
  endpoint: '/auth/login',
  userId: '123',
});
```

### Alerts

Set up alerts for:
- High error rate on deprecated version
- Clients hitting sunset endpoints (education opportunity)
- Sudden spike in old version usage (regression?)

## Current Implementation Status

### Completed
- ✅ Global `/v1/` prefix for all routes (except health checks)
- ✅ Frontend API client updated to use `/v1/` base URL
- ✅ Swagger documentation moved to `/v1/api/docs`
- ✅ `@ApiVersion()` decorator created for future use
- ✅ Health checks remain unversioned (`/health`, `/health/ready`, `/health/live`)

### Not Yet Implemented (Future)
- ⏸️ Version-specific Swagger docs (only needed when v2 exists)
- ⏸️ Deprecation warning headers (only needed when deprecating v1)
- ⏸️ Version usage metrics (only needed when multiple versions exist)
- ⏸️ v2 implementation (only when breaking changes are necessary)

## FAQ

### Why not use header versioning (Accept: application/vnd.api.v1+json)?
Header versioning is more "RESTful" but less practical:
- Harder to test (can't just paste URL in browser)
- Invisible in URLs and logs (harder to debug)
- CDN caching complexity (must cache on Accept header)
- Poor tooling support (Swagger, Postman, curl)

URI path versioning prioritizes **developer experience** and **operational simplicity**.

### What if a client doesn't specify a version?
All routes require `/v1/` or `/v2/` prefix. Requests to unversioned paths (e.g., `/auth/login`) return 404 Not Found, forcing clients to be explicit about the version they expect.

### Can we have minor versions (v1.1, v1.2)?
No. We use **major versions only** (v1, v2, v3). Minor versions would complicate routing and violate the principle that non-breaking changes are safe to deploy to the current major version.

If you need feature flags or gradual rollouts within a version, use feature toggles or A/B testing, not versioning.

### When should we create v2?
Create v2 only when **absolutely necessary** for business/technical reasons:
- Major architectural changes (GraphQL migration, event-driven API)
- Data model overhaul (user → account refactor)
- Security requirements (OAuth2 → OIDC migration)
- Accumulated technical debt (removing deprecated features)

Avoid creating v2 for minor improvements. Non-breaking changes should stay in v1.

### How long do we support old versions?
- **Minimum 12 months** after deprecation notice
- Longer if usage remains high (monitor metrics)
- Security patches throughout deprecation period
- No new features in deprecated versions

### What about internal APIs (service-to-service)?
Internal APIs (not exposed to external clients) don't need versioning if:
- Both services are deployed together (monorepo)
- Breaking changes are coordinated (same team)
- No external dependencies

If an internal API is used by multiple teams or services with independent deployment cycles, apply the same versioning strategy.

## Conclusion

API versioning is an **insurance policy** against breaking changes. v1 is our current stable version and will remain so until breaking changes are necessary. When that time comes, this strategy provides a clear path to v2 without disrupting existing clients.

**Key Principles:**
1. **Stability First:** v1 remains stable, breaking changes go to v2
2. **Clear Communication:** 12-month deprecation timeline, migration guides, proactive outreach
3. **Parallel Support:** Run v1 and v2 side-by-side during transition
4. **Developer Experience:** URI path versioning for simplicity and visibility
5. **Monitor Progress:** Track version adoption, error rates, and client behavior

For questions or concerns about API versioning, contact the API team or refer to this document.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-16
**Next Review:** When v2 planning begins
**Owner:** Platform Engineering Team
