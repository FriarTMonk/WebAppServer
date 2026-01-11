# Context-Aware Navigation System Design

**Date:** 2026-01-10
**Status:** Approved

## Overview

Design a context-aware navigation system with smart back buttons that remember the calling page across user, org-admin, and platform-admin contexts. Every page except `/home` has a back button that displays "Back to [Page Label]" where the label is configured externally.

## Core Requirements

1. **Universal Back Buttons**: All pages except `/home` (conversation page) have back buttons
2. **Context Awareness**: Back buttons navigate to the calling page, not hardcoded destinations
3. **Loop Prevention**: Sub-pages never appear in navigation chain to prevent infinite loops
4. **Descriptive Labels**: Back buttons show "Back to [Page Label]" (e.g., "Back to Organization Administration")
5. **Configuration**: Page labels stored in config file, not code

## Navigation Hierarchy

### Root Page (No Back Button)
- `/home` - Conversation page (landing after login)

### All Other Pages Have Back Buttons
- Dashboard pages (`/org-admin`, `/admin`) → `/home`
- List/Index pages (`/resources/books`) → `from` parameter or `/home`
- Sub-pages (`/resources/books/[id]`) → `from` parameter or parent path

## Implementation Approach: URL Query Parameters

### Why Query Parameters?
- Shareable URLs work across sessions
- Survives page refresh
- Visible and debuggable
- Explicit and predictable
- Follows REST principles

### How It Works

**Navigation Chain Example:**
```
/home
  → /org-admin?from=/home
  → /org-admin/resources/books?from=/org-admin
  → /resources/books/123?from=/org-admin/resources/books
```

**Back Navigation:**
```
/resources/books/123?from=/org-admin/resources/books
  → clicks Back to Organization Books
  → /org-admin/resources/books?from=/org-admin
  → clicks Back to Organization Administration
  → /org-admin?from=/home
  → clicks Back to Home
  → /home
```

## Anti-Loop Rules

### Rule 1: Sub-pages Never Become Referrers

**Valid `from` pages (index/list pages only):**
- ✅ `/home`
- ✅ `/org-admin`
- ✅ `/admin`
- ✅ `/resources/books`
- ✅ `/admin/users`
- ✅ `/org-admin/members`

**Invalid `from` pages (sub-pages):**
- ❌ `/resources/books/[id]`
- ❌ `/resources/books/new`
- ❌ `/admin/users/[id]`
- ❌ `/profile/edit`

### Rule 2: Sub-page Detection

A page is a sub-page if it matches any of:
- Dynamic route segments: `/books/[id]`
- Ends with `/new`: `/books/new`
- Ends with `/edit`: `/books/edit`

### Rule 3: Valid Referrer Logic

When building navigation links:
```typescript
// If current page is sub-page, use its parent as referrer
if (isSubPage(currentPath)) {
  referrer = getParentPath(currentPath);
} else {
  referrer = currentPath;
}
```

**Example preventing loop:**
```
Current: /resources/books/123?from=/resources/books
Navigate to: /resources/books/new

WRONG: /resources/books/new?from=/resources/books/123 ❌ (creates loop)
RIGHT:  /resources/books/new?from=/resources/books ✅ (uses parent)
```

## Component Architecture

### BackButton Component

**Location:** `packages/web/src/components/BackButton.tsx`

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { getPageLabel } from '@/lib/navigation-utils';

export function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read 'from' parameter, fallback to /home
  const from = searchParams.get('from') || '/home';
  const label = getPageLabel(from);

  return (
    <button
      onClick={() => router.push(from)}
      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to {label}
    </button>
  );
}
```

### Navigation Utilities

**Location:** `packages/web/src/lib/navigation-utils.ts`

```typescript
import pageLabels from '@/config/page-labels.json';

/**
 * Check if a path is a sub-page (detail, new, edit)
 */
export function isSubPage(path: string): boolean {
  return path.match(/\/\[.+\]/) !== null ||
         path.endsWith('/new') ||
         path.endsWith('/edit');
}

/**
 * Get parent path by removing last segment
 * /resources/books/123 → /resources/books
 */
export function getParentPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  segments.pop();
  return '/' + segments.join('/') || '/home';
}

/**
 * Get valid referrer - if current is sub-page, return parent
 */
export function getValidReferrer(currentPath: string): string {
  const cleanPath = currentPath.split('?')[0];

  if (isSubPage(cleanPath)) {
    return getParentPath(cleanPath);
  }

  return cleanPath;
}

/**
 * Build link with from parameter
 */
export function buildLinkWithReferrer(targetPath: string, currentPath: string): string {
  const referrer = getValidReferrer(currentPath);

  // Handle target with existing query params
  const separator = targetPath.includes('?') ? '&' : '?';
  return `${targetPath}${separator}from=${encodeURIComponent(referrer)}`;
}

/**
 * Get page label from configuration
 */
export function getPageLabel(path: string): string {
  const cleanPath = path.split('?')[0];
  return pageLabels[cleanPath as keyof typeof pageLabels] || 'Previous Page';
}
```

### Page Labels Configuration

**Location:** `packages/web/src/config/page-labels.json`

```json
{
  "/home": "Home",
  "/org-admin": "Organization Administration",
  "/admin": "Platform Administration",
  "/resources/books": "Browse Books",
  "/resources/reading-list": "Reading List",
  "/resources/recommended": "Recommended Books",
  "/profile": "Profile",
  "/history": "Conversation History",
  "/counsel": "Counselor Dashboard",
  "/admin/users": "User Management",
  "/admin/organizations": "Organization Management",
  "/admin/resources/books": "Book Management",
  "/admin/resources/evaluation": "Evaluation Management",
  "/org-admin/members": "Members",
  "/org-admin/resources/books": "Organization Books",
  "/org-admin/resources/books/pending": "Pending Books",
  "/settings/subscription": "Subscription Settings",
  "/support/tickets": "Support Tickets",
  "/support/new": "New Support Ticket"
}
```

## Integration Pattern

### Adding BackButton to Pages

Every page except `/home`:

```typescript
// Example: /resources/books/[id]/page.tsx
import { BackButton } from '@/components/BackButton';

