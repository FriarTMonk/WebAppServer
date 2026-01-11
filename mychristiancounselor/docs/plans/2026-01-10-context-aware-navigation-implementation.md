# Context-Aware Navigation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement context-aware navigation with smart back buttons that remember calling page across all user contexts

**Architecture:** URL query parameter-based navigation using `?from=<referrer>` with centralized utilities and configurable page labels

**Tech Stack:** Next.js 14, TypeScript, React, Tailwind CSS

---

## Overview

This plan implements the context-aware navigation system designed in `docs/plans/2026-01-10-context-aware-navigation-design.md`.

**Key Components:**
1. Navigation utility functions (path detection, referrer building)
2. Page labels configuration file
3. BackButton component
4. Page updates (add BackButton to 62 pages)
5. Navigation link updates (use referrer helpers)

**Total Tasks:** 15 grouped tasks

---

## Task 1: Create navigation utilities file

**Files:**
- Create: `packages/web/src/lib/navigation-utils.ts`

**Step 1: Create the utilities file with helper functions**

```typescript
/**
 * Navigation utilities for context-aware back button system
 *
 * Uses URL query parameter ?from=<referrer> to track navigation context
 * Prevents loops by excluding sub-pages from referrer chain
 */

/**
 * Check if a path is a sub-page (detail, new, edit)
 * Sub-pages should never become referrers to prevent navigation loops
 *
 * Examples:
 * - /resources/books/[id] → true (dynamic route)
 * - /resources/books/new → true (new page)
 * - /resources/books → false (index page)
 */
export function isSubPage(path: string): boolean {
  // Remove query parameters for checking
  const cleanPath = path.split('?')[0];

  // Check for dynamic route segments like [id], [token], etc
  if (cleanPath.match(/\/\[.+\]/)) {
    return true;
  }

  // Check for /new and /edit endpoints
  if (cleanPath.endsWith('/new') || cleanPath.endsWith('/edit')) {
    return true;
  }

  return false;
}

/**
 * Get parent path by removing last segment
 * Used when current page is a sub-page to get valid referrer
 *
 * Examples:
 * - /resources/books/123 → /resources/books
 * - /admin/users/456/permissions → /admin/users/456
 * - /profile/edit → /profile
 */
export function getParentPath(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Split into segments and remove last one
  const segments = cleanPath.split('/').filter(Boolean);
  segments.pop();

  // Return parent path or /home if no parent
  return '/' + segments.join('/') || '/home';
}

/**
 * Get valid referrer for navigation
 * If current path is a sub-page, returns parent path
 * Otherwise returns the current path
 *
 * This prevents sub-pages from entering the navigation chain
 */
export function getValidReferrer(currentPath: string): string {
  // Remove query parameters
  const cleanPath = currentPath.split('?')[0];

  // If current is a sub-page, use its parent as referrer
  if (isSubPage(cleanPath)) {
    return getParentPath(cleanPath);
  }

  return cleanPath;
}

/**
 * Build navigation link with from parameter
 * Appends ?from=<referrer> to target path
 * Handles existing query parameters in target
 *
 * Example:
 * buildLinkWithReferrer('/resources/books', '/org-admin')
 * → '/resources/books?from=%2Forg-admin'
 */
export function buildLinkWithReferrer(targetPath: string, currentPath: string): string {
  const referrer = getValidReferrer(currentPath);

  // Determine separator based on whether target has query params
  const separator = targetPath.includes('?') ? '&' : '?';

  // Append from parameter with URL encoding
  return `${targetPath}${separator}from=${encodeURIComponent(referrer)}`;
}

/**
 * Get page label for back button display
 * Returns configured label or fallback
 * Will be updated to read from config file in Task 2
 */
export function getPageLabel(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Temporary hardcoded labels - will be replaced with config in Task 2
  const tempLabels: Record<string, string> = {
    '/home': 'Home',
  };

  return tempLabels[cleanPath] || 'Previous Page';
}
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add navigation utility functions

- isSubPage: detect dynamic routes and /new, /edit pages
- getParentPath: extract parent from path hierarchy
- getValidReferrer: ensure only index pages become referrers
- buildLinkWithReferrer: create links with from parameter
- getPageLabel: placeholder for config-based labels"
```

