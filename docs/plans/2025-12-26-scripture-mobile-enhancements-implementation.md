# Scripture Related Toggle & Mobile Summary Dialog - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scripture related verse toggle and mobile summary dialog to improve UX

**Architecture:** Pure UI enhancements with no API changes. Scripture grouping logic in MessageBubble, toggle UI in ScriptureCard, responsive dialog in CounselorDashboard using Tailwind breakpoints.

**Tech Stack:** React, TypeScript, Tailwind CSS, Next.js

---

## Task 1: Add Scripture Grouping Logic to MessageBubble

**Files:**
- Modify: `packages/web/src/components/MessageBubble.tsx:1-124`

**Step 1: Add GroupedScripture interface and grouping function**

Add after the imports (around line 11):

```typescript
interface GroupedScripture {
  primary: ScriptureReference;
  related: ScriptureReference[];
}

function groupScriptures(scriptures: ScriptureReference[]): GroupedScripture[] {
  const groups: GroupedScripture[] = [];
  let currentGroup: GroupedScripture | null = null;

  for (const scripture of scriptures) {
    if (scripture.source === 'ai-cited') {
      // Start new group
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { primary: scripture, related: [] };
    } else if (scripture.source === 'related' && currentGroup) {
      // Add to current group
      currentGroup.related.push(scripture);
    } else {
      // Standalone (theme) scripture
      if (currentGroup) groups.push(currentGroup);
      groups.push({ primary: scripture, related: [] });
      currentGroup = null;
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
}
```

**Step 2: Use grouping in render**

Replace the scripture rendering section (around lines 107-119) with:

```typescript
{message.scriptureReferences.length > 0 && (
  <div className="mt-3">
    {comparisonMode ? (
      <ScriptureComparison scriptures={message.scriptureReferences} />
    ) : (
      (() => {
        const groupedScriptures = groupScriptures(message.scriptureReferences);
        return (
          <div className="space-y-2">
            {groupedScriptures.map((group, idx) => (
              <ScriptureCard
                key={idx}
                scripture={group.primary}
                relatedScriptures={group.related}
              />
            ))}
          </div>
        );
      })()
    )}
  </div>
)}
```

**Step 3: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No TypeScript errors (ScriptureCard will show prop errors until Task 2)

**Step 4: Commit**

```bash
git add packages/web/src/components/MessageBubble.tsx
git commit -m "feat(scripture): add grouping logic for related verses"
```

---

## Task 2: Add Related Props to ScriptureCard

**Files:**
- Modify: `packages/web/src/components/ScriptureCard.tsx:1-165`

**Step 1: Update interface**

Change the interface (line 4-6) to:

```typescript
interface ScriptureCardProps {
  scripture: ScriptureReference;
  relatedScriptures?: ScriptureReference[];
  isNested?: boolean;
}
```

**Step 2: Update function signature and add state**

Change the component (line 8-11):

```typescript
export function ScriptureCard({
  scripture,
  relatedScriptures = [],
  isNested = false
}: ScriptureCardProps) {
  const [showStrongs, setShowStrongs] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [hoveredStrong, setHoveredStrong] = useState<string | null>(null);
  const hasStrongs = scripture.strongs && scripture.strongs.length > 0;
  const hasRelated = relatedScriptures.length > 0;
```

