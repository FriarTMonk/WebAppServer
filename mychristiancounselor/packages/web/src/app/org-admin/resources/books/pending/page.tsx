'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUserPermissions } from '../../../../../hooks/useUserPermissions';
import { BackButton } from '@/components/BackButton';
import { api } from '../../../../../lib/api';

interface PendingBook {
  id: string;
  title: string;
  author: string;
  evaluationStatus: string;
  createdAt: string;
  submittedByOrganization: {
    name: string;
  };
}

export default function PendingEvaluationsPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [books, setBooks] = useState<PendingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Wait for permissions to load: render immediately when authorized, wait before redirecting
  useEffect(() => {
    if (permissions.isOrgAdmin || permissions.isPlatformAdmin) {
      // User is confirmed as authorized, render immediately
      setPermissionsLoading(false);
      return;
    }

    // Wait for permissions to load before deciding to redirect
    const timer = setTimeout(() => {
      setPermissionsLoading(false);
    }, 1500); // Allow time for permissions API calls to complete

    return () => clearTimeout(timer);
  }, [permissions.isOrgAdmin, permissions.isPlatformAdmin]);

  // Redirect only after permissions have loaded AND user is not authorized
  useEffect(() => {
    if (!permissionsLoading && !permissions.isOrgAdmin && !permissions.isPlatformAdmin) {
      router.push('/resources/books');
    }
  }, [permissionsLoading, permissions.isOrgAdmin, permissions.isPlatformAdmin, router]);

  // Fetch pending books (only after permissions have loaded)
  useEffect(() => {
    async function fetchPendingBooks() {
      try {
        setLoading(true);
        const { data } = await api.get('/books?evaluationStatus=pending');
        setBooks(data.books || []);
      } catch (err) {
        console.error('Error fetching pending books:', err);
        setError('Failed to load pending evaluations');
      } finally {
        setLoading(false);
      }
    }

    if (!permissionsLoading && (permissions.isOrgAdmin || permissions.isPlatformAdmin)) {
      fetchPendingBooks();
    }
  }, [permissionsLoading, permissions.isOrgAdmin, permissions.isPlatformAdmin]);

  const handleTriggerEvaluation = async (bookId: string) => {
    if (!permissions.isPlatformAdmin) {
      alert('Only platform admins can manually trigger evaluations');
      return;
    }

    setTriggeringId(bookId);
    try {
      const { data: result } = await api.post(`/admin/books/${bookId}/trigger-evaluation`);

      if (result.success) {
        alert(result.message);
        // Refresh the list after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(result.message || 'Failed to trigger evaluation');
      }
    } catch (err) {
      console.error('Error triggering evaluation:', err);
      alert('Failed to trigger evaluation');
    } finally {
      setTriggeringId(null);
    }
  };

  // Show loading state while permissions load
  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (!permissions.isOrgAdmin && !permissions.isPlatformAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900">Pending Evaluations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track books submitted by your organization awaiting evaluation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-3">Book Title</div>
              <div className="col-span-2">Author</div>
              <div className="col-span-2">Organization</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <div className="animate-pulse text-gray-600">Loading pending evaluations...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-12 text-center">
              <div className="text-red-600">{error}</div>
            </div>
          )}

          {/* Books List */}
          {!loading && !error && books.length > 0 && (
            <div>
              {books.map((book) => (
                <div
                  key={book.id}
                  className="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <button
                        onClick={() => router.push(`/resources/books/${book.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-left"
                      >
                        {book.title}
                      </button>
                    </div>
                    <div className="col-span-2 text-sm text-gray-700">{book.author}</div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {book.submittedByOrganization.name}
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {book.evaluationStatus}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {new Date(book.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-1">
                      {permissions.isPlatformAdmin && (
                        <button
                          onClick={() => handleTriggerEvaluation(book.id)}
                          disabled={triggeringId === book.id}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          title="Platform Admin: Trigger Evaluation"
                        >
                          {triggeringId === book.id ? 'Triggering...' : 'Trigger'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && books.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Evaluations</h3>
              <p className="text-gray-600 mb-6">
                All books have been evaluated. Great job!
              </p>
              <button
                onClick={() => router.push('/resources/books/new')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Add New Book
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
