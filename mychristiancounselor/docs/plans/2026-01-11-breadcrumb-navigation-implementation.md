# Breadcrumb Navigation System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single-reference navigation with full breadcrumb trail system that maintains complete navigation context across all user flows.

**Architecture:** Build comma-separated trail in URL query parameter, parse/build trail with utility functions, display as horizontal breadcrumbs with clickable links, integrate throughout all navigation links in app.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Tailwind CSS, useSearchParams, usePathname, useRouter

---

## Phase 1: Core Utilities (Foundation)

### Task 1: Add parseTrail() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add parseTrail() function**

Add after the existing `getPageLabel()` function (~line 172):

```typescript
/**
 * Parse trail query parameter into array of paths
 * Handles malformed input gracefully
 *
 * @param trailParam - Raw trail string from URL (comma-separated paths)
 * @returns Array of paths, empty array if invalid
 *
 * @example
 * parseTrail('/home,/org-admin') → ['/home', '/org-admin']
 * parseTrail('invalid') → []
 * parseTrail(null) → []
 */
export function parseTrail(trailParam: string | null): string[] {
  if (!trailParam || typeof trailParam !== 'string') {
    return [];
  }

  try {
    // Decode URI component in case paths are encoded
    const decoded = decodeURIComponent(trailParam);

    // Split by comma and filter out empty strings
    const paths = decoded.split(',').filter(p => p.trim().length > 0);

    // Validate that each path starts with /
    const validPaths = paths.filter(p => p.startsWith('/'));

    if (validPaths.length !== paths.length) {
      console.warn('Invalid trail parameter - some paths do not start with /:', trailParam);
    }

    return validPaths;
  } catch (error) {
    console.warn('Failed to parse trail parameter:', trailParam, error);
    return [];
  }
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add parseTrail utility for parsing breadcrumb trails"
```

---

### Task 2: Add encodeTrail() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add encodeTrail() function**

Add after `parseTrail()`:

```typescript
/**
 * Encode trail array to URL parameter string
 *
 * @param trail - Array of paths
 * @returns Comma-separated, URL-encoded string
 *
 * @example
 * encodeTrail(['/home', '/org-admin']) → '/home,/org-admin'
 * encodeTrail([]) → ''
 */
export function encodeTrail(trail: string[]): string {
  if (!trail || trail.length === 0) {
    return '';
  }

  // Join with comma and encode for URL safety
  return encodeURIComponent(trail.join(','));
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add encodeTrail utility for encoding breadcrumb trails"
```

---

### Task 3: Add shouldAddToTrail() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add shouldAddToTrail() function**

Add after `encodeTrail()`:

```typescript
/**
 * Check if a path should be added to the breadcrumb trail
 * Sub-pages (detail pages, /new, /edit) should NOT be added
 *
 * @param path - Path to check (without query parameters)
 * @returns true if should add to trail, false otherwise
 *
 * @example
 * shouldAddToTrail('/resources/books') → true
 * shouldAddToTrail('/resources/books/abc-123') → false (detail page)
 * shouldAddToTrail('/resources/books/new') → false (new page)
 */
export function shouldAddToTrail(path: string): boolean {
  // Strip query parameters
  const pathWithoutQuery = path.split('?')[0];

  // Sub-pages should not be added to trail
  return !isSubPage(pathWithoutQuery);
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add shouldAddToTrail utility to filter sub-pages from trail"
```

---

### Task 4: Add buildTrail() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add buildTrail() function**

Add after `shouldAddToTrail()`:

