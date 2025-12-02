# Sentry Error Tracking Setup

Sentry provides real-time error tracking and monitoring for production applications.

## Free Tier Benefits
- 5,000 errors per month
- 10,000 performance units per month
- 1 project
- 30-day error retention
- Session replay

Perfect for startups and small applications!

## Setup Instructions

### 1. Create Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create a new project:
   - Platform: Node.js (for API)
   - Platform: Next.js (for Web)

### 2. Get Your DSN
After creating the project, you'll see your DSN (Data Source Name):
```
https://abc123def456@o123456.ingest.sentry.io/789012
```

### 3. Configure Environment Variables

Add to your `.env` file:
```bash
# Backend API (Node.js/NestJS)
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012

# Frontend Web (Next.js) - must be public
NEXT_PUBLIC_SENTRY_DSN=https://xyz789ghi012@o123456.ingest.sentry.io/345678
```

**Note:** Create separate projects in Sentry for API and Web to keep errors organized.

### 4. Test Error Tracking

#### Test API Error Tracking
```bash
# Start API
npm run dev

# Trigger a test error
curl http://localhost:3697/api/test-error
```

Check Sentry dashboard - you should see the error appear within seconds.

#### Test Web Error Tracking
1. Start web app: `npm run dev`
2. Open browser console
3. Type: `throw new Error("Test error")`
4. Check Sentry dashboard

## Features Enabled

### Backend (API)
- ✅ Automatic error tracking
- ✅ Performance monitoring (10% sample rate in production)
- ✅ Request breadcrumbs
- ✅ HTTP integration
- ✅ Sensitive data filtering
- ✅ Express/NestJS integration

### Frontend (Web)
- ✅ Automatic error tracking
- ✅ Performance monitoring
- ✅ Session replay (10% sample rate)
- ✅ React error boundaries
- ✅ Network request breadcrumbs
- ✅ User interaction tracking

## Sensitive Data Protection

### Automatically Filtered
- Passwords
- API keys
- Auth tokens
- Authorization headers
- Cookies
- User IP addresses

### Custom Filtering
Edit `beforeSend` in configuration files:
- `packages/api/src/common/sentry/sentry.config.ts`
- `packages/web/sentry.client.config.ts`
- `packages/web/sentry.server.config.ts`

## Monitoring Best Practices

### 1. Set Up Alerts
In Sentry dashboard:
1. Go to Settings → Alerts
2. Create alert rule:
   - "Send notification when error occurs more than 10 times in 1 hour"
   - Choose Slack, email, or other integration

### 2. Configure Release Tracking
Track which version of your code caused errors:

```bash
# During deployment
export SENTRY_RELEASE=$(git rev-parse HEAD)
```

### 3. Source Maps (for better stack traces)
Already configured! Sentry will automatically upload source maps during build.

### 4. User Context
Associate errors with specific users:

```typescript
// In API
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// In Web
Sentry.setUser({
  id: user.id,
  email: user.email,
});
```

## Common Issues

### Issue: Errors not appearing in Sentry
**Solution:**
1. Check DSN is set correctly
2. Verify internet connectivity
3. Check console for Sentry initialization messages
4. Ensure error actually occurred (not caught silently)

### Issue: Too many errors
**Solution:**
1. Use Sentry's "Ignore" feature for known issues
2. Add errors to `ignoreErrors` array in config
3. Increase sample rate for less critical environments

### Issue: Sensitive data in errors
**Solution:**
1. Review `beforeSend` hook
2. Add fields to filtering logic
3. Use Sentry's PII scrubbing features

## Performance Monitoring

### What's Tracked
- HTTP request duration
- Database query time (via Prisma)
- External API calls
- Custom spans

### View Performance
1. Go to Sentry dashboard
2. Click "Performance" tab
3. View transaction traces
4. Identify slow endpoints

### Add Custom Spans
```typescript
const transaction = Sentry.startTransaction({
  name: 'Complex Operation',
  op: 'task',
});

const span = transaction.startChild({
  op: 'db.query',
  description: 'Fetch user data',
});

// Your code here
await fetchUserData();

span.finish();
transaction.finish();
```

## Session Replay

### Features
- Records user sessions when errors occur
- Helps reproduce bugs
- Privacy-first (all text/media masked)

### Configuration
```typescript
// In sentry.client.config.ts
replaysSessionSampleRate: 0.1,  // 10% of all sessions
replaysOnErrorSampleRate: 1.0,   // 100% when error occurs
```

### Privacy Settings
Already configured to mask:
- All text content
- All images and media
- Form inputs
- Sensitive elements

## Cost Management

### Staying Within Free Tier
- Current configuration uses 10% sampling in production
- Estimated monthly usage:
  - ~500-1,000 errors (well under 5,000 limit)
  - ~1,000-2,000 performance traces
  - ~500-1,000 replays

### If You Exceed Limits
1. **Increase sampling** - reduce `tracesSampleRate` to 0.05 (5%)
2. **Filter errors** - add more rules to `ignoreErrors`
3. **Upgrade plan** - $26/month for 50,000 errors

## Integration with CI/CD

Sentry is already integrated in GitHub Actions workflow!

### What's Included
- Source map uploads
- Release creation
- Deploy notifications

### Manual Release Creation
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create release
sentry-cli releases new $(git rev-parse HEAD)
sentry-cli releases set-commits $(git rev-parse HEAD) --auto
sentry-cli releases finalize $(git rev-parse HEAD)
```

## Disable Sentry

To disable Sentry (e.g., in development):
1. Remove `SENTRY_DSN` from `.env`
2. Or set `NODE_ENV=development` (automatically reduces sampling)

## Support & Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [NestJS Integration](https://docs.sentry.io/platforms/node/guides/nestjs/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Dashboard Widgets

Recommended widgets for your Sentry dashboard:
1. **Error Frequency** - Track error trends
2. **Most Common Errors** - Focus on high-impact issues
3. **Performance** - Monitor slow transactions
4. **User Misery** - Track affected users
5. **Release Health** - Monitor deployment impact
