# Book Resources UI - Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement core navigation structure and Browse Books page with role-based permissions, enabling users to discover books through the UI for the first time.

**Architecture:** Add Resources menu items across all navigation contexts (UserMenu, AdminLayout, OrgAdminLayout, mobile menu), create reusable book display components, build Browse Books page with filtering and pagination, integrate with existing `/api/books` endpoint.

**Tech Stack:** React 18, Next.js 16.1.0, TypeScript, Tailwind CSS, existing auth context patterns

---

## Task 1: Create useUserPermissions Hook

**Files:**
- Create: `packages/web/src/hooks/useUserPermissions.ts`

**Step 1: Create the permissions hook file**

File: `packages/web/src/hooks/useUserPermissions.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../lib/api';

export interface UserPermissions {
  canAddBooks: boolean;
  canViewPendingEvals: boolean;
  canTriggerReeval: boolean;
  canViewNotAligned: boolean;
  isOrgAdmin: boolean;
  isCounselor: boolean;
  isPlatformAdmin: boolean;
}

export function useUserPermissions(): UserPermissions {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddBooks: false,
    canViewPendingEvals: false,
    canTriggerReeval: false,
    canViewNotAligned: false,
    isOrgAdmin: false,
    isCounselor: false,
    isPlatformAdmin: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions({
        canAddBooks: false,
        canViewPendingEvals: false,
        canTriggerReeval: false,
        canViewNotAligned: false,
        isOrgAdmin: false,
        isCounselor: false,
        isPlatformAdmin: false,
      });
      return;
    }

    // Check if user is Platform Admin
    apiGet('/admin/health-check')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not a platform admin');
      })
      .then(data => {
        const isPlatformAdmin = data.isPlatformAdmin === true;
        setPermissions(prev => ({
          ...prev,
          isPlatformAdmin,
          canTriggerReeval: isPlatformAdmin,
          canViewNotAligned: isPlatformAdmin,
        }));
      })
      .catch(() => {
        // Not a platform admin, continue with other checks
      });

    // Check if user is Organization Admin
    apiGet('/org-admin/organization')
      .then(res => {
        if (res.ok) {
          setPermissions(prev => ({
            ...prev,
            isOrgAdmin: true,
            canAddBooks: true,
            canViewPendingEvals: true,
          }));
        }
      })
      .catch(() => {
        // Not an org admin
      });

    // Check if user has Counselor role
    apiGet('/profile/organizations')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('No organizations');
      })
      .then(orgs => {
        const hasCounselorRole = Array.isArray(orgs) &&
          orgs.some((org: any) => org.role?.name?.includes('Counselor'));

        if (hasCounselorRole) {
          setPermissions(prev => ({
            ...prev,
            isCounselor: true,
            canAddBooks: true,
          }));
        }
      })
      .catch(() => {
        // No counselor role
      });
  }, [isAuthenticated, user]);

  return permissions;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/web/src/hooks/useUserPermissions.ts
git commit -m "feat: add useUserPermissions hook for role-based UI

Implements role checking for:
- Platform Admin (can view <70% books, trigger re-evaluation)
- Org Admin (can add books, view pending evaluations)
- Counselor (can add books)

Uses existing API endpoints:
- /admin/health-check for platform admin check
- /org-admin/organization for org admin check
- /profile/organizations for counselor role check

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create AlignmentScoreBadge Component

**Files:**
- Create: `packages/web/src/components/AlignmentScoreBadge.tsx`

**Step 1: Create the badge component**

File: `packages/web/src/components/AlignmentScoreBadge.tsx`

```typescript
'use client';