```typescript
/**
 * Build new trail when navigating from current page to target page
 * Handles circular navigation, sub-pages, and trail truncation
 *
 * @param currentPath - Current page path (without query)
 * @param currentTrail - Current trail array
 * @param targetPath - Target page path (without query)
 * @returns New trail array
 *
 * @example
 * buildTrail('/home', [], '/org-admin') → ['/home']
 * buildTrail('/org-admin', ['/home'], '/resources/books') → ['/home', '/org-admin']
 * buildTrail('/books', ['/home', '/org-admin', '/books'], '/org-admin') → ['/home'] (backtracking)
 */
export function buildTrail(
  currentPath: string,
  currentTrail: string[],
  targetPath: string
): string[] {
  // Strip query parameters
  const cleanCurrentPath = currentPath.split('?')[0];
  const cleanTargetPath = targetPath.split('?')[0];

  // Check if target is already in trail (user is backtracking)
  if (currentTrail.includes(cleanTargetPath)) {
    const index = currentTrail.indexOf(cleanTargetPath);
    return currentTrail.slice(0, index);
  }

  // If current page should not be in trail (sub-page), use parent's trail
  let newTrail = [...currentTrail];

  // Add current page to trail if it should be there
  if (shouldAddToTrail(cleanCurrentPath) && !currentTrail.includes(cleanCurrentPath)) {
    newTrail.push(cleanCurrentPath);
  }

  // Check trail depth and log warnings
  if (newTrail.length >= 9) {
    console.error('⚠️ Breadcrumb trail depth critical:', newTrail.length, newTrail);
  } else if (newTrail.length >= 6) {
    console.warn('⚠️ Breadcrumb trail unusually deep:', newTrail.length, newTrail);
  }

  return newTrail;
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add buildTrail utility for building breadcrumb trails with depth warnings"
```

---

### Task 5: Add getTrailForBack() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add getTrailForBack() function**

Add after `buildTrail()`:

```typescript
/**
 * Get navigation info for back button
 * Returns path to navigate to and updated trail
 *
 * @param currentTrail - Current trail array
 * @returns {path, trail} for back navigation, or null if trail is empty
 *
 * @example
 * getTrailForBack(['/home', '/org-admin']) → { path: '/org-admin', trail: '/home' }
 * getTrailForBack(['/home']) → { path: '/home', trail: '' }
 * getTrailForBack([]) → null
 */
export function getTrailForBack(currentTrail: string[]): {
  path: string;
  trail: string;
} | null {
  if (!currentTrail || currentTrail.length === 0) {
    return null;
  }

  // Last item in trail is where we go back to
  const backPath = currentTrail[currentTrail.length - 1];

  // New trail excludes the last item
  const newTrail = currentTrail.slice(0, -1);

  return {
    path: backPath,
    trail: encodeTrail(newTrail),
  };
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add getTrailForBack utility for back button navigation"
```

---

### Task 6: Add buildLinkWithTrail() utility function

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Add buildLinkWithTrail() function**

Add after `getTrailForBack()`:

```typescript
/**
 * Build link URL with trail parameter
 * Replaces buildLinkWithReferrer() for new trail system
 *
 * @param targetPath - Target page path
 * @param currentPath - Current page path (from usePathname())
 * @param currentTrail - Current trail array (from parseTrail())
 * @returns Complete URL with trail parameter
 *
 * @example
 * buildLinkWithTrail('/org-admin', '/home', [])
 *   → '/org-admin?trail=%2Fhome'
 *
 * buildLinkWithTrail('/resources/books', '/org-admin', ['/home'])
 *   → '/resources/books?trail=%2Fhome%2C%2Forg-admin'
 */
export function buildLinkWithTrail(
  targetPath: string,
  currentPath: string,
  currentTrail: string[]
): string {
  // Build new trail for this navigation
  const newTrail = buildTrail(currentPath, currentTrail, targetPath);

  // Encode trail for URL
  const encodedTrail = encodeTrail(newTrail);

  // If trail is empty, don't add parameter
  if (!encodedTrail) {
    return targetPath;
  }

  // Check if target already has query parameters
  const separator = targetPath.includes('?') ? '&' : '?';

  return `${targetPath}${separator}trail=${encodedTrail}`;
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add buildLinkWithTrail utility for creating trail-based navigation links"
```

---

## Phase 2: Breadcrumbs Component

### Task 7: Create Breadcrumbs component structure

**Files:**
- Create: `packages/web/src/components/Breadcrumbs.tsx`

