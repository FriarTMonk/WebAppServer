# Book Resources UI Implementation Design

**Date**: 2025-12-26
**Status**: Approved for Implementation

---

## Overview

Complete frontend UI implementation for the biblical resources system, enabling users to browse books, maintain reading lists, discover organizations, and providing role-based administration interfaces. This builds on the existing backend API (`/api/books`) with comprehensive UI across all user roles.

---

## Design Principles

1. **Role-Based Access**: UI adapts to user permissions - regular users, counselors, org admins, platform admins
2. **Server-Side Enforcement**: Backend API controls visibility, frontend shows only what user can access
3. **Progressive Enhancement**: Core features first (browse, details), advanced features later (analytics)
4. **Consistent Patterns**: Reuse existing components (layouts, modals, cards) and styling
5. **Optimistic UI**: Immediate feedback for user actions, rollback on errors

---

## Section 1: Navigation Structure

### User Menu (UserMenu.tsx)

**All Authenticated Users**

Add "Resources" menu item between "Journal" and "Counselor":

```
Resources → (submenu)
  - Browse Books
  - My Reading List
  - Browse Organizations
  - Recommended for Me
```

**Counselors & Org Admins**

Same menu, but "Browse Books" page shows "Add New Book" button when appropriate permissions detected.

### Organization Admin Sidebar (OrgAdminLayout.tsx)

Add new "Resources" section after "Audit Log":

```
Resources (section header)
  - Books (list with filters)
  - Add New Book (form)
  - Pending Evaluations (status tracking)
  - Organizations (manage referrals)
```

### Platform Admin Sidebar (AdminLayout.tsx)

Add new "Resources" section in Technical area:

```
Resources (section header)
  - All Books (includes <70% locked books)
  - Evaluation Management (version control, re-evaluation)
  - Organizations (all platform orgs)
```

### Mobile Hamburger Menu (ConversationView.tsx)

Add resources section after Journal, with role-based visibility:
- All users see: Resources submenu
- Org admins see: Organization Admin → Resources
- Platform admins see: Admin → Resources

### Permission Matrix

| Action | Regular User | Counselor | Org Admin | Platform Admin |
|--------|-------------|-----------|-----------|----------------|
| View Books | ✓ (filtered by visibility) | ✓ | ✓ (org endorsed only) | ✓ (all including <70%) |
| Add Books | ✗ | ✓ | ✓ | ✓ |
| View Pending Evals | ✗ | ✗ | ✓ (org only) | ✓ (all) |
| Trigger Re-evaluation | ✗ | ✗ | ✗ | ✓ |
| View <70% Books | ✗ | ✗ | ✗ | ✓ |
| Manage Organizations | ✗ | ✗ | ✓ (add external orgs) | ✓ (all) |

---

## Section 2: Page Routing & Structure

### Next.js App Router

```
packages/web/src/app/
├── resources/
│   ├── layout.tsx (shared layout for all resource pages)
│   ├── books/
│   │   ├── page.tsx (Browse Books - GET /api/books)
│   │   ├── [id]/
│   │   │   └── page.tsx (Book Detail - GET /api/books/:id)
│   │   └── new/
│   │       └── page.tsx (Add Book - org admin/counselor only)
│   ├── reading-list/
│   │   └── page.tsx (My Reading List - user's saved books)
│   ├── organizations/
│   │   └── page.tsx (Browse Organizations)
│   └── recommended/
│       └── page.tsx (Recommended for Me - AI suggestions)
├── org-admin/
│   └── resources/
│       ├── books/
│       │   ├── page.tsx (Endorsed Books list)
│       │   └── pending/
│       │       └── page.tsx (Pending Evaluations)
│       └── organizations/
│           └── page.tsx (Manage Organizations)
└── admin/
    └── resources/
        ├── books/
        │   └── page.tsx (All Books including <70%)
        ├── evaluation/
        │   └── page.tsx (Evaluation Management)
        └── organizations/
            └── page.tsx (All Organizations)
```

### API Integration