interface AlignmentScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function AlignmentScoreBadge({ score, size = 'medium' }: AlignmentScoreBadgeProps) {
  // Determine tier and styling
  const getStyles = () => {
    if (score >= 90) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        icon: '✓',
        label: 'Globally Aligned',
      };
    } else if (score >= 70) {
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300',
        icon: '⚠',
        label: 'Conceptually Aligned',
      };
    } else {
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        icon: '✗',
        label: 'Not Aligned',
      };
    }
  };

  const { bgColor, textColor, borderColor, icon, label } = getStyles();

  // Size classes
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-xs',
      score: 'text-sm font-bold',
    },
    medium: {
      container: 'px-3 py-1.5 text-sm',
      score: 'text-base font-bold',
    },
    large: {
      container: 'px-4 py-2 text-base',
      score: 'text-2xl font-bold',
    },
  };

  const { container, score: scoreClass } = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 ${bgColor} ${textColor} ${borderColor} border rounded-lg ${container}`}>
      <span className={scoreClass}>{score}%</span>
      <span className="font-medium">
        {icon} {label}
      </span>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/web/src/components/AlignmentScoreBadge.tsx
git commit -m "feat: add AlignmentScoreBadge component

Color-coded badge for biblical alignment scores:
- Green (≥90%): Globally Aligned
- Yellow (70-89%): Conceptually Aligned
- Red (<70%): Not Aligned

Supports three sizes: small, medium, large

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Extend API Helpers with Book Functions

**Files:**
- Modify: `packages/web/src/lib/api.ts`

**Step 1: Add book API helpers to api.ts**

Add to end of file `packages/web/src/lib/api.ts`:

```typescript
// Book API helpers
export interface BookFilters {
  search?: string;
  genre?: string;
  visibilityTier?: string;
  showMatureContent?: boolean;
  skip?: number;
  take?: number;
  sort?: string;
}

export const bookApi = {
  list: (filters: BookFilters) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.genre && filters.genre !== 'all') params.append('genre', filters.genre);
    if (filters.visibilityTier && filters.visibilityTier !== 'all') params.append('visibilityTier', filters.visibilityTier);
    if (filters.showMatureContent !== undefined) params.append('showMatureContent', String(filters.showMatureContent));
    if (filters.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters.take !== undefined) params.append('take', String(filters.take));
    if (filters.sort) params.append('sort', filters.sort);

    return apiGet(`/books?${params.toString()}`);
  },

  getById: (id: string) => apiGet(`/books/${id}`),

  create: (data: any) => apiPost('/books', data),

  uploadPdf: (id: string, file: File, licenseType: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('pdfLicenseType', licenseType);
    return apiPost(`/books/${id}/pdf`, formData);
  },
};
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat: add book API helper functions

Adds bookApi object with methods:
- list(filters): GET /books with query params
- getById(id): GET /books/:id
- create(data): POST /books
- uploadPdf(id, file, licenseType): POST /books/:id/pdf

Includes BookFilters interface for type safety.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create BookCard Component

**Files:**
- Create: `packages/web/src/components/BookCard.tsx`

**Step 1: Create the book card component**

File: `packages/web/src/components/BookCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlignmentScoreBadge } from './AlignmentScoreBadge';

interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl?: string;
  biblicalAlignmentScore?: number;
  genreTag?: string;
  matureContent?: boolean;
  endorsementCount?: number;
}

interface BookCardProps {
  book: Book;
  showActions?: boolean;
  compact?: boolean;
}

export function BookCard({ book, showActions = true, compact = false }: BookCardProps) {
  const router = useRouter();
  const [showReadingListMenu, setShowReadingListMenu] = useState(false);

  const handleViewDetails = () => {
    router.push(`/resources/books/${book.id}`);
  };

  const handleSaveToList = (status: string) => {
    // TODO: Implement reading list functionality in Phase 2
    console.log('Save to list:', book.id, status);
    setShowReadingListMenu(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={`${book.title} cover`}
              className={`${compact ? 'w-16 h-24' : 'w-24 h-36'} object-cover rounded`}
            />
          ) : (
            <div className={`${compact ? 'w-16 h-24' : 'w-24 h-36'} bg-gray-200 rounded flex items-center justify-center`}>
              <span className="text-gray-400 text-xs text-center px-2">No Cover</span>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {book.author}
          </p>

          {/* Alignment Score Badge */}
          {book.biblicalAlignmentScore !== undefined && (
            <div className="mb-2">
              <AlignmentScoreBadge score={book.biblicalAlignmentScore} size="small" />
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {book.genreTag && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {book.genreTag}
              </span>
            )}
            {book.matureContent && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Mature Content
              </span>
            )}
          </div>

          {/* Endorsement Count */}
          {book.endorsementCount !== undefined && book.endorsementCount > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Recommended by {book.endorsementCount} organization{book.endorsementCount !== 1 ? 's' : ''}
            </p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 mt-3">
              {/* Reading List Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowReadingListMenu(!showReadingListMenu)}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Save to List ▼
                </button>

                {showReadingListMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowReadingListMenu(false)}
                    />
                    <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                      <button
                        onClick={() => handleSaveToList('want_to_read')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Want to Read
                      </button>
                      <button
                        onClick={() => handleSaveToList('currently_reading')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Currently Reading
                      </button>
                      <button
                        onClick={() => handleSaveToList('finished')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Finished
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleViewDetails}
                className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
              >
                View Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/web/src/components/BookCard.tsx
git commit -m "feat: add BookCard component

Reusable card for displaying books in lists and grids:
- Cover image with fallback
- Title, author, alignment score
- Genre and mature content tags
- Endorsement count
- Reading list dropdown (placeholder)
- View details button

Supports compact mode for smaller displays.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create BookFilters Component

**Files:**
- Create: `packages/web/src/components/BookFilters.tsx`

**Step 1: Create the filters component**

File: `packages/web/src/components/BookFilters.tsx`

```typescript
'use client';