**Step 1: Create Breadcrumbs component file**

```typescript
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { parseTrail, encodeTrail, getPageLabel } from '@/lib/navigation-utils';

/**
 * Internal breadcrumbs component that uses searchParams
 */
function BreadcrumbsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Parse trail from URL
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  // If no trail and we're at /home, don't show breadcrumbs
  if (pathname === '/home' || (trail.length === 0 && pathname !== '/home')) {
    return null;
  }

  // Build breadcrumb items: trail + current page
  const breadcrumbItems = [...trail];

  // Add Home as first item if not already there
  if (breadcrumbItems.length === 0 || breadcrumbItems[0] !== '/home') {
    breadcrumbItems.unshift('/home');
  }

  // Handle breadcrumb click - navigate with truncated trail
  const handleBreadcrumbClick = (clickedPath: string, clickedIndex: number) => {
    // New trail is everything before the clicked item
    const newTrail = breadcrumbItems.slice(0, clickedIndex);
    const encodedTrail = encodeTrail(newTrail);

    // Navigate with new trail
    const url = encodedTrail ? `${clickedPath}?trail=${encodedTrail}` : clickedPath;
    router.push(url);
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4 px-4">
      <ol className="flex items-center space-x-2 text-sm text-gray-600">
        {breadcrumbItems.map((path, index) => {
          const label = getPageLabel(path);
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={path} className="flex items-center">
              {index > 0 && (
                <span aria-hidden="true" className="mr-2">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {label}
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(path, index)}
                  className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  {label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb navigation component
 *
 * Displays full navigation trail at top of page.
 * Reads trail from URL query parameter.
 * Each breadcrumb is clickable to jump back multiple levels.
 *
 * @example
 * // URL: /org-admin/resources/books?trail=/home,/org-admin
 * // Renders: Home / Org Admin / Books
 * <Breadcrumbs />
 *
 * Do NOT use on /home page - breadcrumbs automatically hide there.
 */
export function Breadcrumbs() {
  return (
    <Suspense fallback={<div className="h-8 mb-4" />}>
      <BreadcrumbsContent />
    </Suspense>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/Breadcrumbs.tsx
git commit -m "feat(navigation): add Breadcrumbs component with trail-based navigation"
```

---

## Phase 3: Update BackButton Component

### Task 8: Update BackButton to use trail parameter

**Files:**
- Modify: `packages/web/src/components/BackButton.tsx`

**Step 1: Update BackButtonContent to read trail**

Replace the entire `BackButtonContent` function (~lines 10-40):

```typescript
function BackButtonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse trail from URL
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  // Get back navigation info
  const backInfo = getTrailForBack(trail);

  // If no trail, hide back button (we're at /home or no history)
  if (!backInfo) {
    return null;
  }

  const { path: backPath, trail: newTrail } = backInfo;
  const label = getPageLabel(backPath);

  // Build URL with updated trail
  const backUrl = newTrail ? `${backPath}?trail=${newTrail}` : backPath;

  return (
    <button
      type="button"
      onClick={() => router.push(backUrl)}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      aria-label={`Navigate back to ${label}`}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span>Back to {label}</span>
    </button>
  );
}
```

**Step 2: Add import for trail utilities**

Update imports at top of file (~line 4):

```typescript
import { parseTrail, getTrailForBack, getPageLabel } from '@/lib/navigation-utils';
```

**Step 3: Commit**

```bash
git add packages/web/src/components/BackButton.tsx
git commit -m "feat(navigation): update BackButton to use trail-based navigation"
```

---

## Phase 4: Integration - Layout Components

### Task 9: Update OrgAdminLayout navigation links

**Files:**
- Modify: `packages/web/src/components/OrgAdminLayout.tsx`

**Step 1: Add trail imports and hooks**

Update imports (~line 4):

```typescript
import { usePathname, useSearchParams } from 'next/navigation';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';
```

**Step 2: Add hooks in component**

Add after existing `const pathname = usePathname();` (~line 15):