export default function BookDetailPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <BackButton />

      <h1>Book Details</h1>
      {/* Page content */}
    </div>
  );
}
```

### Updating Navigation Links

When navigating between pages:

```typescript
// Example: Org Admin Dashboard
import { usePathname } from 'next/navigation';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

export default function OrgAdminDashboard() {
  const pathname = usePathname();

  return (
    <div>
      <Link href={buildLinkWithReferrer('/resources/books', pathname)}>
        Browse Books
      </Link>

      <Link href={buildLinkWithReferrer('/org-admin/members', pathname)}>
        Manage Members
      </Link>
    </div>
  );
}
```

### BookCard Component Example

```typescript
// When clicking a book card from any context
import { usePathname } from 'next/navigation';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

export function BookCard({ book }) {
  const pathname = usePathname();
  const bookLink = buildLinkWithReferrer(`/resources/books/${book.id}`, pathname);

  return (
    <Link href={bookLink}>
      {/* Book card content */}
    </Link>
  );
}
```

## Edge Cases & Fallbacks

### Direct URL Access
```typescript
// User types /resources/books/123 directly
// No 'from' parameter → falls back to /home
const from = searchParams.get('from') || '/home';
```

### Invalid From Parameter
```typescript
// User manually edits URL to /books?from=/invalid
// getPageLabel returns 'Previous Page' as fallback
return pageLabels[cleanPath] || 'Previous Page';
```

### Deeply Nested Sub-pages
```typescript
// /admin/users/456/permissions/edit
// getParentPath strips last segment: /admin/users/456/permissions
// Works recursively for any depth
```

### Preserving Other Query Params
```typescript
// Current: /resources/books?from=/org-admin&search=faith
// Navigate: /resources/books/123?tab=reviews
// Result: /resources/books/123?tab=reviews&from=/resources/books
buildLinkWithReferrer('/resources/books/123?tab=reviews', pathname);
```

## Example User Flows

### Flow 1: User → Books → Book Detail
```
/home
  → clicks Browse Books (user menu)
  → /resources/books?from=/home
  → clicks book
  → /resources/books/123?from=/resources/books
  → clicks "Back to Browse Books"
  → /resources/books?from=/home
  → clicks "Back to Home"
  → /home
```

### Flow 2: Org Admin → Books → Book Detail
```
/home
  → clicks Org Admin (menu)
  → /org-admin?from=/home
  → clicks Browse Books
  → /org-admin/resources/books?from=/org-admin
  → clicks book
  → /resources/books/123?from=/org-admin/resources/books
  → clicks "Back to Organization Books"
  → /org-admin/resources/books?from=/org-admin
  → clicks "Back to Organization Administration"
  → /org-admin?from=/home
  → clicks "Back to Home"
  → /home
```

### Flow 3: Platform Admin → Users → User Detail
```
/home
  → clicks Platform Admin
  → /admin?from=/home
  → clicks Users
  → /admin/users?from=/admin
  → clicks user
  → /admin/users/123?from=/admin/users
  → clicks "Back to User Management"
  → /admin/users?from=/admin
```

### Flow 4: Direct Access (No Context)
```
User types /profile directly in URL
  → /profile (no from parameter)
  → clicks "Back to Home" (fallback)
  → /home
```

## Benefits

1. **Consistency**: Every page (except home) has predictable navigation
2. **User-Friendly**: Users always know where back button goes
3. **No Loops**: Sub-page prevention ensures navigation always progresses up hierarchy
4. **Maintainable**: Labels in config file, easy to update without code changes
5. **Debuggable**: Navigation chain visible in URL
6. **Shareable**: URLs work across sessions and can be bookmarked
7. **Context-Aware**: Same resource accessed from different contexts navigates back correctly

## Implementation Checklist

- [ ] Create `packages/web/src/components/BackButton.tsx`
- [ ] Create `packages/web/src/lib/navigation-utils.ts`
- [ ] Create `packages/web/src/config/page-labels.json`
- [ ] Add BackButton to all pages except `/home`
- [ ] Update navigation links to use `buildLinkWithReferrer()`
- [ ] Update BookCard and other shared components to pass referrer
- [ ] Test navigation flows from all contexts (user, org-admin, platform-admin)
- [ ] Test edge cases (direct URL access, invalid params, nested sub-pages)
- [ ] Verify no navigation loops possible
- [ ] Update menu components to use referrer links

## Testing Strategy

### Manual Testing Scenarios
1. Navigate through each user flow and verify back buttons work
2. Test direct URL access (no from parameter) - should fallback to /home
3. Test browser back button alongside app back button
4. Test deep linking with from parameter preserved
5. Verify sub-pages never become referrers
6. Test all three contexts: user, org-admin, platform-admin

### Automated Testing (Future)
- Unit tests for `isSubPage()`, `getParentPath()`, `getValidReferrer()`
- Integration tests for BackButton component
- E2E tests for complete navigation flows
