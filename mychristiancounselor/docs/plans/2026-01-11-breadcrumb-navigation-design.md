# Breadcrumb Navigation System Design

## Overview

Replace the single-reference `?from` parameter navigation system with a full breadcrumb trail that maintains complete navigation context. Display breadcrumbs at the top of every page and provide a back button that navigates to the previous breadcrumb level.

## Problem Statement

The current `?from=/previous-page` approach only tracks one level of navigation history, causing intermediate pages to be lost when navigating through multi-level flows like Home → Org Admin → Books → Book Detail.

**Current Issue:**
```
User navigates: Home → Org Admin → Books → Book Detail
Clicks back from Detail → Books (loses "Org Admin" from chain)
Clicks back from Books → Home (skips "Org Admin")
```

## Solution: Breadcrumb Trail System

### Architecture & Data Structure

**Core Concept:** Build and maintain a breadcrumb trail as users navigate, encoding it in the URL so it persists across page loads and refreshes.

**URL Parameter Design:**
```
?trail=/home,/org-admin,/org-admin/resources/books
```
A comma-separated list of paths representing the full navigation history.

**Trail Building Rules:**

1. **Starting point**: `/home` is always the root (anchor of trail, may or may not be shown in breadcrumbs)
2. **Adding to trail**: When navigating from Page A to Page B, append B to A's trail
3. **Sub-page handling**: Sub-pages (detail pages, /new, /edit) are NEVER added to the trail - they use their parent's trail
4. **Duplicate prevention**: If the target page already exists in the trail, truncate everything after it (user is backtracking)
5. **Trail depth**: Self-limiting due to app architecture (menu disappears when entering sections, forcing backtracking to switch sections)

**Example Navigation Flow:**
```
Home → Org Admin → Books → Book Detail

URLs:
/home                                                    (no trail)
/org-admin?trail=/home
/org-admin/resources/books?trail=/home,/org-admin
/resources/books/abc-123?trail=/home,/org-admin,/org-admin/resources/books
```

**Back Button Behavior:**
- Navigate to the last item in the trail
- Remove that item from the trail in the URL

**Breadcrumb Click Behavior:**
```
Current: Home > Org Admin > Books > Book Detail
User clicks "Org Admin"
Result: Navigate to /org-admin?trail=/home
```
When clicking any breadcrumb, navigate to that page with trail truncated to everything BEFORE that page.

### Component Design & Implementation

#### Breadcrumb Component (`<Breadcrumbs />`)

**Purpose:** Display full navigation trail at top of page

**Behavior:**
- Displays at top of every page except `/home`
- Reads `trail` query parameter, parses into array
- Renders: `Home > Org Admin > Books` (clickable links)
- Current page shown as non-clickable text or omitted
- Each breadcrumb click navigates with truncated trail

**Props:**
```typescript
interface BreadcrumbsProps {
  currentPath: string;      // From usePathname()
  trail: string[];          // Parsed from query param
}
```

#### Back Button Component (`<BackButton />`)

**Purpose:** Navigate to previous page in trail