```typescript
const searchParams = useSearchParams();
const trailParam = searchParams.get('trail');
const trail = parseTrail(trailParam);
```

**Step 3: Update all Link hrefs to use buildLinkWithTrail**

Replace all `buildLinkWithReferrer()` calls with `buildLinkWithTrail()`.

Example for "Back to App" link (~line 36):

```typescript
href={buildLinkWithTrail('/home', pathname, trail)}
```

Example for "Overview" link (~line 53):

```typescript
href={buildLinkWithTrail('/org-admin', pathname, trail)}
```

Continue for all sidebar links:
- Members (~line 61)
- Counselor Assignments (~line 69)
- Audit Log (~line 77)
- Books (~line 92)
- Add New Book (~line 100)
- Pending Evaluations (~line 108)
- Organizations (~line 116)
- Book Access Settings (~line 133)

**Step 4: Commit**

```bash
git add packages/web/src/components/OrgAdminLayout.tsx
git commit -m "feat(navigation): update OrgAdminLayout to use trail-based navigation"
```

---

### Task 10: Add Breadcrumbs to org-admin pages

**Files:**
- Modify: `packages/web/src/app/org-admin/resources/books/page.tsx`

**Step 1: Add Breadcrumbs import**

Add to imports (~line 7):

```typescript
import { Breadcrumbs } from '@/components/Breadcrumbs';
```

**Step 2: Add Breadcrumbs component**

Add after the opening `<div className="container mx-auto px-4 py-8">` (~line 140):

```typescript
<Breadcrumbs />
```

**Step 3: Update navigation links to use trail**

Add hooks at top of component:

```typescript
const searchParams = useSearchParams();
const trailParam = searchParams.get('trail');
const trail = parseTrail(trailParam);
```

Update imports:

```typescript
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';
import { useSearchParams } from 'next/navigation';
```

Update button onClick handlers (~lines 148, 154):

```typescript
onClick={() => router.push(buildLinkWithTrail('/org-admin/resources/books/pending', pathname, trail))}

onClick={() => router.push(buildLinkWithTrail('/resources/books/new', pathname, trail))}
```

**Step 4: Commit**

```bash
git add packages/web/src/app/org-admin/resources/books/page.tsx
git commit -m "feat(navigation): add Breadcrumbs and trail navigation to org-admin books page"
```

---

### Task 11: Update remaining org-admin pages with Breadcrumbs

**Files:**
- Modify: `packages/web/src/app/org-admin/page.tsx`
- Modify: `packages/web/src/app/org-admin/members/page.tsx`
- Modify: `packages/web/src/app/org-admin/counselor-assignments/page.tsx`
- Modify: `packages/web/src/app/org-admin/audit-log/page.tsx`
- Modify: `packages/web/src/app/org-admin/resources/books/pending/page.tsx`
- Modify: `packages/web/src/app/org-admin/resources/organizations/page.tsx`
- Modify: `packages/web/src/app/org-admin/settings/book-access/page.tsx`

**Step 1: For each file, add Breadcrumbs import and component**

```typescript
import { Breadcrumbs } from '@/components/Breadcrumbs';

// In component JSX, after opening container div:
<Breadcrumbs />
```

**Step 2: Update any navigation links to use buildLinkWithTrail**

Add hooks and imports where needed:

```typescript
import { useSearchParams } from 'next/navigation';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

// In component:
const searchParams = useSearchParams();
const trailParam = searchParams.get('trail');
const trail = parseTrail(trailParam);
```

**Step 3: Commit**

```bash
git add packages/web/src/app/org-admin/
git commit -m "feat(navigation): add Breadcrumbs to all org-admin pages"
```

---

### Task 12: Update AdminLayout navigation links

**Files:**
- Modify: `packages/web/src/components/AdminLayout.tsx`

**Step 1: Add trail support**

Follow same pattern as OrgAdminLayout (Task 9):
- Add imports for `useSearchParams`, `parseTrail`, `buildLinkWithTrail`
- Add hooks to get trail
- Update all Link hrefs to use `buildLinkWithTrail()`

