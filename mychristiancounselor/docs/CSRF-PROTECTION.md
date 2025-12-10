# CSRF Protection Implementation

## Overview

CSRF (Cross-Site Request Forgery) protection prevents malicious websites from making unauthorized requests to our API using a user's credentials.

## Unix Principles Applied

- **Do one thing well**: Validate request origin
- **Fail safely**: Block suspicious requests by default
- **Clear and simple**: Origin/Referer header check

## How It Works

### Defense-in-Depth Strategy

Our application uses JWT tokens stored in localStorage, which is already safer from CSRF attacks than cookies. However, we implement Origin/Referer validation as an additional security layer.

### Guard Implementation

Location: `packages/api/src/common/guards/csrf.guard.ts`

The `CsrfGuard` is applied globally to all API endpoints and:

1. **Allows safe HTTP methods** (GET, HEAD, OPTIONS) without validation
2. **Validates state-changing requests** (POST, PUT, DELETE, PATCH) by checking:
   - Origin header (most reliable)
   - Referer header (fallback)
3. **Respects @Public() decorator** for public endpoints
4. **Logs and blocks** suspicious requests

### Guard Order

In `app.module.ts`, guards execute in this order:

```typescript
1. CsrfGuard      // CSRF protection (validates origin/referer)
2. JwtAuthGuard   // Authentication (JWT validation)
3. ThrottlerGuard // Rate limiting (prevent abuse)
```

## Configuration

### Allowed Origins

The guard uses the `CORS_ORIGIN` environment variable:

```bash
# Development
CORS_ORIGIN=http://localhost:3699

# Production
CORS_ORIGIN=https://app.mychristiancounselor.com,https://www.mychristiancounselor.com
```

### Environment-Specific Behavior

- **Development**: Allows missing Origin/Referer headers (for API testing tools)
- **Production**: Requires at least Origin or Referer header

## Security Features

### What It Protects Against

- Cross-origin requests from malicious websites
- CSRF attacks even with JWT in localStorage
- Unauthorized API calls from untrusted domains

### What It Allows

- Same-origin requests (our frontend to our API)
- Requests from configured CORS_ORIGIN domains
- Safe HTTP methods (GET, HEAD, OPTIONS) from any origin
- Public endpoints marked with @Public() decorator

## Testing

### Test Valid Requests

```bash
# Should succeed - same origin
curl -X POST https://api.mychristiancounselor.com/auth/login \
  -H "Origin: https://app.mychristiancounselor.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should succeed - GET request (safe method)
curl -X GET https://api.mychristiancounselor.com/health
```

### Test Blocked Requests

```bash
# Should fail - wrong origin
curl -X POST https://api.mychristiancounselor.com/auth/login \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Response: 403 Forbidden
# "Request origin validation failed. This request appears to be coming from an unauthorized source."
```

## Troubleshooting

### Users Getting 403 Errors

**Symptom**: Legitimate users getting "Request origin validation failed"

**Possible Causes**:
1. CORS_ORIGIN not configured correctly
2. User accessing from subdomain not in allowed list
3. Browser extension blocking/modifying headers

**Solution**:
1. Check CORS_ORIGIN includes all legitimate domains
2. Verify user is accessing correct URL
3. Check server logs for actual origin received

### API Testing Tools Not Working

**Symptom**: Postman/curl requests blocked in production

**Expected**: In production, requests without Origin/Referer are blocked for security

**Solution**:
- Use development environment for API testing
- Or add Origin header manually: `-H "Origin: https://app.mychristiancounselor.com"`

## Comparison with Other CSRF Protection Methods

| Method | Our App | Notes |
|--------|---------|-------|
| JWT in localStorage | ✅ Yes | Already safer from CSRF |
| Origin/Referer validation | ✅ Yes | Defense in depth |
| CSRF tokens | ❌ No | Not needed with JWT in localStorage |
| SameSite cookies | ❌ No | We don't use cookies for auth |
| Double-submit cookies | ❌ No | We don't use cookies for auth |

## Why This Approach?

1. **JWT in localStorage** - Primary defense
   - CSRF can't read localStorage
   - Only XSS can access it (separate security concern)

2. **Origin/Referer validation** - Additional layer
   - Blocks cross-origin requests
   - Simple, Unix-style single purpose
   - No additional state management needed

3. **No CSRF tokens needed**
   - Would add complexity
   - Would require state management
   - Already protected by Origin validation

## Maintenance

### When to Update CORS_ORIGIN

Update when adding:
- New production domains
- New subdomains (e.g., admin.mychristiancounselor.com)
- Staging environments

### Monitoring

Watch for these log messages:
- `CSRF protection blocked request` - Potential attack or misconfiguration
- `Missing both Origin and Referer headers in production` - Unusual traffic pattern

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Origin Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
