'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { BookCard } from '@/components/BookCard';
import { BookFilters } from '@/components/BookFilters';
import { bookApi, BookFilters as BookFiltersType } from '@/lib/api';

// Book interface for type safety
interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl?: string;
  biblicalAlignmentScore?: number;
  genreTag?: string;
  endorsementCount?: number;
  matureContent?: boolean;
}

// API response interface
interface BooksApiResponse {
  books: Book[];
  total: number;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_FILTERS: BookFiltersType = {
  search: '',
  genre: 'all',
  visibilityTier: 'all',
  showMatureContent: false,
  skip: 0,
  take: DEFAULT_PAGE_SIZE,
  sort: 'relevance',
};

export default function PlatformAdminAllBooksPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<BookFiltersType>(DEFAULT_FILTERS);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Check permissions and redirect if not platform admin
  useEffect(() => {
    // Wait a moment for permissions to load
    const timer = setTimeout(() => {
      setPermissionsChecked(true);
      if (!permissions.isPlatformAdmin) {
        router.push('/resources/books');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [permissions.isPlatformAdmin, router]);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadBooks = async () => {
      setLoading(true);
      setError(null);

      try {
        // Pass signal to the API call for proper cancellation
        const response = await bookApi.list(filters, { signal: abortController.signal });

        if (!isMounted) return; // Component unmounted, skip state updates

        if (!response.ok) {
          throw new Error('Failed to load books');
        }

        const data = await response.json();

        // Runtime validation
        if (!data || !Array.isArray(data.books)) {
          throw new Error('Invalid API response structure');
        }

        setBooks(data.books);
        setTotalCount(data.total || 0);
      } catch (err) {
        if (!isMounted) return;

        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            return; // Request was cancelled, ignore
          }
          setError(err.message);
        } else {
          setError('Failed to load books. Please try again.');
        }
        console.error('Error loading books:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBooks();

    // THIS is the cleanup function that React will call
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<BookFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, skip: 0 }));
  };

  const handleRetry = () => {
    setError(null);
    // Trigger re-render which will cause useEffect to run again
    setFilters(prev => ({ ...prev }));
  };

  const handleNextPage = () => {
    setFilters(prev => ({ ...prev, skip: (prev.skip || 0) + (prev.take || DEFAULT_PAGE_SIZE) }));
  };

  const handlePreviousPage = () => {
    setFilters(prev => ({ ...prev, skip: Math.max(0, (prev.skip || 0) - (prev.take || DEFAULT_PAGE_SIZE)) }));
  };

  const currentPage = Math.floor((filters.skip || 0) / (filters.take || DEFAULT_PAGE_SIZE)) + 1;
  const totalPages = Math.ceil(totalCount / (filters.take || DEFAULT_PAGE_SIZE));

  // Show loading skeleton while checking permissions
  if (!permissionsChecked) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-96" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-gray-200 rounded" />
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Books</h1>
              <p className="text-sm text-gray-600 mt-1">
                Platform-wide book catalog including all alignment tiers
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/resources/evaluation')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Evaluation Management
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            ⚠️ As Platform Admin, you can see ALL books including those with &lt;70% alignment scores
            that are hidden from regular users.
          </p>
        </div>

        <BookFilters
          filters={{
            search: filters.search ?? '',
            genre: filters.genre ?? 'all',
            visibilityTier: filters.visibilityTier ?? 'all',
            showMatureContent: filters.showMatureContent ?? false,
            sort: filters.sort ?? 'relevance',
          }}
          onFilterChange={handleFilterChange}
          showAlignmentFilter={true}
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
              onClick={handleRetry}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-36 bg-gray-200 rounded" />
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
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
            <p className="text-gray-600">No books found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className={`px-4 py-2 rounded-md ${currentPage >= totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