**Step 2: Commit**

```bash
git add packages/web/src/components/AdminLayout.tsx
git commit -m "feat(navigation): update AdminLayout to use trail-based navigation"
```

---

### Task 13: Add Breadcrumbs to all admin pages

**Files:**
- Modify all page.tsx files under `packages/web/src/app/admin/`

**Step 1: Add Breadcrumbs import and component to each page**

```typescript
import { Breadcrumbs } from '@/components/Breadcrumbs';

// In JSX:
<Breadcrumbs />
```

**Step 2: Update any navigation links to use buildLinkWithTrail**

**Step 3: Commit**

```bash
git add packages/web/src/app/admin/
git commit -m "feat(navigation): add Breadcrumbs to all admin pages"
```

---

### Task 14: Update BookCard navigation

**Files:**
- Modify: `packages/web/src/components/BookCard.tsx`

**Step 1: Add trail support**

Add imports (~line 8):

```typescript
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';
import { useSearchParams } from 'next/navigation';
```

Add hooks in component (~line 40):

```typescript
const searchParams = useSearchParams();
const trailParam = searchParams.get('trail');
const trail = parseTrail(trailParam);
```

**Step 2: Update handleViewDetails function**

Replace the navigation logic (~line 47):

```typescript
const handleViewDetails = () => {
  if (onClick) {
    onClick();
  } else {
    const bookLink = buildLinkWithTrail(`/resources/books/${book.id}`, pathname, trail);
    router.push(bookLink);
  }
};
```

**Step 3: Commit**

```bash
git add packages/web/src/components/BookCard.tsx
git commit -m "feat(navigation): update BookCard to use trail-based navigation"
```

---

### Task 15: Update resources pages with Breadcrumbs

**Files:**
- Modify: `packages/web/src/app/resources/books/page.tsx`
- Modify: `packages/web/src/app/resources/books/[id]/page.tsx`
- Modify: `packages/web/src/app/resources/books/new/page.tsx`
- Modify: `packages/web/src/app/resources/organizations/page.tsx`
- Modify: `packages/web/src/app/resources/reading-list/page.tsx`
- Modify: `packages/web/src/app/resources/recommended/page.tsx`

**Step 1: Add Breadcrumbs to each page**

```typescript
import { Breadcrumbs } from '@/components/Breadcrumbs';

// In JSX:
<Breadcrumbs />
```

**Step 2: Update navigation links with trail support where present**

**Step 3: Commit**

```bash
git add packages/web/src/app/resources/
git commit -m "feat(navigation): add Breadcrumbs to all resources pages"
```

---

### Task 16: Update profile and settings pages with Breadcrumbs

**Files:**
- Modify: `packages/web/src/app/profile/page.tsx`
- Modify: `packages/web/src/app/settings/subscription/page.tsx`

**Step 1: Add Breadcrumbs to each page**

```typescript
import { Breadcrumbs } from '@/components/Breadcrumbs';

// In JSX:
<Breadcrumbs />
```

**Step 2: Commit**

```bash
git add packages/web/src/app/profile/ packages/web/src/app/settings/
git commit -m "feat(navigation): add Breadcrumbs to profile and settings pages"
```

---

## Phase 5: Cleanup Old Code

### Task 17: Remove old navigation utilities

**Files:**
- Modify: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Remove deprecated functions**

Remove these functions:
- `getValidReferrer()` (~line 119)
- `buildLinkWithReferrer()` (~line 146)

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "refactor(navigation): remove deprecated from-based navigation utilities"
```

---

### Task 18: Verify no remaining references to old functions

**Files:**
- Search entire codebase

**Step 1: Search for old function usage**

```bash
cd packages/web
grep -r "buildLinkWithReferrer" src/ || echo "No references found"
grep -r "getValidReferrer" src/ || echo "No references found"
grep -r '?from=' src/ || echo "No from parameter references found"
```

Expected: "No references found" for all searches

**Step 2: If any found, update them to use buildLinkWithTrail**

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "refactor(navigation): remove remaining references to old navigation system"
```