All pages use existing endpoints:
- `GET /api/books` - List books with filters (search, visibility, genre, mature content)
- `GET /api/books/:id` - Book details with full theological analysis
- `POST /api/books` - Submit new book (ISBN/URL/manual)
- `POST /api/books/:id/pdf` - Upload PDF file

### Data Flow

1. User navigates to page → Page component fetches from API
2. API enforces visibility rules server-side
3. Client displays data with role-appropriate actions
4. Actions (add book, upload PDF) send requests to API
5. Optimistic UI updates with loading states, error handling

---

## Section 3: Shared Components

### BookCard.tsx

Reusable card for grid/list displays:

```
┌─────────────────────────────────┐
│  ┌─────┐                        │
│  │     │  Title (bold, 16px)    │
│  │ IMG │  Author (gray, 14px)   │
│  │     │  [90% ✓] Genre tag     │
│  └─────┘  [Mature] if flagged   │
│                                  │
│  "Recommended by 3 orgs"         │
│  [Save to List ▼] [View Details]│
└─────────────────────────────────┘
```

Props:
```typescript
interface BookCardProps {
  book: Book;
  showActions?: boolean;
  onSaveToList?: (status: ReadingStatus) => void;
  compact?: boolean;
}
```

### AlignmentScoreBadge.tsx

Color-coded score indicator:

- **≥90%**: Green background, "✓ Globally Aligned"
- **70-89%**: Yellow background, "⚠ Conceptually Aligned"
- **<70%**: Red background, "✗ Not Aligned" (platform admin only)

```typescript
interface AlignmentScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}
```

### BookFilters.tsx

Search and filter bar:

```
[Search: Title, Author, ISBN........................]
[Genre: All ▼] [Alignment: All ▼] [Show Mature: □]
[Sort: Relevance ▼]
```

Props:
```typescript
interface BookFiltersProps {
  filters: BookFilters;
  onFilterChange: (filters: BookFilters) => void;
  showAlignmentFilter?: boolean; // platform admin only
}
```

### ReadingListButton.tsx

Dropdown button for reading list management:

```
[Add to Reading List ▼]
  - Want to Read
  - Currently Reading
  - Finished
  - Remove from List
```

Props:
```typescript
interface ReadingListButtonProps {
  bookId: string;
  currentStatus?: ReadingStatus;
  onStatusChange: (status: ReadingStatus) => void;
}
```

### BookDetailView.tsx

Full book detail display with tabs:

**Left Column (60%)**
- Large cover image (300px height)
- Title (24px, bold), Author (18px), Publisher, Year
- Purchase links: [Amazon] [Christianbook] [LifeWay]
- [Download PDF] button if available and licensed
- "Endorsed by X organizations" (expandable)

**Right Column (40%)**
- Large alignment score badge
- Genre tag, Denominational tags
- [Mature Content] warning if flagged
- Action buttons:
  - [Add to Reading List ▼]
  - [Share] (copy link)
  - [Report Issue] (admin only)

**Tabs (full width)**
1. **Summary** - Theological summary (2-3 paragraphs)
2. **Analysis** - Per-doctrine scores, strengths, concerns, reasoning
3. **Endorsements** - Organizations with endorsement notes
4. **History** - Evaluation version history (platform admin only)

---

## Section 4: State Management

### React Hooks Pattern

No Redux/Zustand needed - use React hooks for state:

**Book List State**
```typescript
const [books, setBooks] = useState<Book[]>([]);
const [loading, setLoading] = useState(true);
const [filters, setFilters] = useState({
  search: '',
  genre: 'all',
  visibilityTier: 'all',
  showMatureContent: false,
  skip: 0,
  take: 20
});
const [totalCount, setTotalCount] = useState(0);
```

**Reading List State**
```typescript
const [readingList, setReadingList] = useState({
  wantToRead: [],
  currentlyReading: [],
  finished: []
});
```

**Book Detail State**
```typescript
const [book, setBook] = useState<Book | null>(null);
const [activeTab, setActiveTab] = useState<'summary' | 'analysis' | 'endorsements' | 'history'>('summary');
const [userReadingStatus, setUserReadingStatus] = useState<'none' | 'want' | 'reading' | 'finished'>('none');
```

