'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BookFilters } from '@/components/BookFilters';
import { BookCard } from '@/components/BookCard';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { bookApi, BookFilters as BookFiltersType } from '@/lib/api';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

export default function OrgAdminEndorsedBooksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<Partial<BookFiltersType>>({
    search: '',
    genre: 'all',
    visibilityTier: 'all',
    showMatureContent: false,
    sort: 'relevance',
  });

  // Use ref to track the latest request ID to ignore stale responses
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Fetch books without abort controller to avoid console errors
  const fetchBooks = useCallback(async (filtersToUse: Partial<BookFiltersType>, requestId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Get current organization ID for filtering
      const currentOrgId = localStorage.getItem('currentOrganizationId');

      // Use organization-specific endpoint if available
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      let response;
      if (currentOrgId) {
        // Use org-specific endpoint that filters by organization's allowed tiers
        const params = new URLSearchParams();
        if (filtersToUse.search) params.append('search', filtersToUse.search);
        if (filtersToUse.genre && filtersToUse.genre !== 'all') params.append('genre', filtersToUse.genre);
        if (filtersToUse.sort) params.append('sort', filtersToUse.sort);
        if (filtersToUse.showMatureContent) params.append('showMatureContent', 'true');

        response = await fetch(`${apiUrl}/org-admin/books?organizationId=${currentOrgId}&${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        // Fallback to regular bookApi
        response = await bookApi.list(filtersToUse as BookFiltersType);
      }

      // Ignore response if this is not the latest request or component unmounted
      if (requestId !== requestIdRef.current || !mountedRef.current) {
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: response.url
        });
        throw new Error(`Failed to load books: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Double check request ID and mount status before setting state
      if (requestId !== requestIdRef.current || !mountedRef.current) {
        return;
      }

      setBooks(data.books || data || []);
      setTotalCount(data.total || data.length || 0);
      // Calculate total pages from total count
      setTotalPages(Math.ceil((data.total || data.length || 0) / 12));
    } catch (err) {
      // Ignore errors from stale requests or unmounted component
      if (requestId !== requestIdRef.current || !mountedRef.current) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load books. Please try again.';
      setError(errorMessage);
      console.error('Error loading books:', err);
    } finally {
      // Only update loading state if this is still the latest request and component is mounted
      if (requestId === requestIdRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Track component mount status (only changes on unmount)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load books when filters change
  useEffect(() => {
    // Increment request ID for new request
    const currentRequestId = ++requestIdRef.current;
    fetchBooks(filters, currentRequestId);
  }, [fetchBooks, filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleRetry = () => {
    setCurrentPage(1);
    setFilters({
      search: '',
      genre: 'all',
      visibilityTier: 'all',
      showMatureContent: false,
      sort: 'relevance',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs />
      <BackButton />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Our Endorsed Books</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(buildLinkWithTrail('/org-admin/resources/books/pending', pathname, trail))}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Pending Evaluations
          </button>
          <button
            onClick={() => router.push(buildLinkWithTrail('/resources/books/new', pathname, trail))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add New Book
          </button>
        </div>
      </div>

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
      />

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {books.length} of {totalCount} books (filtered by organization settings)
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-red-800">{error}</span>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-white text-red-600 rounded hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Books Grid */}
      {!loading && !error && books.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && books.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {(filters.search || (filters.genre && filters.genre !== 'all'))
              ? 'No books found matching your filters'
              : 'No endorsed books yet'}
          </p>
          {!filters.search && (!filters.genre || filters.genre === 'all') && (
            <button
              onClick={() => router.push(buildLinkWithTrail('/resources/books/new', pathname, trail))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Book
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