**Step 3: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/web/src/components/ScriptureCard.tsx
git commit -m "feat(scripture): add relatedScriptures and isNested props"
```

---

## Task 3: Update ScriptureCard Styling for Nested Cards

**Files:**
- Modify: `packages/web/src/components/ScriptureCard.tsx:78-163`

**Step 1: Add conditional styling to main div**

Change the return statement opening div (line 78-79):

```typescript
return (
  <div className={`border border-blue-200 rounded-lg p-4 mb-3 ${
    isNested ? 'ml-4 bg-blue-25 p-3' : 'bg-blue-50'
  }`}>
```

**Step 2: Conditionally hide Strong's button for nested cards**

Change the Strong's button conditional (line 89):

```typescript
{hasStrongs && !isNested && (
  <button
```

**Step 3: Verify in browser**

Run: `cd ../.. && npm run dev`
Expected: App starts, scripture cards render (no visible changes yet)

**Step 4: Commit**

```bash
git add packages/web/src/components/ScriptureCard.tsx
git commit -m "style(scripture): add nested card styling"
```

---

## Task 4: Add Related Toggle Button to ScriptureCard

**Files:**
- Modify: `packages/web/src/components/ScriptureCard.tsx:98-163`

**Step 1: Add toggle button after verse text**

After the verse text paragraph (line 98), add:

```typescript
      <p className="text-blue-800 italic">"{scripture.text}"</p>

      {/* Related toggle button */}
      {hasRelated && !isNested && (
        <button
          onClick={() => setShowRelated(!showRelated)}
          className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          {showRelated ? 'Hide' : 'Show'} Related ({relatedScriptures.length})
        </button>
      )}

      {hasStrongs && showStrongs && (
```

**Step 2: Test in browser**

1. Open a conversation with scripture references
2. Look for AI-cited scriptures
3. Verify "Show Related (N)" button appears if there are related verses
4. Click button - should toggle text to "Hide Related (N)"
5. Click again - should toggle back

**Step 3: Commit**

```bash
git add packages/web/src/components/ScriptureCard.tsx
git commit -m "feat(scripture): add Show/Hide Related toggle button"
```

---

## Task 5: Add Related Scriptures Section to ScriptureCard

**Files:**
- Modify: `packages/web/src/components/ScriptureCard.tsx:98-163`

**Step 1: Add related section before closing div**

After the Strong's section (before the final closing `</div>`), add:

```typescript
      {hasRelated && showRelated && !isNested && (
        <div className="mt-3 pl-4 border-l-2 border-blue-300">
          <div className="text-xs font-semibold text-blue-900 mb-2">
            Related Scriptures:
          </div>
          <div className="space-y-2">
            {relatedScriptures.map((related, idx) => (
              <ScriptureCard
                key={idx}
                scripture={related}
                isNested={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test nested rendering**

1. Find AI-cited scripture with related verses
2. Click "Show Related" button
3. Verify related verses appear indented with left border
4. Verify related cards have lighter background
5. Verify related cards don't have Strong's or Related buttons
6. Click "Hide Related" - verses should disappear

**Step 3: Test edge cases**

Test scenarios:
- Scripture with no related verses - no button shows ✓
- Scripture in comparison mode - no grouping (old behavior) ✓
- Theme/standalone scripture - renders normally ✓

**Step 4: Commit**

```bash
git add packages/web/src/components/ScriptureCard.tsx
git commit -m "feat(scripture): add related scriptures collapsible section"
```

---

## Task 6: Add State for Mobile Summary Dialog

**Files:**
- Modify: `packages/web/src/components/CounselorDashboard.tsx:1-300`

**Step 1: Import useState and useEffect**

Verify React import includes hooks (around line 1):

```typescript
import React, { useState, useEffect } from 'react';
```

**Step 2: Add state at top of component**

After existing state declarations (search for other `useState` calls), add:

```typescript
const [selectedSummary, setSelectedSummary] = useState<MemberSummary | null>(null);
```

**Step 3: Add ESC key handler**

After the state declarations, add:

```typescript
// ESC key handler for summary dialog
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedSummary(null);
    }
  };

  if (selectedSummary) {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
}, [selectedSummary]);
```

**Step 4: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/web/src/components/CounselorDashboard.tsx
git commit -m "feat(counselor): add summary dialog state and ESC handler"
```

---

## Task 7: Add Responsive Summary Table Cells

**Files:**
- Modify: `packages/web/src/components/CounselorDashboard.tsx:186-193`

**Step 1: Replace single summary cell with two responsive cells**

Find the summary `<td>` element (around line 186-193) and replace with:

```typescript
{/* Desktop: Show full summary inline */}
<td className="px-6 py-4 hidden lg:table-cell">
  <div className="text-sm text-gray-900">
    {memberSummary.wellbeingStatus?.summary || 'No analysis yet'}
  </div>
  <div className="text-xs text-gray-500 mt-1">
    Analyzed: {formatDate(memberSummary.wellbeingStatus?.lastAnalyzedAt)}
  </div>
</td>

{/* Mobile: Show "View Summary" link */}
<td className="px-6 py-4 lg:hidden">
  <button
    onClick={() => setSelectedSummary(memberSummary)}
    className="text-blue-600 hover:text-blue-900 text-sm font-medium underline"
  >
    View Summary
  </button>
</td>
```

**Step 2: Test responsive behavior**

1. Open counselor dashboard on desktop (> 1024px width)
2. Verify full summary shows in table
3. Resize browser to mobile width (< 1024px)
4. Verify "View Summary" link shows instead
5. Click link - nothing happens yet (dialog in next task)

**Step 3: Commit**

```bash
git add packages/web/src/components/CounselorDashboard.tsx
git commit -m "feat(counselor): add responsive summary cells for mobile"
```

---

## Task 8: Add Summary Dialog Component

**Files:**
- Modify: `packages/web/src/components/CounselorDashboard.tsx:245-300`

**Step 1: Add dialog after the main table section**

After the closing `</div>` of the main content (search for ProfileModal section), add:

```typescript
      {selectedSummary && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSummary(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  7-Day Summary
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSummary.member.firstName} {selectedSummary.member.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {selectedSummary.wellbeingStatus?.summary || 'No analysis yet'}
              </div>
              <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                Analyzed: {formatDate(selectedSummary.wellbeingStatus?.lastAnalyzedAt)}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => setSelectedSummary(null)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
```

**Step 2: Test dialog functionality**

1. Open counselor dashboard on mobile width (< 1024px)
2. Click "View Summary" link
3. Verify dialog opens centered on screen
4. Verify member name shows in header
5. Verify summary text shows (or "No analysis yet")
6. Verify analyzed date shows at bottom
7. Click X button - dialog should close
8. Open again, click Close button - dialog should close
9. Open again, click outside dialog - dialog should close
10. Open again, press ESC key - dialog should close

**Step 3: Test long content**

1. Find member with long summary
2. Open dialog
3. Verify content scrolls within dialog
4. Verify dialog doesn't exceed 80% viewport height

**Step 4: Commit**

```bash
git add packages/web/src/components/CounselorDashboard.tsx
git commit -m "feat(counselor): add mobile summary dialog with accessibility"
```

---

## Task 9: Manual Testing & Verification

**Files:**
- Test: All modified components

**Step 1: Scripture Related Toggle - Happy Path**

Test cases:
- [ ] Open conversation with AI-cited scriptures
- [ ] Verify "Show Related (N)" button appears for scriptures with related verses
- [ ] Click button, verify related verses expand with indentation
- [ ] Verify related verses have lighter background and left border
- [ ] Verify button text changes to "Hide Related (N)"
- [ ] Click button again, verify related verses collapse
- [ ] Verify Strong's concordance still works on AI-cited verses
- [ ] Verify Strong's button doesn't show on nested related verses

**Step 2: Scripture Related Toggle - Edge Cases**

Test cases:
- [ ] Scripture with no related verses - no toggle button shows
- [ ] Theme/standalone scripture - renders normally without grouping
- [ ] Enable comparison mode - verify old behavior (no grouping)
- [ ] Disable comparison mode - verify grouping returns

**Step 3: Mobile Summary Dialog - Responsive Behavior**

Test cases:
- [ ] Desktop view (> 1024px): Full summary shows inline in table
- [ ] Mobile view (< 1024px): "View Summary" link shows
- [ ] Resize from desktop to mobile - summary switches to link
- [ ] Resize from mobile to desktop - link switches to full summary

**Step 4: Mobile Summary Dialog - Interaction**

Test cases:
- [ ] Click "View Summary" - dialog opens
- [ ] Dialog shows member name in header
- [ ] Dialog shows full summary text
- [ ] Dialog shows "Analyzed: [date]" at bottom
- [ ] Click X button - dialog closes
- [ ] Click Close button - dialog closes
- [ ] Click outside dialog (on backdrop) - dialog closes
- [ ] Press ESC key - dialog closes
- [ ] Member with no summary - shows "No analysis yet"
- [ ] Member with long summary - dialog scrolls, max height 80vh

**Step 5: Accessibility Testing**

Test with keyboard only:
- [ ] Tab to "View Summary" button - should focus
- [ ] Press Enter - dialog should open
- [ ] Tab through dialog - focus should trap inside
- [ ] Press ESC - dialog should close
- [ ] Verify focus returns to trigger button after closing
- [ ] Test with screen reader - dialog should announce properly

**Step 6: Document any issues found**

Create issue for any bugs discovered during testing.

---

## Task 10: Final Cleanup and Commit

**Files:**
- All modified files

**Step 1: Remove debug logging**

Check for any `console.log` statements added during development:

```bash
grep -r "console.log" packages/web/src/components/MessageBubble.tsx
grep -r "console.log" packages/web/src/components/ScriptureCard.tsx
grep -r "console.log" packages/web/src/components/CounselorDashboard.tsx
```

Remove any debug logging found.

**Step 2: Verify TypeScript compilation**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Verify build succeeds**

Run: `cd ../.. && npm run build:web`
Expected: Build completes successfully

**Step 4: Review all changes**

Run: `git diff master --stat`

Expected changes:
- `packages/web/src/components/MessageBubble.tsx` - Added grouping logic
- `packages/web/src/components/ScriptureCard.tsx` - Added related props and toggle UI
- `packages/web/src/components/CounselorDashboard.tsx` - Added mobile dialog

**Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup debug logging and finalize implementation"
```

---

## Testing Checklist Summary

**Scripture Related Toggle**:
- [x] AI-cited with multiple related verses
- [x] AI-cited with no related verses
- [x] Theme/standalone scriptures
- [x] Comparison mode (should not use grouping)
- [x] Strong's concordance still works
- [x] Toggle state persists during expansion
- [x] No infinite nesting

**Mobile Summary Dialog**:
- [x] Desktop shows inline summary (no change)
- [x] Mobile shows "View Summary" link
- [x] Dialog opens on click
- [x] Dialog closes on X button
- [x] Dialog closes on outside click
- [x] Dialog closes on ESC key
- [x] Long summaries scroll properly
- [x] No summary shows placeholder
- [x] Keyboard navigation works
- [x] Screen reader announces properly

---

## File References

**Modified Files** (absolute paths):
1. `/mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/.worktrees/scripture-mobile-enhancements/packages/web/src/components/MessageBubble.tsx`
2. `/mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/.worktrees/scripture-mobile-enhancements/packages/web/src/components/ScriptureCard.tsx`
3. `/mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/.worktrees/scripture-mobile-enhancements/packages/web/src/components/CounselorDashboard.tsx`

**Reference Files** (no changes):
- `/mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/.worktrees/scripture-mobile-enhancements/packages/shared/src/types/index.ts` (ScriptureReference interface)
- `/mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/.worktrees/scripture-mobile-enhancements/packages/web/src/components/ScriptureComparison.tsx` (comparison mode reference)

---

## Rollback Plan

If issues are discovered:

**Partial Rollback** (per feature):
```bash
# Revert scripture toggle only
git revert <commit-hash-task-5>
git revert <commit-hash-task-4>
git revert <commit-hash-task-3>
git revert <commit-hash-task-2>
git revert <commit-hash-task-1>

# Revert mobile summary only
git revert <commit-hash-task-8>
git revert <commit-hash-task-7>
git revert <commit-hash-task-6>
```

**Full Rollback**:
```bash
git reset --hard master
```

---

## Success Criteria

**Feature Complete When**:
1. Scripture cards with related verses show "Show/Hide Related (N)" toggle
2. Related verses display indented with visual hierarchy when expanded
3. Nested cards don't show Strong's or additional related toggles
4. Counselor dashboard shows "View Summary" link on mobile (< 1024px)
5. Summary dialog opens/closes with multiple methods (click, ESC, backdrop)
6. All accessibility requirements met (keyboard nav, screen reader support)
7. No TypeScript errors
8. Build completes successfully
9. No regressions in existing functionality

**Ready for Merge When**:
- All tasks completed
- Manual testing checklist 100% passed
- No console errors in browser
- Responsive behavior verified on multiple screen sizes
- Accessibility verified with keyboard-only navigation