### API Helper Functions

Extend existing `lib/api.ts`:

```typescript
export const bookApi = {
  list: (filters: BookFilters) => apiGet(`/books?${new URLSearchParams(filters)}`),
  getById: (id: string) => apiGet(`/books/${id}`),
  create: (data: CreateBookDto) => apiPost('/books', data),
  uploadPdf: (id: string, file: File, licenseType: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('pdfLicenseType', licenseType);
    return apiPost(`/books/${id}/pdf`, formData);
  }
};
```

### Loading & Error Handling

Consistent patterns:
- **Initial load**: Full-page skeleton loader
- **Pagination/filter**: Overlay spinner on content
- **Errors**: Toast notification + inline error with retry button
- **Optimistic updates**: Immediately update UI, rollback on API error

### Caching Strategy

- Book lists: Re-fetch on filter change
- Book details: Cache for 5 minutes using `useMemo` with timestamp
- Reading list: Optimistic updates, sync on mount
- No service worker for MVP

---

## Section 5: Permissions & Role Checks

### useUserPermissions Hook

```typescript
// hooks/useUserPermissions.ts
export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    canAddBooks: false,
    canViewPendingEvals: false,
    canTriggerReeval: false,
    canViewNotAligned: false,
    isOrgAdmin: false,
    isCounselor: false,
    isPlatformAdmin: false
  });

  useEffect(() => {
    if (!user) return;

    // Check roles via API (similar to UserMenu.tsx pattern)
    // - apiGet('/org-admin/organization') for isOrgAdmin
    // - apiGet('/admin/health-check') for isPlatformAdmin
    // - apiGet('/profile/organizations') for isCounselor
  }, [user]);

  return permissions;
}
```

### Conditional Rendering Examples

```typescript
// Browse Books page
{permissions.canAddBooks && (
  <button onClick={() => router.push('/resources/books/new')}>
    Add New Book
  </button>
)}

// Book Detail page
{book.pdfFilePath && book.pdfLicenseType !== 'ANALYSIS_ONLY' && (
  <button onClick={handleDownloadPdf}>
    Download PDF
  </button>
)}
```

---

## Section 6: Edge Cases & Error Handling

### 1. Book Not Found / Access Denied

- API returns 404 or 403
- Show: "Book not found" or "You don't have access to this book"
- Action: [Browse Books] button

**Note**: Should rarely occur - API enforces visibility server-side

### 2. Pending Evaluation

- Book shows `evaluationStatus: 'pending'`
- Display: "⏳ Evaluation in progress - you'll receive an email when complete"
- Disable: Save to Reading List (until evaluation completes)

### 3. Failed Evaluation

- Book shows `evaluationStatus: 'failed'`
- **Org Admin sees**: "Evaluation failed" (clean message)
- **Platform Admin sees**: [Retry Evaluation] button

**Important**: Org Admin book list filtered to only show books endorsed by their organization

### 4. No Books Found

- Empty state with illustration
- Message: "No books found matching your filters"
- Actions:
  - [Clear Filters] button
  - [Add First Book] (if org admin)

### 5. Mature Content Filtering

- Automatically filter based on user's account type (child/teen/adult)
- Show count: "3 books hidden due to mature content settings"
- No profile link (informational only)

### 6. Duplicate Book Submission

- API detects duplicate, returns existing book ID
- Show modal: "This book already exists with 92% alignment. Your organization has been added as an endorser."
- Action: [View Book] button

### 7. PDF Upload Failures

- **File too large (>100MB)**: "File must be under 100MB"
- **Invalid PDF**: "Please upload a valid PDF file"
- **Incomplete PDF**: "This appears to be an excerpt. Please upload the complete book."
- **License type missing**: Validate before upload, show error if not selected

### 8. Offline/Network Errors

- Toast notification: "Network error - please check your connection"
- [Retry] button visible
- No data loss for forms (preserve state)

### 9. Org Admin Data Scoping

- `/org-admin/resources/books` only shows books endorsed by their organization
- API filtering: `GET /books?endorsedByOrganization={orgId}`
- Platform Admin sees all books including <70% not-aligned

