'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserPermissions } from '../../../hooks/useUserPermissions';
import { apiGet, apiPut, apiDelete } from '../../../lib/api';
import { showToast } from '@/components/Toast';
import { ReadingListCard } from '@/components/reading-list/ReadingListCard';
import { RecommendedBooks } from '@/components/reading-list/RecommendedBooks';

type ReadingListTab = 'want_to_read' | 'currently_reading' | 'finished';

interface ReadingListItem {
  id: string;
  bookId: string;
  status: ReadingListTab;
  progress: number | null;
  notes: string | null;
  rating: number | null;
  dateStarted: string | null;
  dateFinished: string | null;
  addedAt: string;
  updatedAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
    biblicalAlignmentScore: number | null;
    genreTag: string;
    matureContent: boolean;
  };
}

export default function ReadingListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const [activeTab, setActiveTab] = useState<ReadingListTab>('want_to_read');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [readingListItems, setReadingListItems] = useState<ReadingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Check access: platform admin OR active subscription OR organization membership
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setAccessChecked(true);
        return;
      }

      try {
        // Platform admins have access to everything
        const isPlatformAdmin = permissions?.isPlatformAdmin || false;
        if (isPlatformAdmin) {
          setHasAccess(true);
          setAccessChecked(true);
          return;
        }

        const hasActiveSubscription = user.subscriptionStatus === 'active';

        // Check if user has organization membership
        const orgResponse = await apiGet('/profile/organizations');
        if (orgResponse.ok) {
          const orgs = await orgResponse.json();
          const hasOrgs = Array.isArray(orgs) && orgs.length > 0;
          setHasAccess(hasActiveSubscription || hasOrgs);
        } else {
          setHasAccess(hasActiveSubscription);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(user.subscriptionStatus === 'active');
      } finally {
        setAccessChecked(true);
      }
    };

    checkAccess();
  }, [user, permissions]);

  // Redirect if no access
  useEffect(() => {
    if (accessChecked && hasAccess === false) {
      router.push('/home');
    }
  }, [accessChecked, hasAccess, router]);

  // Fetch reading list from API
  useEffect(() => {
    const fetchReadingList = async () => {
      if (!user || !hasAccess) return;

      try {
        const response = await apiGet('/resources/reading-list');

        if (!response.ok) {
          throw new Error('Failed to fetch reading list');
        }

        const data = await response.json();
        setReadingListItems(data.items || []);
      } catch (error) {
        console.error('Error fetching reading list:', error);
        showToast('Failed to load reading list', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (accessChecked && hasAccess) {
      fetchReadingList();
    }
  }, [user, hasAccess, accessChecked]);

  // Calculate tab counts from actual data
  const tabCounts = {
    want_to_read: readingListItems.filter(item => item.status === 'want_to_read').length,
    currently_reading: readingListItems.filter(item => item.status === 'currently_reading').length,
    finished: readingListItems.filter(item => item.status === 'finished').length,
  };

  // Filter items by active tab
  const filteredItems = readingListItems.filter(item => item.status === activeTab);

  const handleUpdateItem = async (itemId: string, updates: any) => {
    try {
      const response = await apiPut(`/resources/reading-list/${itemId}`, updates);

      if (!response.ok) {
        throw new Error('Update failed');
      }

      // Refresh list - optimistic update
      setReadingListItems(items =>
        items.map(item => item.id === itemId ? { ...item, ...updates } : item)
      );

      showToast('Reading list updated', 'success');
    } catch (error) {
      console.error('Failed to update reading list item:', error);
      showToast('Failed to update reading list', 'error');
      throw error;
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await apiDelete(`/resources/reading-list/${itemId}`);

      if (!response.ok) {
        throw new Error('Remove failed');
      }

      setReadingListItems(items => items.filter(item => item.id !== itemId));
      showToast('Book removed from reading list', 'success');
    } catch (error) {
      console.error('Failed to remove reading list item:', error);
      showToast('Failed to remove book', 'error');
      throw error;
    }
  };

  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'want_to_read':
        return 'No books saved yet. Browse books to add to your reading list.';
      case 'currently_reading':
        return "Start reading a book from your 'Want to Read' list.";
      case 'finished':
        return 'Completed books will appear here with your reading history.';
      default:
        return 'No books in this category.';
    }
  };

  const getEmptyStateIcon = () => {
    switch (activeTab) {
      case 'want_to_read':
        return '📚';
      case 'currently_reading':
        return '📖';
      case 'finished':
        return '✓';
      default:
        return '📚';
    }
  };

  // Show loading state while checking access
  if (!accessChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Will redirect if no access, but show nothing while redirecting
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/home')}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to App
          </button>
          <h1 className="text-3xl font-bold text-gray-900">My Reading List</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track books you want to read, are currently reading, and have finished
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">📚 Your reading list is visible to the AI</span> during counseling sessions for personalized guidance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              {readingListItems.length}
            </div>
            <div className="text-sm text-blue-700">Total Books</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">
              {readingListItems.filter(item =>
                item.status === 'finished' &&
                item.dateFinished &&
                new Date(item.dateFinished).getFullYear() === new Date().getFullYear()
              ).length}
            </div>
            <div className="text-sm text-green-700">Finished This Year</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-900">
              {readingListItems.filter(item => item.status === 'currently_reading').length}
            </div>
            <div className="text-sm text-purple-700">Currently Reading</div>
          </div>
        </div>

        {/* Recommended Books */}
        <div className="mb-6">
          <RecommendedBooks />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('want_to_read')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'want_to_read'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Want to Read ({tabCounts.want_to_read})
          </button>
          <button
            onClick={() => setActiveTab('currently_reading')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'currently_reading'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Currently Reading ({tabCounts.currently_reading})
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'finished'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Finished ({tabCounts.finished})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
            <div className="animate-pulse bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
            <div className="animate-pulse bg-white border border-gray-200 rounded-lg p-6">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">{getEmptyStateIcon()}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'want_to_read' && 'Start Your Reading List'}
              {activeTab === 'currently_reading' && 'No Books in Progress'}
              {activeTab === 'finished' && 'No Finished Books Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {getEmptyStateMessage()}
            </p>
            <button
              onClick={() => router.push('/resources/books')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <ReadingListCard
                key={item.id}
                item={item}
                onUpdate={handleUpdateItem}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