import { useState } from 'react';

interface BookFiltersProps {
  filters: {
    search: string;
    genre: string;
    visibilityTier: string;
    showMatureContent: boolean;
    sort: string;
  };
  onFilterChange: (filters: any) => void;
  showAlignmentFilter?: boolean;
}

export function BookFilters({ filters, onFilterChange, showAlignmentFilter = false }: BookFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Title, Author, ISBN..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Genre Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <select
            value={localFilters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Genres</option>
            <option value="theology">Theology</option>
            <option value="devotional">Devotional</option>
            <option value="fiction">Fiction</option>
            <option value="study">Study</option>
            <option value="biography">Biography</option>
            <option value="commentary">Commentary</option>
          </select>
        </div>

        {/* Alignment Filter (Platform Admin only) */}
        {showAlignmentFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alignment
            </label>
            <select
              value={localFilters.visibilityTier}
              onChange={(e) => handleFilterChange('visibilityTier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="globally_aligned">Globally Aligned (≥90%)</option>
              <option value="conceptually_aligned">Conceptually Aligned (70-89%)</option>
              <option value="not_aligned">Not Aligned (<70%)</option>
            </select>
          </div>
        )}

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={localFilters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Relevance</option>
            <option value="title">Title (A-Z)</option>
            <option value="newest">Newest First</option>
            <option value="score">Highest Score</option>
          </select>
        </div>
      </div>

      {/* Mature Content Checkbox */}
      <div className="mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localFilters.showMatureContent}
            onChange={(e) => handleFilterChange('showMatureContent', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Show books with mature content
          </span>
        </label>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/web/src/components/BookFilters.tsx
git commit -m "feat: add BookFilters component

Filter controls for book browsing:
- Search input (title, author, ISBN)
- Genre dropdown
- Alignment filter (platform admin only)
- Sort options
- Mature content checkbox

Responsive grid layout (1 col mobile, 4 col desktop).

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Browse Books Page

**Files:**
- Create: `packages/web/src/app/resources/books/page.tsx`

**Step 1: Create the Browse Books page**

File: `packages/web/src/app/resources/books/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookCard } from '../../../components/BookCard';
import { BookFilters } from '../../../components/BookFilters';
import { useUserPermissions } from '../../../hooks/useUserPermissions';
import { bookApi, BookFilters as BookFiltersType } from '../../../lib/api';

export default function BrowseBooksPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<BookFiltersType>({
    search: '',
    genre: 'all',
    visibilityTier: 'all',
    showMatureContent: false,
    skip: 0,
    take: 20,
    sort: 'relevance',
  });

  useEffect(() => {
    loadBooks();
  }, [filters]);

  const loadBooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bookApi.list(filters);

      if (!response.ok) {
        throw new Error('Failed to load books');
      }

      const data = await response.json();
      setBooks(data.books || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError('Failed to load books. Please try again.');
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters({ ...newFilters, skip: 0 }); // Reset to first page
  };

  const handleNextPage = () => {
    setFilters(prev => ({ ...prev, skip: (prev.skip || 0) + (prev.take || 20) }));
  };

  const handlePreviousPage = () => {
    setFilters(prev => ({ ...prev, skip: Math.max(0, (prev.skip || 0) - (prev.take || 20)) }));
  };

  const currentPage = Math.floor((filters.skip || 0) / (filters.take || 20)) + 1;
  const totalPages = Math.ceil(totalCount / (filters.take || 20));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browse Books</h1>
              <p className="text-sm text-gray-600 mt-1">
                Discover biblically-aligned Christian books
              </p>
            </div>

            {permissions.canAddBooks && (
              <button
                onClick={() => router.push('/resources/books/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add New Book
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <BookFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          showAlignmentFilter={permissions.isPlatformAdmin}
        />

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${totalCount} book${totalCount !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadBooks}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-gray-200 rounded" />
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="h-6 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Books Grid */}
        {!loading && books.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} showActions={true} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && books.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">No books found matching your filters.</p>
            <button
              onClick={() => handleFilterChange({
                search: '',
                genre: 'all',
                visibilityTier: 'all',
                showMatureContent: false,
                skip: 0,
                take: 20,
                sort: 'relevance',
              })}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className={`px-4 py-2 rounded-md ${
                currentPage >= totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Test in browser**

Run: Visit `http://localhost:3699/resources/books`
Expected: Page loads (may show empty state if no books in database)

**Step 4: Commit**

```bash
git add packages/web/src/app/resources/books/page.tsx
git commit -m "feat: add Browse Books page

Full-featured book browsing with:
- BookFilters integration
- BookCard grid display
- Pagination controls
- Loading skeleton
- Empty state
- Error handling with retry
- \"Add New Book\" button for authorized users

Integrates with GET /api/books endpoint.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update UserMenu with Resources Submenu

**Files:**
- Modify: `packages/web/src/components/UserMenu.tsx`

**Step 1: Add Resources menu item after Journal**

After the Journal button (around line 205), add:

```typescript
          {/* Resources Submenu */}
          <div className="border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/resources/books');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Browse Books
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/resources/reading-list');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              My Reading List
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/resources/organizations');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Browse Organizations
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/resources/recommended');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Recommended for Me
            </button>
          </div>
```

**Step 2: Test in browser**

Run: Visit `http://localhost:3699/home` and open user menu
Expected: Resources menu items appear after Journal

**Step 3: Commit**

```bash
git add packages/web/src/components/UserMenu.tsx
git commit -m "feat: add Resources submenu to UserMenu

Adds four navigation items after Journal:
- Browse Books
- My Reading List
- Browse Organizations
- Recommended for Me

All users see these menu items (pages will handle
authorization internally).

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update AdminLayout with Resources Section

**Files:**
- Modify: `packages/web/src/components/AdminLayout.tsx`

**Step 1: Add Resources section after Technical section**

After the Technical section (after line 127), add:

```typescript
              {/* Resources Section */}
              <li>
                <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  Resources
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href="/admin/resources/books"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/books')}`}
                    >
                      All Books
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/resources/evaluation"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/evaluation')}`}
                    >
                      Evaluation Management
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/resources/organizations"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/resources/organizations')}`}
                    >
                      Organizations
                    </Link>
                  </li>
                </ul>
              </li>
```

**Step 2: Test in browser**

Run: Visit `http://localhost:3699/admin` (as platform admin)
Expected: Resources section appears in sidebar

**Step 3: Commit**

```bash
git add packages/web/src/components/AdminLayout.tsx
git commit -m "feat: add Resources section to AdminLayout

Adds new Resources section with three pages:
- All Books (includes <70% not-aligned books)
- Evaluation Management (version control, queue)
- Organizations (all platform organizations)

Appears in Technical area of sidebar.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update OrgAdminLayout with Resources Section

**Files:**
- Modify: `packages/web/src/components/OrgAdminLayout.tsx`

**Step 1: Add Resources section after Audit Log**

After Audit Log (after line 81), add:

```typescript
              {/* Resources Section */}
              <li className="mt-6">
                <div className="px-4 py-2 text-xs font-semibold text-green-300 uppercase tracking-wider">
                  Resources
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href="/org-admin/resources/books"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/books')}`}
                    >
                      Books
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/resources/books/new"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/resources/books/new')}`}
                    >
                      Add New Book
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/org-admin/resources/books/pending"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/books/pending')}`}
                    >
                      Pending Evaluations
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/org-admin/resources/organizations"
                      className={`block px-4 py-2 rounded transition-colors ${isActive('/org-admin/resources/organizations')}`}
                    >
                      Organizations
                    </Link>
                  </li>
                </ul>
              </li>
```

**Step 2: Test in browser**

Run: Visit `http://localhost:3699/org-admin` (as org admin)
Expected: Resources section appears in sidebar

**Step 3: Commit**

```bash
git add packages/web/src/components/OrgAdminLayout.tsx
git commit -m "feat: add Resources section to OrgAdminLayout

Adds new Resources section with four pages:
- Books (endorsed by organization)
- Add New Book
- Pending Evaluations
- Organizations (manage referrals)

Appears after Audit Log in sidebar.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update Mobile Menu in ConversationView

**Files:**
- Modify: `packages/web/src/components/ConversationView.tsx`

**Step 1: Find mobile menu section**

Locate the mobile menu panel (around line 349-460 where the menu items are listed).

**Step 2: Add Resources section after Journal**

After the Journal menu item, add:

```typescript
                  {/* Resources Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="px-4 text-sm font-semibold text-gray-900 mb-2">
                      Resources
                    </h3>
                    <button
                      onClick={() => {
                        router.push('/resources/books');
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Browse Books
                    </button>
                    <button
                      onClick={() => {
                        router.push('/resources/reading-list');
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Reading List
                    </button>
                    <button
                      onClick={() => {
                        router.push('/resources/organizations');
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Browse Organizations
                    </button>
                    <button
                      onClick={() => {
                        router.push('/resources/recommended');
                        setShowMobileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Recommended for Me
                    </button>
                  </div>
```

**Step 3: Test on mobile**

Run: Visit `http://localhost:3699/home` on mobile or narrow browser
Expected: Open hamburger menu, Resources section appears

**Step 4: Commit**

```bash
git add packages/web/src/components/ConversationView.tsx
git commit -m "feat: add Resources section to mobile menu

Adds Resources section with four menu items:
- Browse Books
- My Reading List
- Browse Organizations
- Recommended for Me

Appears after Journal in mobile hamburger menu.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 1 Complete!

**Implemented:**
- ✅ useUserPermissions hook for role-based UI
- ✅ AlignmentScoreBadge component
- ✅ BookCard component
- ✅ BookFilters component
- ✅ Browse Books page with pagination
- ✅ Book API helpers in lib/api.ts
- ✅ Resources menu in UserMenu
- ✅ Resources section in AdminLayout
- ✅ Resources section in OrgAdminLayout
- ✅ Resources section in mobile menu

**Test the Complete Flow:**

1. Visit `http://localhost:3699/home`
2. Open user menu → click "Browse Books"
3. See book list page with filters
4. Test filtering and pagination
5. Test as different roles (org admin, platform admin)

**Next Phase:** Phase 2 will implement Book Detail Page and Reading List functionality.

---

## Notes for Phase 2 Planning

**Upcoming components:**
- BookDetailView (tabs, purchase links, PDF download)
- ReadingListButton (working implementation, not placeholder)
- Reading List page with three tabs

**Upcoming pages:**
- `/resources/books/[id]` - Book Detail
- `/resources/reading-list` - Personal library

**API work needed:**
- Reading list endpoints (GET/POST/PUT /api/reading-list)
- Book detail caching strategy