---

## Section 7: Page Specifications

### Browse Books (`/resources/books/page.tsx`)

**Purpose**: Main book discovery page for all users

**Layout**:
```
[Page Header: "Browse Books"]
[BookFilters component]

{permissions.canAddBooks && (
  <button>Add New Book</button>
)}

<Grid of BookCard components>

[Pagination: Previous | 1 2 3 ... 10 | Next]
```

**Filters**:
- Search: Title, Author, ISBN
- Genre: All, Theology, Devotional, Fiction, Study, etc.
- Alignment: All, Globally Aligned (≥90%), Conceptually Aligned (70-89%)
- Show Mature Content: Checkbox
- Sort: Relevance, Title A-Z, Newest, Highest Rated

**API Call**: `GET /api/books?search={search}&genre={genre}&visibilityTier={tier}&showMatureContent={bool}&skip={skip}&take=20`

**Empty State**: "No books found. Clear your filters or be the first to add a book!"

---

### Book Detail (`/resources/books/[id]/page.tsx`)

**Purpose**: Full book details with theological analysis

**Layout**: See BookDetailView component (Section 3)

**API Call**: `GET /api/books/{id}`

**Tabs**:

1. **Summary Tab**
   - `book.theologicalSummary` (2-3 paragraphs)
   - Purchase links grid

2. **Analysis Tab**
   - Doctrine category scores (`book.doctrineCategoryScores`)
   - Theological strengths (`book.theologicalStrengths`)
   - Theological concerns (`book.theologicalConcerns`)
   - Scoring reasoning (`book.scoringReasoning`)
   - Analysis level (`book.analysisLevel`)

3. **Endorsements Tab**
   - List of organizations that endorse this book
   - Endorsement notes (if provided)
   - "Your organization endorses this book" badge if applicable

4. **History Tab** (Platform Admin only)
   - Evaluation version history (`book.evaluationHistory`)
   - Score changes over time
   - Re-evaluation timestamps

---

### Add New Book (`/resources/books/new/page.tsx`)

**Purpose**: Submit book for evaluation (org admin/counselor only)

**Route Guard**: Check `permissions.canAddBooks`, redirect if false

**Three-Step Wizard**:

**Step 1: Lookup Method**
```
How would you like to add this book?

( ) ISBN or URL Lookup (Recommended)
    [Enter ISBN, Amazon URL, or Christian bookstore link..........]

( ) Manual Entry
    [I'll enter the details myself]

[Continue →]
```

**Step 2: Review & Edit Metadata**
```
Book Information
━━━━━━━━━━━━━━━━
Cover: [Image preview or [Upload] button]
Title: [.......................................]
Author: [.......................................]
Publisher: [....................................] (optional)
Year: [......] (optional)
ISBN: [....................................] (optional)
Description: [.................................]
            [.................................]

[← Back] [Continue to PDF Upload →]
```

**Step 3: PDF Upload (Optional)**
```
PDF Upload (Optional but Recommended)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uploading a PDF enables deeper theological analysis.

[Drag & drop PDF here or click to browse]
Max size: 100MB

License Type: [Please Select ▼]
  - Public Domain
  - Creative Commons
  - Publisher Permission
  - Analysis Only (not shareable)

⚠️ Ensure you have rights to share this PDF.
⚠️ PDF must be the complete book (not excerpts).

[← Back] [Skip PDF] [Submit Book →]
```

**API Calls**:
1. `POST /api/books` with book metadata
2. `POST /api/books/{id}/pdf` with PDF file (if uploaded)

**Success Modal**:
"Book submitted for evaluation! You'll receive an email when the theological analysis is complete (typically 2-5 minutes)."

[View Book] [Add Another Book]

---

### Reading List (`/resources/reading-list/page.tsx`)

**Purpose**: User's personal library with status tracking

**Data Model**:
```typescript
interface ReadingListItem {
  id: string;
  bookId: string;
  book: Book;
  status: 'want_to_read' | 'currently_reading' | 'finished';
  progress?: number; // 0-100
  notes?: string;
  startedAt?: Date;
  finishedAt?: Date;
  addedAt: Date;
}
```