---

## Phase 6: Testing & Verification

### Task 19: Manual testing checklist

**Testing Flow:**

**Test 1: Basic Navigation Chain**
1. Navigate: Home → Org Admin → Books → Book Detail
2. Verify breadcrumbs show: `Home / Org Admin / Books / Book Detail`
3. Click Back button
4. Verify: Navigate to Books, breadcrumbs show `Home / Org Admin / Books`
5. Click Back button
6. Verify: Navigate to Org Admin, breadcrumbs show `Home / Org Admin`
7. Click Back button
8. Verify: Navigate to Home, no breadcrumbs shown

**Test 2: Breadcrumb Click Navigation**
1. Navigate: Home → Org Admin → Books → Book Detail
2. Click "Org Admin" breadcrumb
3. Verify: Navigate to Org Admin with trail `[/home]`
4. Verify breadcrumbs show: `Home / Org Admin`

**Test 3: Sub-page Handling**
1. Navigate: Home → Resources → Books → New Book
2. Verify "New Book" breadcrumb NOT shown in trail
3. Click Back button
4. Verify: Navigate back to Books

**Test 4: Direct URL Access**
1. Paste URL: `/resources/books/abc-123` (no trail parameter)
2. Verify breadcrumbs infer from path structure
3. Verify Back button works to parent

**Test 5: Cross-section Navigation**
1. Home → Org Admin → Books
2. Back to Home
3. Navigate to Platform Admin → Users
4. Verify clean trail (no Org Admin remnants)

**Test 6: Mobile Responsiveness**
1. Resize browser to mobile width
2. Verify breadcrumbs display appropriately
3. Verify all clickable elements are touch-friendly

**Step 1: Document test results**

Create test log:

```bash
echo "# Breadcrumb Navigation Test Results" > test-results.md
echo "" >> test-results.md
echo "Date: $(date)" >> test-results.md
echo "" >> test-results.md
echo "## Test 1: Basic Navigation Chain" >> test-results.md
echo "- [ ] Breadcrumbs update correctly on each step" >> test-results.md
echo "- [ ] Back button maintains trail" >> test-results.md
echo "" >> test-results.md
echo "## Test 2: Breadcrumb Click Navigation" >> test-results.md
echo "- [ ] Clicking breadcrumb truncates trail correctly" >> test-results.md
# ... continue for all tests
```

---

### Task 20: Build and verify no errors

**Step 1: Build web package**

```bash
cd packages/web
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 2: Start servers and test**

```bash
# Terminal 1
cd packages/api
PORT=3697 npx nx run api:serve

# Terminal 2
cd packages/web
PORT=3699 npx nx run web:serve
```

**Step 3: Run through manual test checklist**

**Step 4: Document completion**

```bash
git add test-results.md
git commit -m "docs: add breadcrumb navigation test results"
```

---

## Summary

**Total Tasks:** 20

**Files Created:**
- `packages/web/src/components/Breadcrumbs.tsx`

**Files Modified:**
- `packages/web/src/lib/navigation-utils.ts` (7 new functions, 2 removed)
- `packages/web/src/components/BackButton.tsx` (updated to use trail)
- `packages/web/src/components/OrgAdminLayout.tsx` (updated navigation)
- `packages/web/src/components/AdminLayout.tsx` (updated navigation)
- `packages/web/src/components/BookCard.tsx` (updated navigation)
- ~35 page.tsx files (added Breadcrumbs, updated navigation links)

**Success Criteria:**
- ✅ Full navigation chain preserved across all user flows
- ✅ Breadcrumbs visible on all pages except /home
- ✅ Back button navigates to correct previous page
- ✅ Breadcrumb clicks jump back multiple levels
- ✅ Sub-pages don't pollute trail
- ✅ Trail depth warnings at 6 and 9 levels
- ✅ WCAG 2.1 Level AA compliant
- ✅ No TypeScript errors
- ✅ All manual tests pass
