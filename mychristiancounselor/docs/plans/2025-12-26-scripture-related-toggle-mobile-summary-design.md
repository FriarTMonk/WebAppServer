# Scripture Related Toggle & Mobile Summary Dialog - Design Document

**Date**: 2025-12-26
**Status**: Approved for Implementation

---

## Overview

Two UI enhancements to improve user experience:

1. **Scripture Related Toggle**: Add show/hide controls for related scripture references in AI conversations
2. **Mobile Counselor Summary Dialog**: Replace inline summary with dialog on mobile devices

---

## Enhancement 1: Scripture Related Toggle

### Problem Statement

AI counseling responses include scripture references with related verses. Currently, all scriptures display inline, which can be overwhelming when there are many related verses. Users need a way to toggle related scripture visibility.

### Current Implementation

- Scripture references come as flat array from API
- Each scripture has `source` field: `'ai-cited' | 'related' | 'theme'`
- Related scriptures follow their AI-cited parent in sequence
- All scriptures render inline using `ScriptureCard` component

**Example API Response**:
```typescript
[
  { book: "John", chapter: 3, verse: 16, source: 'ai-cited' },
  { book: "Romans", chapter: 5, verse: 8, source: 'related' },
  { book: "Romans", chapter: 8, verse: 38, source: 'related' },
  { book: "Psalm", chapter: 23, verse: 1, source: 'ai-cited' },
  { book: "John", chapter: 10, verse: 11, source: 'related' },
]
```

### Proposed Solution

#### Data Transformation

Transform flat array into grouped structure in `MessageBubble.tsx`:

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

**Transformed Output**:
```typescript
[
  {
    primary: { book: "John", chapter: 3, verse: 16, source: 'ai-cited' },
    related: [
      { book: "Romans", chapter: 5, verse: 8, source: 'related' },
      { book: "Romans", chapter: 8, verse: 38, source: 'related' }
    ]
  },
  {
    primary: { book: "Psalm", chapter: 23, verse: 1, source: 'ai-cited' },
    related: [
      { book: "John", chapter: 10, verse: 11, source: 'related' }
    ]
  }
]
```

#### Component Changes

**ScriptureCard.tsx** - Add Related Section:

```typescript
interface ScriptureCardProps {
  scripture: ScriptureReference;
  relatedScriptures?: ScriptureReference[]; // NEW
  isNested?: boolean; // NEW - for styling nested cards
}

export function ScriptureCard({
  scripture,
  relatedScriptures = [],
  isNested = false
}: ScriptureCardProps) {
  const [showStrongs, setShowStrongs] = useState(false);
  const [showRelated, setShowRelated] = useState(false); // NEW
  const hasRelated = relatedScriptures.length > 0;

  // ... existing code ...

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3 ${
      isNested ? 'ml-4 bg-blue-25' : ''
    }`}>
      {/* Existing header and content */}

      {/* NEW: Related toggle button */}
      {hasRelated && !isNested && (
        <button
          onClick={() => setShowRelated(!showRelated)}
          className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          {showRelated ? 'Hide' : 'Show'} Related ({relatedScriptures.length})
        </button>
      )}

      {/* NEW: Related scriptures section */}
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

**MessageBubble.tsx** - Use Grouped Data:

