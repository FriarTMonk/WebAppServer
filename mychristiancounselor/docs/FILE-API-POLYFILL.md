# File API Polyfill - Critical Production Fix

**STATUS**: PERMANENT FIX IN PLACE
**DATE**: December 30, 2025
**ISSUE**: ReferenceError: File is not defined

---

## Problem Description

The API crashes in production with the error:
```
ReferenceError: File is not defined
```

This occurs when `undici` (Node.js's built-in HTTP client used by `fetch`) tries to access the `File` API, which **does not exist natively in Node.js**.

---

## Root Cause

1. **Node.js does not provide a native `File` API** - it only exists in browsers
2. **undici expects `File` to be globally available** when using certain fetch features
3. **This breaks in production** because the runtime environment doesn't polyfill it
4. **Local development may work** due to different module resolution or caching

---

## The Permanent Fix

### Location: `packages/api/src/main.ts` (lines 3-17)

```typescript
// Polyfill File API for undici compatibility
// This is required because undici's fetch implementation expects File to be globally available
// but Node.js doesn't provide it natively. This prevents "File is not defined" errors.
if (typeof global.File === 'undefined') {
  // @ts-ignore - File is not in Node.js global types by default
  global.File = class File extends Blob {
    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
    name: string;
    lastModified: number;
  };
}
```

### Why This Location?

- **Executed BEFORE any imports** - ensures File exists before undici loads
- **At the entry point** - guaranteed to run on application startup
- **Before Sentry initialization** - prevents errors in error reporting

---

## Why This Issue Keeps Recurring

1. **Conversation context loss** - When AI assistance restarts, previous fixes are forgotten
2. **No documentation** - The fix wasn't documented, making it hard to find
3. **Silent failure** - The error only appears in production, not in development
4. **Multiple causes** - Different code paths can trigger the same error

---

## How to Verify the Fix

### 1. Check main.ts has the polyfill:
```bash
grep -A 10 "Polyfill File API" packages/api/src/main.ts
```

### 2. Check production logs for the error:
```bash
aws lightsail get-container-log --service-name api --container-name api --region us-east-2 | grep "File is not defined"
```

### 3. Test API health endpoint:
```bash
curl https://api.mychristiancounselor.online/health/live
```

---

## If the Error Returns

**DO NOT REMOVE OR MODIFY THE POLYFILL IN `main.ts`**

If you see "File is not defined" errors again:

1. **First**, verify the polyfill is still in `main.ts`
2. **Check** if it's being executed before other imports
3. **Ensure** the production build includes the polyfill
4. **Review** the Dockerfile to confirm it's using Node 20+

---

## Related Files

- `packages/api/src/main.ts` - Contains the File polyfill
- `packages/api/Dockerfile` - Has comment referencing this issue
- `docs/FILE-API-POLYFILL.md` - This documentation

---

## Search Keywords

For future reference, this document addresses:
- "File is not defined"
- "ReferenceError: File"
- "undici File API"
- "Node.js File polyfill"
- "global.File"
- "testimonials not running" (symptom of this issue)

---

## Technical Details

### Why Node.js doesn't have File API:

Node.js is a server-side runtime and doesn't need browser APIs like `File`. However, when using modern fetch implementations (like undici), these APIs are expected to exist.

### Why this affects undici:

undici implements the full Fetch API specification, which includes handling `File` objects in request/response bodies. When it tries to check `instanceof File`, it fails because `File` doesn't exist.

### Why the polyfill works:

By extending `Blob` (which Node.js does provide) and adding the `name` and `lastModified` properties, we create a minimal `File` implementation that satisfies undici's expectations.

---

## Deployment Notes

This fix must be deployed with EVERY production update:

1. The polyfill in `main.ts` must be preserved
2. Docker builds must include it
3. No optimization should remove it

**NEVER remove this polyfill without extensive testing in production-like environments.**
