'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/lib/hooks/useUserPermissions';
import { BookFilters } from '@/components/resources/books/BookFilters';
import { BookCard } from '@/components/resources/books/BookCard';
import { Book, BookFilters as BookFiltersType } from '@/types/resources';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrgAdminEndorsedBooksPage() {
  const router = useRouter();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<BookFiltersType>({});

  // Check permissions
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('manage_organization_content')) {
      router.push('/dashboard');
    }
  }, [hasPermission, permissionsLoading, router]);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12',
        });

        // Add filters
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.author) params.append('author', filters.author);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        // TODO: Add endorsedByOrganization filter when backend supports it
        // For now, this will show all books - org filtering will be added later

        const response = await fetch(`/api/resources/books?${params}`);
        if (!response.ok) throw new Error('Failed to fetch books');

        const data = await response.json();
        setBooks(data.books || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    if (!permissionsLoading && hasPermission('manage_organization_content')) {
      fetchBooks();
    }
  }, [currentPage, filters, hasPermission, permissionsLoading]);

  const handleFilterChange = (newFilters: BookFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleRetry = () => {
    setCurrentPage(1);
    setFilters({});
  };

  if (permissionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasPermission('manage_organization_content')) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Our Endorsed Books</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/org-admin/resources/books/evaluations')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Pending Evaluations
          </button>
          <button
            onClick={() => router.push('/org-admin/resources/books/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add New Book
          </button>
        </div>
      </div>

      {/* Filters */}
      <BookFilters onFilterChange={handleFilterChange} />

      {/* Results Count */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {books.length} of {totalCount} books
        </p>
        <p className="text-xs text-gray-500 italic">
          Note: Organization-specific filtering coming soon
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-white text-red-600 rounded hover:bg-gray-50"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
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
              onClick={() => router.push(`/org-admin/resources/books/${book.id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && books.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {Object.keys(filters).length > 0
              ? 'No books found matching your filters'
              : 'No endorsed books yet'}
          </p>
          {Object.keys(filters).length === 0 && (
            <button
              onClick={() => router.push('/org-admin/resources/books/new')}
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