---

## Task 2: Create page labels configuration

**Files:**
- Create: `packages/web/src/config/page-labels.json`

**Step 1: Create config directory if needed**

```bash
mkdir -p packages/web/src/config
```

**Step 2: Create page labels configuration file**

```json
{
  "/home": "Home",
  "/org-admin": "Organization Administration",
  "/admin": "Platform Administration",
  "/resources/books": "Browse Books",
  "/resources/reading-list": "Reading List",
  "/resources/recommended": "Recommended Books",
  "/resources/organizations": "Browse Organizations",
  "/profile": "Profile",
  "/history": "Conversation History",
  "/counsel": "Counselor Dashboard",
  "/settings/subscription": "Subscription Settings",
  "/admin/users": "User Management",
  "/admin/organizations": "Organization Management",
  "/admin/resources/books": "Book Management",
  "/admin/resources/evaluation": "Evaluation Management",
  "/admin/resources/organizations": "Organization Resources",
  "/admin/support": "Support Tickets",
  "/admin/sales": "Sales Inquiries",
  "/admin/audit-log": "Audit Log",
  "/admin/holidays": "Holiday Management",
  "/admin/evaluation/frameworks": "Evaluation Frameworks",
  "/admin/evaluation/queue": "Evaluation Queue",
  "/admin/evaluation/costs": "Cost Analytics",
  "/admin/evaluation/bulk-re-evaluate": "Bulk Re-evaluation",
  "/org-admin/members": "Members",
  "/org-admin/resources/books": "Organization Books",
  "/org-admin/resources/books/pending": "Pending Books",
  "/org-admin/resources/organizations": "Partner Organizations",
  "/org-admin/counselor-assignments": "Counselor Assignments",
  "/org-admin/audit-log": "Organization Audit Log",
  "/org-admin/settings/book-access": "Book Access Settings",
  "/support/tickets": "Support Tickets",
  "/support/new": "New Support Ticket",
  "/sales/new": "New Sales Inquiry",
  "/marketing": "Marketing Dashboard",
  "/marketing/campaigns": "Marketing Campaigns",
  "/marketing/prospects": "Prospects",
  "/assessments/take": "Assessment"
}
```

**Step 3: Update navigation-utils.ts to use config**

Modify `packages/web/src/lib/navigation-utils.ts`:

```typescript
import pageLabels from '@/config/page-labels.json';

/**
 * Get page label for back button display
 * Reads from configuration file
 */
export function getPageLabel(path: string): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  return pageLabels[cleanPath as keyof typeof pageLabels] || 'Previous Page';
}
```

**Step 4: Commit**

```bash
git add packages/web/src/config/page-labels.json packages/web/src/lib/navigation-utils.ts
git commit -m "feat(navigation): add page labels configuration

- Centralized page labels in config/page-labels.json
- Update getPageLabel to read from config
- Covers all major routes: user, org-admin, platform-admin"
```

---

## Task 3: Create BackButton component

**Files:**
- Create: `packages/web/src/components/BackButton.tsx`

**Step 1: Create BackButton component**

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { getPageLabel } from '@/lib/navigation-utils';

/**
 * Context-aware back button component
 *
 * Reads 'from' query parameter to determine where to navigate back to
 * Falls back to /home if no from parameter exists
 * Displays "Back to [Page Label]" based on configuration
 *
 * Usage:
 *   <BackButton />
 *
 * Do NOT use on /home page - it's the root navigation page
 */
