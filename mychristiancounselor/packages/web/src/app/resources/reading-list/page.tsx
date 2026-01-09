'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserPermissions } from '../../../hooks/useUserPermissions';
import { apiGet } from '../../../lib/api';
import { showToast } from '@/components/Toast';

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
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {item.book.coverImageUrl ? (
                    <img
                      src={item.book.coverImageUrl}
                      alt={item.book.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">📚</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.book.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{item.book.author}</p>
                    {item.book.biblicalAlignmentScore !== null && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Alignment: </span>
                        <span className="text-xs font-medium text-blue-600">
                          {item.book.biblicalAlignmentScore}%
                        </span>
                      </div>
                    )}
                    {item.progress !== null && item.progress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{item.progress}% complete</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
