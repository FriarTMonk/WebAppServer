'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookCard } from '../../../components/BookCard';
import { BookFilters } from '../../../components/BookFilters';
import { useUserPermissions } from '../../../hooks/useUserPermissions';
import { bookApi, BookFilters as BookFiltersType } from '../../../lib/api';

// Book interface for type safety
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

// Constants
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

export default function BrowseBooksPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<BookFiltersType>(DEFAULT_FILTERS);

  const loadBooks = useCallback(async () => {
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
  }, [filters]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleFilterChange = (newFilters: Partial<BookFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, skip: 0 }));
  };

  const handleNextPage = () => {
    setFilters(prev => ({ ...prev, skip: (prev.skip || 0) + (prev.take || DEFAULT_PAGE_SIZE) }));
  };

  const handlePreviousPage = () => {
    setFilters(prev => ({ ...prev, skip: Math.max(0, (prev.skip || 0) - (prev.take || DEFAULT_PAGE_SIZE)) }));
  };

  const currentPage = Math.floor((filters.skip || 0) / (filters.take || DEFAULT_PAGE_SIZE)) + 1;
  const totalPages = Math.ceil(totalCount / (filters.take || DEFAULT_PAGE_SIZE));

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
          filters={{
            search: filters.search ?? '',
            genre: filters.genre ?? 'all',
            visibilityTier: filters.visibilityTier ?? 'all',
            showMatureContent: filters.showMatureContent ?? false,
            sort: filters.sort ?? 'relevance',
          }}
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
              onClick={() => handleFilterChange(DEFAULT_FILTERS)}
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
              aria-label="Go to previous page"
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
              aria-label="Go to next page"
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