export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read from parameter, fallback to /home
  const from = searchParams.get('from') || '/home';
  const label = getPageLabel(from);

  const handleBack = () => {
    router.push(from);
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
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

**Step 2: Commit**

```bash
git add packages/web/src/components/BackButton.tsx
git commit -m "feat(navigation): add BackButton component

- Reads from query parameter for context-aware navigation
- Falls back to /home if no from parameter
- Displays dynamic label based on destination
- Accessible with proper ARIA labels"
```

---

## Task 4: Update profile page with BackButton

**Files:**
- Modify: `packages/web/src/app/profile/page.tsx`

**Step 1: Import BackButton and add to page**

At the top of the file, add import:

```typescript
import { BackButton } from '../../components/BackButton';
```

Find the return statement in `ProfilePageContent` function (around line 87), and add BackButton right after the opening div:

```typescript
return (
  <div className="min-h-screen bg-gray-50">
    <div className="container mx-auto px-4 py-8">
      <BackButton />

      {/* Existing content continues... */}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/profile/page.tsx
git commit -m "feat(navigation): add BackButton to profile page"
```

---

## Task 5: Update history page with BackButton

**Files:**
- Modify: `packages/web/src/app/history/page.tsx`

**Step 1: Import BackButton**

Add import at top:

```typescript
import { BackButton } from '../../components/BackButton';
```

**Step 2: Add BackButton to page**

In `HistoryPageContent` function return statement (around line 104), add BackButton after opening div:

```typescript
return (
  <div className="min-h-screen bg-gray-50">
    <BackButton />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Existing content... */}
```

**Step 3: Commit**

```bash
git add packages/web/src/app/history/page.tsx
git commit -m "feat(navigation): add BackButton to history page"
```

---

## Task 6: Update counsel page with BackButton

**Files:**
- Modify: `packages/web/src/app/counsel/page.tsx`

**Step 1: Import and add BackButton**

Add import:

```typescript
import { BackButton } from '@/components/BackButton';
```

Wrap CounselorDashboard with container and BackButton:

```typescript
export default function CounselPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div className="container mx-auto px-4 py-6">
        <BackButton />
        <CounselorDashboard />
      </div>
    </AuthGuard>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/counsel/page.tsx
git commit -m "feat(navigation): add BackButton to counsel page"
```

---

## Task 7: Update resources pages with BackButton

**Files:**
- Modify: `packages/web/src/app/resources/books/page.tsx`
- Modify: `packages/web/src/app/resources/reading-list/page.tsx`
- Modify: `packages/web/src/app/resources/recommended/page.tsx`
- Modify: `packages/web/src/app/resources/organizations/page.tsx`

**Step 1: Update resources/books/page.tsx**

Add import and BackButton at start of page content in `BrowseBooksPageContent`:

```typescript
import { BackButton } from '../../../components/BackButton';

// In return statement (around line 229):
return (
  <div className="min-h-screen bg-gray-50">
    <BackButton />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Existing content... */}
```

**Step 2: Update resources/reading-list/page.tsx**

Add import and BackButton in `ReadingListPageContent`:

```typescript
import { BackButton } from '../../../components/BackButton';

// In return (around line 214):
<div className="bg-white border-b border-gray-200">
  <div className="container mx-auto px-4 py-6">
    <BackButton />
    {/* Rest of content... */}
```

Remove the existing hardcoded back button (lines 217-224).

**Step 3: Update remaining resources pages**

Follow same pattern for:
- `packages/web/src/app/resources/recommended/page.tsx`
- `packages/web/src/app/resources/organizations/page.tsx`

**Step 4: Commit**

```bash
git add packages/web/src/app/resources/books/page.tsx \
        packages/web/src/app/resources/reading-list/page.tsx \
        packages/web/src/app/resources/recommended/page.tsx \
        packages/web/src/app/resources/organizations/page.tsx
git commit -m "feat(navigation): add BackButton to resources pages

- Browse Books
- Reading List (removed hardcoded back button)
- Recommended Books
- Organizations"
```

---

## Task 8: Update resources sub-pages with BackButton

**Files:**
- Modify: `packages/web/src/app/resources/books/[id]/page.tsx`
- Modify: `packages/web/src/app/resources/books/new/page.tsx`

**Step 1: Update book detail page**

In `packages/web/src/app/resources/books/[id]/page.tsx`:

Remove existing hardcoded back button (around lines 170-174) and replace with:

```typescript
import { BackButton } from '@/components/BackButton';

// In return statement after opening div:
<div className="max-w-6xl mx-auto px-4 py-8">
  <BackButton />

  {/* Rest of content... */}
```

**Step 2: Update new book page**

In `packages/web/src/app/resources/books/new/page.tsx`:

Remove hardcoded back button (around lines 177-180) and replace with:

```typescript
import { BackButton } from '@/components/BackButton';

// Add at start of content:
<BackButton />
```

**Step 3: Commit**

```bash
git add packages/web/src/app/resources/books/\[id\]/page.tsx \
        packages/web/src/app/resources/books/new/page.tsx
git commit -m "feat(navigation): add BackButton to book sub-pages

- Book detail page (removed hardcoded back)
- New book page (removed hardcoded back)"
```

---

## Task 9: Update org-admin pages with BackButton

**Files:**
- Modify: `packages/web/src/app/org-admin/page.tsx`
- Modify: `packages/web/src/app/org-admin/members/page.tsx`
- Modify: `packages/web/src/app/org-admin/resources/books/page.tsx`
- Modify: `packages/web/src/app/org-admin/resources/books/pending/page.tsx`
- Modify: `packages/web/src/app/org-admin/resources/organizations/page.tsx`
- Modify: `packages/web/src/app/org-admin/counselor-assignments/page.tsx`
- Modify: `packages/web/src/app/org-admin/audit-log/page.tsx`
- Modify: `packages/web/src/app/org-admin/settings/book-access/page.tsx`

**Step 1: Add BackButton to each org-admin page**

For each file, add import and BackButton:

```typescript
import { BackButton } from '@/components/BackButton';

// At start of main content div:
<div className="container mx-auto px-4 py-6">
  <BackButton />
  {/* Existing content... */}
```

**Step 2: Commit all org-admin pages**

```bash
git add packages/web/src/app/org-admin/page.tsx \
        packages/web/src/app/org-admin/members/page.tsx \
        packages/web/src/app/org-admin/resources/books/page.tsx \
        packages/web/src/app/org-admin/resources/books/pending/page.tsx \
        packages/web/src/app/org-admin/resources/organizations/page.tsx \
        packages/web/src/app/org-admin/counselor-assignments/page.tsx \
        packages/web/src/app/org-admin/audit-log/page.tsx \
        packages/web/src/app/org-admin/settings/book-access/page.tsx
git commit -m "feat(navigation): add BackButton to org-admin pages

- Org Admin dashboard
- Members management
- Organization books (all and pending)
- Partner organizations
- Counselor assignments
- Audit log
- Book access settings"
```

---

## Task 10: Update platform admin pages with BackButton

**Files:**
- Modify: `packages/web/src/app/admin/page.tsx`
- Modify: `packages/web/src/app/admin/users/page.tsx`
- Modify: `packages/web/src/app/admin/organizations/page.tsx`
- Modify: `packages/web/src/app/admin/organizations/[id]/page.tsx`
- Modify: `packages/web/src/app/admin/resources/books/page.tsx`
- Modify: `packages/web/src/app/admin/resources/evaluation/page.tsx`
- Modify: `packages/web/src/app/admin/resources/organizations/page.tsx`
- Modify: `packages/web/src/app/admin/support/page.tsx`
- Modify: `packages/web/src/app/admin/sales/page.tsx`
- Modify: `packages/web/src/app/admin/audit-log/page.tsx`
- Modify: `packages/web/src/app/admin/holidays/page.tsx`

**Step 1: Add BackButton to each admin page**

Same pattern as org-admin:

```typescript
import { BackButton } from '@/components/BackButton';

<div className="container mx-auto px-4 py-6">
  <BackButton />
  {/* Content... */}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/admin/*.tsx \
        packages/web/src/app/admin/**/*.tsx
git commit -m "feat(navigation): add BackButton to platform admin pages

- Platform Admin dashboard
- User management
- Organization management
- Book management
- Evaluation management
- Support and sales
- Audit log and holidays"
```

---

## Task 11: Update admin evaluation pages with BackButton

**Files:**
- Modify: `packages/web/src/app/admin/evaluation/frameworks/page.tsx`
- Modify: `packages/web/src/app/admin/evaluation/queue/page.tsx`
- Modify: `packages/web/src/app/admin/evaluation/costs/page.tsx`
- Modify: `packages/web/src/app/admin/evaluation/bulk-re-evaluate/page.tsx`

**Step 1: Add BackButton to each evaluation page**

```typescript
import { BackButton } from '@/components/BackButton';

<div className="p-6">
  <BackButton />
  {/* Content... */}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/admin/evaluation/*.tsx
git commit -m "feat(navigation): add BackButton to admin evaluation pages

- Evaluation frameworks
- Queue monitoring
- Cost analytics
- Bulk re-evaluation"
```

---

## Task 12: Update remaining pages with BackButton

**Files:**
- Modify: `packages/web/src/app/settings/subscription/page.tsx`
- Modify: `packages/web/src/app/support/tickets/page.tsx`
- Modify: `packages/web/src/app/support/tickets/[id]/page.tsx`
- Modify: `packages/web/src/app/support/new/page.tsx`
- Modify: `packages/web/src/app/sales/new/page.tsx`
- Modify: `packages/web/src/app/marketing/page.tsx`
- Modify: `packages/web/src/app/marketing/campaigns/page.tsx`
- Modify: `packages/web/src/app/marketing/campaigns/[id]/page.tsx`
- Modify: `packages/web/src/app/marketing/campaigns/[id]/edit/page.tsx`
- Modify: `packages/web/src/app/marketing/campaigns/new/page.tsx`
- Modify: `packages/web/src/app/marketing/prospects/page.tsx`
- Modify: `packages/web/src/app/marketing/prospects/[id]/page.tsx`
- Modify: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Add BackButton to all remaining pages**

Apply same pattern to each file.

**Step 2: Commit**

```bash
git add packages/web/src/app/settings/**/*.tsx \
        packages/web/src/app/support/**/*.tsx \
        packages/web/src/app/sales/**/*.tsx \
        packages/web/src/app/marketing/**/*.tsx \
        packages/web/src/app/assessments/**/*.tsx
git commit -m "feat(navigation): add BackButton to remaining pages

- Settings (subscription)
- Support tickets
- Sales inquiries
- Marketing dashboard and campaigns
- Assessments"
```

---

## Task 13: Update BookCard component to use referrer

**Files:**
- Modify: `packages/web/src/components/BookCard.tsx`

**Step 1: Import utilities and update BookCard**

```typescript
'use client';

import { usePathname } from 'next/navigation';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

// In BookCard component:
export function BookCard({ book }: BookCardProps) {
  const pathname = usePathname();

  // Build link with referrer
  const bookLink = buildLinkWithReferrer(`/resources/books/${book.id}`, pathname);

  const handleViewDetails = () => {
    window.location.href = bookLink;
  };

  return (
    <div
      onClick={handleViewDetails}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Rest of card content... */}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/BookCard.tsx
git commit -m "feat(navigation): update BookCard to pass referrer context

- Use buildLinkWithReferrer for book detail links
- Preserves navigation context when viewing books
- Works across all contexts (user, org-admin, platform-admin)"
```

---

## Task 14: Update menu navigation links

**Files:**
- Modify: `packages/web/src/components/UserMenu.tsx` (if exists)
- Modify: `packages/web/src/components/OrgAdminMenu.tsx` (if exists)
- Modify: `packages/web/src/components/PlatformAdminMenu.tsx` (if exists)
- Modify: Any dashboard page with navigation links

**Step 1: Find and update menu components**

Look for navigation links in menu components and dashboards. Update to use `buildLinkWithReferrer`:

```typescript
import { usePathname } from 'next/navigation';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

export function SomeMenu() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href={buildLinkWithReferrer('/resources/books', pathname)}>
        Browse Books
      </Link>
      <Link href={buildLinkWithReferrer('/org-admin/members', pathname)}>
        Members
      </Link>
    </nav>
  );
}
```

**Step 2: Test key navigation flows**

Test these flows manually:
1. Home → Browse Books → Book Detail → Back → Back
2. Home → Org Admin → Org Books → Book Detail → Back → Back → Back
3. Home → Platform Admin → All Books → Book Detail → Back → Back → Back

**Step 3: Commit**

```bash
git add packages/web/src/components/*Menu.tsx
git commit -m "feat(navigation): update menu links to pass referrer context

- All menu navigation now uses buildLinkWithReferrer
- Context preserved across all navigation flows"
```

---

## Task 15: Manual testing and verification

**Step 1: Test navigation flows**

**Flow 1: User → Resources → Book**
```
1. Log in as regular user
2. Navigate to /home (conversation page)
3. Click "Browse Books" from user menu
4. Verify URL: /resources/books?from=/home
5. Click on any book
6. Verify URL: /resources/books/[id]?from=/resources/books
7. Click "Back to Browse Books"
8. Verify URL: /resources/books?from=/home
9. Click "Back to Home"
10. Verify URL: /home
```

**Flow 2: Org Admin → Books → Book**
```
1. Log in as org admin
2. Navigate to /home
3. Click "Organization Administration"
4. Verify URL: /org-admin?from=/home
5. Click "Browse Books"
6. Verify URL: /org-admin/resources/books?from=/org-admin
7. Click on any book
8. Verify URL: /resources/books/[id]?from=/org-admin/resources/books
9. Click "Back to Organization Books"
10. Verify URL: /org-admin/resources/books?from=/org-admin
11. Click "Back to Organization Administration"
12. Verify URL: /org-admin?from=/home
13. Click "Back to Home"
14. Verify URL: /home
```

**Flow 3: Platform Admin → Books → Book**
```
1. Log in as platform admin
2. Navigate to /admin?from=/home
3. Click "Book Management"
4. Click on any book (should navigate to shared book detail)
5. Click back button
6. Should return to /admin/resources/books
```

**Flow 4: Direct URL Access**
```
1. Type /profile directly in browser
2. Verify "Back to Home" button appears
3. Click it, should go to /home
```

**Flow 5: Sub-page Loop Prevention**
```
1. Navigate to /resources/books/123
2. Inspect URL - verify 'from' is a valid index page, not another sub-page
3. Navigate to /resources/books/new
4. Inspect URL - verify 'from' is /resources/books, not /resources/books/123
```

**Step 2: Verify all pages have back buttons**

```bash
# List all pages that should have BackButton (all except /home)
find packages/web/src/app -name "page.tsx" -not -path "*/home/page.tsx" | while read file; do
  if ! grep -q "BackButton" "$file"; then
    echo "Missing BackButton: $file"
  fi
done
```

Expected: No output (all pages have BackButton)

**Step 3: Test edge cases**

1. **Invalid from parameter**: `/profile?from=/invalid` → should fallback to "Back to Previous Page" → goes to /home
2. **Missing from parameter**: `/profile` → should show "Back to Home"
3. **Query params preserved**: `/resources/books?search=faith&from=/home` → navigate to book → back should preserve search param
4. **Deeply nested sub-pages**: Test paths with multiple segments

**Step 4: Check browser console**

Verify no errors related to:
- Navigation utilities
- BackButton component
- Missing page labels

**Step 5: Document any issues**

If issues found:
- Document the exact navigation flow
- Note expected vs actual behavior
- Fix issues before final commit

---

## Final Verification Checklist

- [ ] All 62 non-home pages have BackButton component
- [ ] BackButton shows correct page labels
- [ ] Navigation from user menu preserves context
- [ ] Navigation from org-admin menu preserves context
- [ ] Navigation from platform-admin menu preserves context
- [ ] Sub-pages never appear in from parameter
- [ ] Direct URL access falls back to /home
- [ ] BookCard navigates with referrer context
- [ ] No navigation loops possible
- [ ] Browser back button works alongside app back button
- [ ] Page labels configured for all major routes
- [ ] No console errors during navigation

---

## Rollback Plan

If issues are discovered after deployment:

1. Revert commits in reverse order (Task 15 → Task 1)
2. Each task is independently committable
3. Can deploy partial implementation (e.g., just utilities + BackButton)
4. Old hardcoded back buttons remain functional until replaced

---

## Future Enhancements

1. **Analytics**: Track back button usage patterns
2. **Breadcrumbs**: Visual breadcrumb trail in addition to back button
3. **Keyboard shortcut**: Alt+Left arrow for back navigation
4. **Mobile gestures**: Swipe gesture for back on mobile
5. **Deep linking**: Preserve from parameter in shared links
