# Production Build Requirements

**CRITICAL: READ THIS BEFORE EVERY PRODUCTION BUILD**

---

## Web Application Build Requirement

### THE RULE: ALWAYS Use `npm run build:web:prod`

**NEVER** build the web application with just `nx build web`. The API URL **MUST** be explicitly passed as an environment variable during the build.

### Why This Matters

Next.js bakes environment variables into the JavaScript bundle at **BUILD TIME**, not runtime. If you don't pass `NEXT_PUBLIC_API_URL` during the build, the production site will try to connect to `http://localhost:3697` and everything will break.

### Symptoms of Wrong Build

- Login shows "Network Error"
- Testimonials say "Loading testimonials..." forever
- Browser console shows: `Cross-Origin Request Blocked: ...http://localhost:3697/...`
- API fetch errors everywhere

---

## Correct Build Commands

### Build Web for Production

```bash
# CORRECT - Uses the npm script with explicit API URL
npm run build:web:prod

# WRONG - Missing API URL, will break in production
nx build web --configuration=production
```

### Build Both Services

```bash
# Build everything for production
npm run build:prod
```

---

## Build Scripts (package.json)

The `package.json` has these scripts specifically to prevent this issue:

```json
{
  "scripts": {
    "build:api:prod": "nx build api --configuration=production",
    "build:web:prod": "NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online NEXT_PUBLIC_SENTRY_DSN=... nx build web --configuration=production --skip-nx-cache",
    "build:prod": "npm run build:api:prod && npm run build:web:prod"
  }
}
```

**ALWAYS use these scripts** - they have the correct environment variables baked in.

---

## Why .env.production Doesn't Work

You might think ".env.production has the API URL, why do I need to pass it?"

**Answer**: Next.js/NX caching and build order issues mean the .env.production file isn't always reliably read. Explicitly passing environment variables on the command line is the ONLY reliable method.

---

## Deployment Checklist

Before deploying to production:

- [ ] Clean build artifacts: `rm -rf packages/web/.next packages/web/dist`
- [ ] Clear NX cache: `npx nx reset`
- [ ] Build with correct command: `npm run build:web:prod`
- [ ] Verify build output doesn't use cache: Look for "existing outputs match the cache, left as is"
- [ ] Build Docker image
- [ ] Push to Lightsail
- [ ] Deploy and test

---

## For Future AI Assistants / Developers

**IF YOU ARE ABOUT TO BUILD THE WEB APPLICATION FOR PRODUCTION:**

1. **STOP**
2. Read this document
3. Use `npm run build:web:prod` NOT `nx build web`
4. If you use any other command, **YOU WILL BREAK PRODUCTION**

This issue has occurred **multiple times**. The solution is documented here. Follow it exactly.

---

## Related Issues

- "File is not defined" - See docs/FILE-API-POLYFILL.md
- "Testimonials not running" - Usually caused by wrong API URL (this document)
- "Login broken" - Usually caused by wrong API URL (this document)

---

## Search Keywords

For future reference, this document addresses:
- "localhost:3697 in production"
- "CORS request did not succeed"
- "Cross-Origin Request Blocked"
- "NetworkError when attempting to fetch"
- "testimonials loading forever"
- "login network error"
- "NEXT_PUBLIC_API_URL"
- "environment variables not working"