**Layout**:
```
[Banner: 📚 Your reading list is visible to the AI during counseling
sessions for personalized guidance.]

[Want to Read (12)] [Currently Reading (3)] [Finished (45)]

<Grid of book cards>
Each card shows:
  - Cover thumbnail
  - Title, Author
  - Status badge
  - Progress bar (currently_reading only)
  - Personal notes snippet
  - [Actions ▼]: Update Status, Add Notes, Remove
```

**Empty States**:
- **Want to Read**: "No books saved yet. Browse books to add to your reading list."
- **Currently Reading**: "Start reading a book from your 'Want to Read' list."
- **Finished**: "Completed books will appear here with your reading history."

**API Endpoint** (Future): `GET /api/reading-list`, `POST /api/reading-list`, `PUT /api/reading-list/{id}`

---

### Browse Organizations (`/resources/organizations/page.tsx`)

**Purpose**: Discover churches, counseling centers, support services

**Two Organization Types**:

1. **Internal Platform Organizations**
   - Churches/ministries that use the platform
   - Show: Name, Location, Services
   - Action: [Request Connection] button

2. **External Referral Organizations**
   - Local support services added by org admins
   - Crisis hotlines, counseling centers, support groups
   - Show: Full contact info

**Organization Card**:
```
┌─────────────────────────────────────────┐
│ [Church] First Baptist Church           │ ← Green border for churches
│ 📍 1.2 miles from you                   │
│ ⚫ Grief Support ⚫ Counseling           │
│                                         │
│ 📞 (555) 123-4567  📧 contact@fbc.org  │
│ 🌐 www.fbc.org     🗺️ View on map      │
│                                         │
│ Hours: Mon-Fri 8am-8pm, 24/7 crisis    │
│                                         │
│ "Why we recommend: Active grief support │
│  ministry with trained counselors"      │
└─────────────────────────────────────────┘
```

**Filters**:
- Location: [Within 5 miles ▼] [ZIP code input]
- Type: [All ▼] [Church] [Counseling] [Crisis] [Support Group]
- Services: [Grief] [Addiction] [Marriage] [Youth] etc.

**Sort Options**:
- Distance (nearest first)
- Name (A-Z)
- Recently Added

**API Endpoint** (Future): `GET /api/organizations`

---

### Recommended For Me (`/resources/recommended/page.tsx`)

**Purpose**: AI-powered personalized book suggestions

**Recommendation Sources**:
- Recent counseling conversation topics
- User's reading list history
- Spiritual growth patterns from journal
- Organization's endorsed books

**Layout**:
```
[Header: 📖 Books recommended based on your counseling sessions
and spiritual journey]

[Relevance: High → Low ▼] [Filter by Genre ▼]

┌─────────────────────────────────────────┐
│ [Book Card]                             │
│                                         │
│ Recommended because:                    │
│ "You've been discussing grief and loss  │
│  in recent sessions. This book addresses│
│  healing through biblical perspectives."│
│                                         │
│ [View Details] [Add to Reading List]    │
└─────────────────────────────────────────┘
```

**Empty State**: "Continue having counseling conversations to receive personalized book recommendations."

**API Endpoint** (Future): `GET /api/books/recommended`

---

### Org Admin: Endorsed Books (`/org-admin/resources/books/page.tsx`)

**Purpose**: Manage books endorsed by organization

**Route Guard**: Check `permissions.isOrgAdmin`

**Important**: Only shows books endorsed by user's organization

**Layout**:
```
[Page Header: "Our Endorsed Books"]

[BookFilters component]

[Add New Book] [View Pending Evaluations]

<Table of books>
Columns:
  - Cover
  - Title, Author
  - Alignment Score
  - Genre
  - Endorsement Date
  - Actions: [View] [Usage Analytics]
```

**API Call**: `GET /api/books?endorsedByOrganization={orgId}`

---

### Org Admin: Pending Evaluations (`/org-admin/resources/books/pending/page.tsx`)

**Purpose**: Track books submitted by org awaiting evaluation

**Route Guard**: Check `permissions.isOrgAdmin`