```typescript
export function MessageBubble({ message, comparisonMode = false }: MessageBubbleProps) {
  // ... existing code ...

  // Group scriptures for related toggle
  const groupedScriptures = React.useMemo(() => {
    return groupScriptures(message.scriptureReferences);
  }, [message.scriptureReferences]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* ... existing message content ... */}

      {message.scriptureReferences.length > 0 && (
        <div className="mt-3">
          {comparisonMode ? (
            <ScriptureComparison scriptures={message.scriptureReferences} />
          ) : (
            <div className="space-y-2">
              {groupedScriptures.map((group, idx) => (
                <ScriptureCard
                  key={idx}
                  scripture={group.primary}
                  relatedScriptures={group.related}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### UI Layout

```
┌─────────────────────────────────────────────┐
│ John 3:16 (KJV) [AI Cited] [Show Strong's] │
│ "For God so loved the world..."             │
│                                             │
│ [Show Related (2)]                          │
│                                             │
│ ┌─ Related Scriptures ──────────────────┐  │
│ │ ┌─────────────────────────────────┐   │  │
│ │ │ Romans 5:8 (KJV) [Related]      │   │  │
│ │ │ "But God commendeth his love.." │   │  │
│ │ └─────────────────────────────────┘   │  │
│ │                                       │  │
│ │ ┌─────────────────────────────────┐   │  │
│ │ │ Romans 8:38-39 (KJV) [Related]  │   │  │
│ │ │ "For I am persuaded..."         │   │  │
│ │ └─────────────────────────────────┘   │  │
│ └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Files to Modify

1. **packages/web/src/components/MessageBubble.tsx**
   - Add `groupScriptures()` helper function
   - Transform scripture array before rendering
   - Pass grouped data to ScriptureCard

2. **packages/web/src/components/ScriptureCard.tsx**
   - Add `relatedScriptures` and `isNested` props
   - Add `showRelated` state
   - Render "Show/Hide Related (N)" button
   - Render related section with nested cards

### Edge Cases

- **No related scriptures**: Don't show toggle button
- **Theme scriptures**: Render as standalone (no grouping)
- **Nested cards**: Don't show Strong's toggle or related toggle (prevent infinite nesting)
- **Comparison mode**: Keep existing behavior (no grouping)

---

## Enhancement 2: Mobile Counselor Summary Dialog

### Problem Statement

The counselor dashboard displays member summaries in a table. On mobile devices, the summary text is too long to display comfortably in a table cell, making the table difficult to read and scroll.

### Current Implementation

**CounselorDashboard.tsx** (line 186-193):
```typescript
<td className="px-6 py-4">
  <div className="text-sm text-gray-900">
    {memberSummary.wellbeingStatus?.summary || 'No analysis yet'}
  </div>
  <div className="text-xs text-gray-500 mt-1">
    Analyzed: {formatDate(memberSummary.wellbeingStatus?.lastAnalyzedAt)}
  </div>
</td>
```

### Proposed Solution

#### Mobile Detection

Use Tailwind CSS responsive classes (same pattern as hamburger menu):
- `hidden lg:block` - Hide on mobile, show on desktop
- `lg:hidden` - Hide on desktop, show on mobile
- Breakpoint: `lg` (1024px) matches existing mobile menu

#### Table Cell Changes

Replace single cell with two responsive cells:

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

#### Dialog Component

Add modal dialog at end of component:

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

#### State Management

Add at top of component:

```typescript
const [selectedSummary, setSelectedSummary] = useState<MemberSummary | null>(null);
```

Add ESC key handler:

```typescript
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

#### Visual Design

**Mobile View**:
```
┌──────────────────────────────────┐
│ Status │ Member    │ Summary     │
├────────┼───────────┼─────────────┤
│ 🟢     │ John Doe  │ View Summary│
│        │ john@...  │             │
├────────┼───────────┼─────────────┤
```

**Dialog (when opened)**:
```
┌─────────────────────────────────────┐
│ 7-Day Summary              [X]      │
│ John Doe                            │
├─────────────────────────────────────┤
│                                     │
│ Member shows consistent spiritual   │
│ growth. Engaged in daily prayer     │
│ and demonstrates increased faith... │
│                                     │
│ [more summary text...]              │
│                                     │
├─────────────────────────────────────┤
│ Analyzed: Dec 20, 2025             │
├─────────────────────────────────────┤
│           [  Close  ]               │
└─────────────────────────────────────┘
```

### Files to Modify

1. **packages/web/src/components/CounselorDashboard.tsx**
   - Add `selectedSummary` state
   - Add ESC key event listener
   - Duplicate summary column with responsive classes
   - Add SummaryDialog component
   - Handle dialog open/close

### Edge Cases

- **No summary**: Show "No analysis yet" in dialog
- **Long summary**: Dialog scrolls with `max-h-[80vh] overflow-y-auto`
- **Desktop**: Continue showing inline summary (no changes)
- **Click outside**: Close dialog
- **ESC key**: Close dialog

---

## Implementation Plan

### Phase 1: Scripture Related Toggle
1. Add grouping logic to MessageBubble.tsx
2. Update ScriptureCard.tsx with related props and toggle
3. Test with various scripture combinations
4. Verify nested rendering prevents infinite loops

### Phase 2: Mobile Counselor Summary
1. Add state and ESC handler to CounselorDashboard.tsx
2. Add responsive table cells
3. Create SummaryDialog component
4. Test on mobile and desktop breakpoints
5. Verify accessibility (keyboard navigation, ARIA)

### Testing Checklist

**Scripture Related Toggle**:
- [ ] AI-cited with multiple related verses
- [ ] AI-cited with no related verses
- [ ] Theme/standalone scriptures
- [ ] Comparison mode (should not use grouping)
- [ ] Strong's concordance still works
- [ ] Toggle state persists during expansion
- [ ] No infinite nesting

**Mobile Summary Dialog**:
- [ ] Desktop shows inline summary (no change)
- [ ] Mobile shows "View Summary" link
- [ ] Dialog opens on click
- [ ] Dialog closes on X button
- [ ] Dialog closes on outside click
- [ ] Dialog closes on ESC key
- [ ] Long summaries scroll properly
- [ ] No summary shows placeholder

---

## Technical Decisions

### Why Option A (Grouped Related) vs Global Toggle?
- **Clearer relationships**: Users see which related verses go with which AI-cited verse
- **Better theology**: Maintains contextual connections
- **More control**: Toggle per scripture vs all-or-nothing
- **Scalable**: Works with any number of related verses

### Why CSS-only Mobile Detection?
- **Consistency**: Matches existing hamburger menu pattern
- **Performance**: No JavaScript detection needed
- **Maintainable**: Uses Tailwind's standard breakpoints
- **Reliable**: No race conditions or hydration issues

### Why Dialog vs Expanding Row?
- **Readability**: Full screen space for long summaries
- **Mobile UX**: Better than tiny expanding table cell
- **Accessibility**: Proper focus management and keyboard support
- **Reusable**: Dialog pattern works for other mobile modals

---

## Future Enhancements

**Scripture Related Toggle**:
- Add "Expand All Related" button at message level
- Remember expand/collapse state per user preference
- Add related verse preview on hover

**Mobile Summary Dialog**:
- Add "Refresh" action in dialog footer
- Show status history timeline
- Link to member's journal from dialog

---

## Accessibility Considerations

**Scripture Related Toggle**:
- Button has clear label with count
- Focus management when expanding
- Keyboard navigation through nested scriptures
- Screen reader announces expand/collapse state

**Mobile Summary Dialog**:
- Focus traps in dialog when open
- ESC key closes dialog
- Clicking backdrop closes dialog
- ARIA labels for close button
- Focus returns to trigger button on close

---

## Non-Goals

- No changes to API or backend
- No changes to scripture comparison mode
- No changes to desktop counselor dashboard layout
- No new user preferences or settings
- No analytics or tracking