**Behavior:**
- Shows "← Back to [Previous Page Label]"
- Reads last item from trail
- On click: navigate to last trail item with trail minus last item
- Hidden when trail is empty (we're at /home)

**Props:**
```typescript
interface BackButtonProps {
  // Reads from URL via useSearchParams()
}
```

#### Navigation Utilities (update `navigation-utils.ts`)

**New Functions:**

```typescript
/**
 * Build new trail when navigating to target
 * @param currentPath - Current page path (without query)
 * @param currentTrail - Current trail array
 * @param targetPath - Target page path
 * @returns Encoded trail string for URL
 */
function buildTrail(
  currentPath: string,
  currentTrail: string[],
  targetPath: string
): string;

/**
 * Parse trail query parameter into array
 * @param trailParam - Raw trail string from URL
 * @returns Array of paths, empty if invalid
 */
function parseTrail(trailParam: string | null): string[];

/**
 * Get navigation info for back button
 * @param currentTrail - Current trail array
 * @returns {path, trail} for back navigation
 */
function getTrailForBack(currentTrail: string[]): {
  path: string;
  trail: string;
} | null;

/**
 * Check if path should be added to trail
 * Sub-pages should NOT be added
 * @param path - Path to check
 * @returns true if should add to trail
 */
function shouldAddToTrail(path: string): boolean;

/**
 * Build link with trail parameter
 * @param targetPath - Target page path
 * @param currentPath - Current page path
 * @param currentTrail - Current trail array
 * @returns Target URL with trail parameter
 */
function buildLinkWithTrail(
  targetPath: string,
  currentPath: string,
  currentTrail: string[]
): string;

/**
 * Encode trail array to URL parameter
 * @param trail - Array of paths
 * @returns Encoded comma-separated string
 */
function encodeTrail(trail: string[]): string;
```

**Reuse Existing:**
- `isSubPage(path)` - Detect sub-pages
- `getPageLabel(path)` - Get human-readable labels
- `pageLabels.json` - Configuration

#### Integration Points

**All navigation links need updating:**
- Admin layout sidebar links
- Org Admin layout sidebar links
- User layout sidebar links
- BookCard navigation
- All router.push() calls throughout app

**Layout updates:**
- Add `<Breadcrumbs />` to page layouts (below header, above content)
- Update `<BackButton />` to use trail instead of `from`

### Visual Design & Accessibility

#### Breadcrumb Visual Design

**Position:** Top of page, below header/navigation bar, above main content

**Layout:** Horizontal, left-aligned

**Separator:** `/` between items (using `aria-hidden="true"`)

**Typography:**
- Small text (text-sm)
- Gray for links (text-gray-600)
- Darker for current page (text-gray-900)
- Font medium for current page

**Hover state:** Underline on hover for clickable items

**Mobile:** Collapse to show only last 2-3 items with "..." for earlier ones

**Example Markup:**
```tsx
<nav aria-label="Breadcrumb" className="mb-4 px-4">
  <ol className="flex items-center space-x-2 text-sm text-gray-600">
    <li>
      <a href="/home?trail=" className="hover:underline">
        Home
      </a>
    </li>
    <li aria-hidden="true">/</li>
    <li>
      <a href="/org-admin?trail=/home" className="hover:underline">
        Org Admin
      </a>
    </li>
    <li aria-hidden="true">/</li>
    <li className="text-gray-900 font-medium" aria-current="page">
      Books
    </li>
  </ol>
</nav>
```

#### Back Button Design

**Visual Style:** Keep existing style (icon + text)

**Position:** Below breadcrumbs, top of page content

**Visibility:** Only show if trail has items (hide on /home)

#### Accessibility (WCAG 2.1 AA)

- Use `<nav aria-label="Breadcrumb">` wrapper
- Use `<ol>` for semantic ordered list
- `aria-current="page"` on current/last item
- `aria-hidden="true"` on visual separators
- Focus rings on all clickable items (focus:outline-none focus:ring-2 focus:ring-blue-500)
- Screen reader announces: "Breadcrumb navigation"

### Error Handling & Edge Cases

#### Malformed Trail Parameter

**Issue:** `trail` param is corrupted/invalid

**Handling:**
- Default to empty array
- Log warning: `console.warn('Invalid trail parameter:', trailParam)`
- User sees no breadcrumbs, can still navigate via menu
- Graceful degradation

#### Missing Page Labels

**Issue:** Path not found in `page-labels.json`

**Handling:**
- Fallback to path segment formatting
- Example: `"org-admin"` → `"Org Admin"`
- Log warning in development
- Use existing `getPageLabel()` fallback logic

#### Trail Depth Warnings

```typescript
if (trail.length >= 9) {
  console.error('⚠️ Breadcrumb trail depth critical:', trail.length, trail);
  // Consider sending to error monitoring (Sentry)
}
else if (trail.length >= 6) {
  console.warn('⚠️ Breadcrumb trail unusually deep:', trail.length, trail);
}
```

**Why monitoring:**
- Normal app usage should cap at ~5 levels
- App architecture (menu disappears) prevents deep trails
- Warnings indicate potential navigation bugs

#### URL Length Limits

**Browser limit:** ~2000 characters

**Trail size calculation:**
- 8-level trail with 30-char paths: ~240 chars (safe)
- Encoding overhead: ~50% (commas + URL encoding)
- Total: ~360 chars for trail parameter

**Safety net:** If trail exceeds 1500 chars total URL length, truncate oldest items (keep last 8)

#### Direct URL Access

**Issue:** User pastes `/resources/books/abc-123` without trail param

**Handling:**
- Infer breadcrumbs from path structure
- Show: `Home > Books > [Current]`
- Back button goes to inferred parent using `getParentPath()`
- Log info: `console.info('No trail param, inferring from path')`

#### Sub-page Detection

**Requirement:** Sub-pages must NOT be added to trail

**Implementation:**
- Reuse existing `isSubPage()` logic from `navigation-utils.ts`
- Sub-pages inherit parent's trail
- Example: `/resources/books/abc-123` uses `/resources/books`'s trail

**Patterns detected as sub-pages:**
- Paths ending with `/new` or `/edit`
- Dynamic routes: `/resources/books/{id}`, `/admin/users/{id}`, etc.
- Filesystem patterns: `[id]`, `[slug]`, etc.

#### Circular Navigation Prevention

**Issue:** User navigates to page already in trail

**Handling:**
```typescript
if (currentTrail.includes(targetPath)) {
  // User is backtracking, truncate trail at that point
  const index = currentTrail.indexOf(targetPath);
  return currentTrail.slice(0, index);
}
```

**Example:**
```
Trail: [/home, /org-admin, /resources/books]
Navigate to: /org-admin
New trail: [/home]  // Truncated at /org-admin
```

### Migration Strategy

#### Current System vs New System

**Current:**
- Query parameter: `?from=/previous-page`
- Single reference (one level back)
- Loses intermediate pages

**New:**
- Query parameter: `?trail=/home,/org-admin,/books`
- Full navigation chain
- Maintains complete context

#### Migration Approach: Big Bang Cutover

Both systems use query parameters and don't conflict, allowing complete switch in one deployment.

#### Step 1: Add Trail Logic (Backward Compatible)

**Actions:**
- Implement `buildTrail()`, `parseTrail()`, `encodeTrail()` utilities
- Implement `buildLinkWithTrail()`, `getTrailForBack()`, `shouldAddToTrail()`
- Add `<Breadcrumbs />` component
- Update `<BackButton />` to read from `trail` first, fallback to `from`
- Update all navigation links to build trails

**Files Modified:**
- `packages/web/src/lib/navigation-utils.ts`
- `packages/web/src/components/BackButton.tsx`
- Create: `packages/web/src/components/Breadcrumbs.tsx`

**Testing:** Verify trail building works alongside old `from` parameter

#### Step 2: Update Navigation Integration

**Actions:**
- Update all layout components to use `buildLinkWithTrail()`
- Update all `router.push()` calls throughout app
- Add `<Breadcrumbs />` to page layouts

**Files Modified:**
- `packages/web/src/components/AdminLayout.tsx`
- `packages/web/src/components/OrgAdminLayout.tsx`
- `packages/web/src/components/UserLayout.tsx`
- `packages/web/src/components/BookCard.tsx`
- All page.tsx files with navigation links (~30 files)

**Testing:** Verify all navigation flows maintain trails correctly

#### Step 3: Remove Old Code

**Actions:**
- Remove `from` parameter handling from BackButton
- Remove `getValidReferrer()` function
- Remove `buildLinkWithReferrer()` function
- Clean up any remaining `from` references

**Files Modified:**
- `packages/web/src/lib/navigation-utils.ts`
- `packages/web/src/components/BackButton.tsx`

**Testing:** Verify no regressions after cleanup

#### Testing Strategy

**Manual Test Flows:**

1. **Basic Navigation:**
   - Home → Org Admin → Books → Detail
   - Verify breadcrumbs update on each step
   - Click back button repeatedly, verify trail shrinks

2. **Breadcrumb Clicks:**
   - Navigate: Home → Org Admin → Books → Detail
   - Click "Org Admin" breadcrumb
   - Verify navigates to Org Admin with trail=[/home]

3. **Sub-page Handling:**
   - Navigate: Home → Books → New Book
   - Verify "New Book" page NOT added to trail
   - Back button returns to Books

4. **Direct URL Access:**
   - Paste `/resources/books/abc-123` (no trail)
   - Verify breadcrumbs inferred from path
   - Back button works to parent

5. **Cross-section Navigation:**
   - Home → Org Admin → Books
   - Back to Home
   - Navigate to Resources → Books
   - Verify clean trail (no Org Admin remnants)

**Automated Tests (Optional):**
- Unit tests for trail utilities
- Integration tests for breadcrumb rendering

#### Rollback Plan

**If issues arise:**
- Old `from` parameter code exists until Step 3
- Can revert navigation utility changes
- Breadcrumbs can be hidden via CSS while debugging

**Rollback Steps:**
1. Revert navigation-utils.ts changes
2. Revert BackButton.tsx changes
3. Hide Breadcrumbs component
4. All navigation falls back to `from` parameter

## Implementation Sequence

### Phase 1: Core Utilities (Foundation)
1. Add trail utility functions to `navigation-utils.ts`
2. Add trail depth warning logic
3. Update tests for new utilities

### Phase 2: Components (UI)
1. Create `<Breadcrumbs />` component
2. Update `<BackButton />` to use trail
3. Add Suspense wrappers for useSearchParams

### Phase 3: Integration (Navigation Links)
1. Update layout component navigation links
2. Update BookCard navigation
3. Update all router.push() calls
4. Add `<Breadcrumbs />` to layouts

### Phase 4: Testing & Cleanup
1. Manual testing of all user flows
2. Remove old `from` parameter code
3. Clean up unused functions
4. Update documentation

## Success Criteria

**Functional:**
- ✅ Full navigation chain preserved (no lost pages)
- ✅ Breadcrumbs visible on all pages except /home
- ✅ Back button navigates to correct previous page
- ✅ Breadcrumb clicks jump back multiple levels
- ✅ Sub-pages don't pollute trail
- ✅ Direct URL access works (inferred breadcrumbs)

**Non-functional:**
- ✅ WCAG 2.1 Level AA compliant
- ✅ Mobile responsive (collapsed breadcrumbs)
- ✅ Performance: No noticeable lag on navigation
- ✅ URL length stays under 500 chars in normal usage

**Edge Cases:**
- ✅ Malformed trail params handled gracefully
- ✅ Missing page labels have fallbacks
- ✅ Trail depth warnings log at 6 and 9 levels
- ✅ Circular navigation prevented

## Future Enhancements (Out of Scope)

- Session storage backup for trail (if URL too long)
- Breadcrumb overflow menu for very deep trails
- Animation/transition when breadcrumbs update
- Custom breadcrumb separators per section
- Analytics tracking of navigation patterns