**Layout**:
```
[Page Header: "Pending Evaluations"]

Book Title          | Author        | Status      | Submitted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mere Christianity   | C.S. Lewis    | ⏳ Pending  | 2 min ago
The Screwtape...    | C.S. Lewis    | ⏳ Pending  | 5 min ago
Knowing God         | J.I. Packer   | ✗ Failed    | 1 hour ago
```

**Status Indicators**:
- ⏳ Pending: Evaluation in progress
- ✓ Completed: Evaluation finished, view results
- ✗ Failed: Evaluation failed, shows error message

**API Call**: `GET /api/books?submittedByOrganization={orgId}&evaluationStatus=pending`

---

### Platform Admin: All Books (`/admin/resources/books/page.tsx`)

**Purpose**: View and manage all books including <70% not-aligned

**Route Guard**: Check `permissions.isPlatformAdmin`

**Layout**:
```
[Page Header: "All Books"]

[BookFilters + Alignment: All including <70% ▼]
[Evaluation Status: All ▼] [Endorsement Count ▼]

[Trigger Global Re-evaluation] (confirmation modal)

<Enhanced Table>
Columns:
  - Cover
  - Title, Author
  - Alignment Score (color-coded)
  - Visibility Tier
  - Endorsement Count
  - Evaluation Status
  - Submitted By (org name)
  - Actions: [View] [Trigger Re-eval] [Audit Log]
```

**API Call**: `GET /api/books` (no filtering - sees all books)

**Actions**:
- **Trigger Re-evaluation**: Queues book for re-evaluation with current algorithm version
- **View Audit Log**: Shows evaluation history and changes

---

### Platform Admin: Evaluation Management (`/admin/resources/evaluation/page.tsx`)

**Purpose**: System-level evaluation controls and analytics

**Route Guard**: Check `permissions.isPlatformAdmin`

**Layout**:
```
Current Evaluation Framework
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version: 1.0.0
Last Updated: Dec 23, 2025
Books Evaluated: 1,247

Thresholds
━━━━━━━━━━
Not Aligned: <70%
Conceptually Aligned: 70-89%
Globally Aligned: ≥90%
Borderline Range: ±3%

Models
━━━━━━
Primary: Claude Sonnet 4.5
Escalation: Claude Opus 4.5

[Update Evaluation Framework]
⚠️ Triggers global re-evaluation of all books

Evaluation Queue
━━━━━━━━━━━━━━━━
Pending: 12 books
In Progress: 3 books
Failed (last 24h): 2 books

[View Queue Details]

Cost Analytics
━━━━━━━━━━━━━
This Month: $1,245 (415 evaluations)
Average per Book: $3.00
Last 7 Days: $245 (82 evaluations)

[Download CSV Report]
```

**API Endpoints** (Future):
- `GET /api/admin/evaluation/stats`
- `POST /api/admin/evaluation/framework` (update evaluation version)

---

## Section 8: Responsive Design

### Breakpoints (Tailwind)

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm - lg)
- **Desktop**: ≥ 1024px (lg)

### Mobile Adaptations

**Book Cards**:
- Desktop: 3-column grid
- Tablet: 2-column grid
- Mobile: 1-column list

**Book Detail Page**:
- Desktop: 2-column layout (60/40)
- Mobile: Stacked layout (cover → info → tabs)

**Filters**:
- Desktop: Horizontal filter bar
- Mobile: Collapsible filter panel with [Filters] button

**Tables** (Org Admin, Platform Admin):
- Desktop: Full table
- Mobile: Card-based list with key info

---

## Section 9: Testing Strategy

### Unit Tests

- Component rendering with different props
- Permission hooks return correct values
- API helper functions construct correct URLs
- Filter logic works correctly

### Integration Tests

- Book list pagination works
- Book detail tabs switch correctly
- Add book wizard validates inputs
- Reading list updates optimistically

### E2E Tests (Playwright)

**User Flow**:
1. Login as regular user
2. Browse books
3. View book detail
4. Add to reading list
5. Check reading list

**Org Admin Flow**:
1. Login as org admin
2. Navigate to Add New Book
3. Submit book with ISBN
4. Check Pending Evaluations
5. View book after evaluation completes

**Platform Admin Flow**:
1. Login as platform admin
2. View All Books including <70%
3. Trigger re-evaluation
4. View Evaluation Management stats

---

## Section 10: Implementation Phases

### Phase 1: Core Navigation & Browse (Week 1)

- [ ] Update UserMenu with Resources submenu
- [ ] Update AdminLayout with Resources section
- [ ] Update OrgAdminLayout with Resources section
- [ ] Update mobile menu in ConversationView
- [ ] Create useUserPermissions hook
- [ ] Build BookCard component
- [ ] Build AlignmentScoreBadge component
- [ ] Build BookFilters component
- [ ] Create Browse Books page (`/resources/books`)
- [ ] Implement book list pagination

### Phase 2: Book Details & Reading List (Week 2)

- [ ] Build BookDetailView component
- [ ] Create Book Detail page (`/resources/books/[id]`)
- [ ] Implement tab navigation (Summary, Analysis, Endorsements)
- [ ] Build ReadingListButton component
- [ ] Create Reading List page (`/resources/reading-list`)
- [ ] Implement reading list state management
- [ ] Add reading list API integration (future endpoint)

### Phase 3: Add Book & Org Admin (Week 3)

- [ ] Build Add New Book wizard (`/resources/books/new`)
- [ ] Implement ISBN/URL lookup
- [ ] Implement PDF upload with license validation
- [ ] Create Org Admin Endorsed Books page
- [ ] Create Pending Evaluations page
- [ ] Implement org-scoped book filtering

### Phase 4: Recommendations & Organizations (Week 4)

- [ ] Create Recommended For Me page
- [ ] Build organization card component
- [ ] Create Browse Organizations page
- [ ] Implement organization filters
- [ ] Add map integration for distance

### Phase 5: Platform Admin Tools (Week 5)

- [ ] Create Platform Admin All Books page
- [ ] Implement <70% book visibility
- [ ] Create Evaluation Management page
- [ ] Add re-evaluation trigger functionality
- [ ] Build evaluation queue view
- [ ] Implement cost analytics display

### Phase 6: Polish & Testing (Week 6)

- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add empty states with illustrations
- [ ] Write unit tests for components
- [ ] Write integration tests for pages
- [ ] Run E2E test suite
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Section 11: Future Enhancements

**Not included in initial implementation**:

1. **Usage Analytics**
   - Track book recommendation frequency
   - Show which counselors recommend which books
   - Organization engagement metrics

2. **Advanced Reading List Features**
   - Progress notes per chapter
   - Reading goals and streaks
   - Social sharing with other users

3. **Organization Features**
   - Internal messaging between orgs
   - Endorsement notes and reviews
   - Collaborative book recommendations

4. **Search Enhancements**
   - Full-text search in book content
   - Semantic search by theological topics
   - "Books similar to this" recommendations

5. **Mobile App**
   - Native iOS/Android apps
   - Offline reading list access
   - Push notifications for evaluations

6. **Internationalization**
   - Multi-language book support
   - Translated theological analyses
   - Regional organization discovery

---

## Success Metrics

### Week 1 (After Phase 1)
- Navigation structure deployed
- Browse Books accessible to all users
- Book cards render correctly
- Filters work and persist

### Week 2 (After Phase 2)
- Book details page shows full analysis
- Reading list functional
- Users can add/remove books from list

### Week 3 (After Phase 3)
- Org admins can add books
- PDF upload working
- Pending evaluations tracked

### Week 4 (After Phase 4)
- Recommendations page live
- Organizations browseable
- Filters and search working

### Week 5 (After Phase 5)
- Platform admin tools complete
- Re-evaluation functional
- Analytics visible

### Week 6 (After Phase 6)
- All tests passing
- Accessibility compliant
- Performance optimized
- Zero critical bugs

---

## Conclusion

This design provides a comprehensive UI implementation for the book resources system, with clear role-based access, reusable components, and progressive enhancement. The phased approach ensures continuous delivery of value while maintaining quality and testability.
