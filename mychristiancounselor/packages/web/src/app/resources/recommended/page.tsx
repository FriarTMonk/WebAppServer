'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiGet, apiPost } from '../../../lib/api';
import { showToast } from '@/components/Toast';
import { BackButton } from '@/components/BackButton';

interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverImageUrl: string | null;
  visibilityTier: string;
  alignmentScore: number;
}

export default function RecommendedForMePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
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
        // Check if user is platform admin
        const adminCheck = await apiGet('/admin/health-check');
        if (adminCheck.ok) {
          const adminData = await adminCheck.json();
          if (adminData.isPlatformAdmin) {
            setHasAccess(true);
            setAccessChecked(true);
            return;
          }
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
  }, [user]);

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!hasAccess) return;

      try {
        setLoading(true);
        const response = await apiGet('/resources/recommendations?limit=12');

        if (!response.ok) {
          if (response.status === 404 || response.status === 204) {
            setRecommendations([]);
            return;
          }
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    if (accessChecked && hasAccess) {
      fetchRecommendations();
    }
  }, [accessChecked, hasAccess]);

  // Redirect if no access
  useEffect(() => {
    if (accessChecked && hasAccess === false) {
      router.push('/home');
    }
  }, [accessChecked, hasAccess, router]);

  const handleAddToReadingList = async (bookId: string) => {
    try {
      const response = await apiPost('/resources/reading-list', {
        bookId,
        status: 'want_to_read',
      });

      if (!response.ok) {
        throw new Error('Failed to add to reading list');
      }

      showToast('Book added to your reading list!', 'success');
    } catch (err) {
      showToast('Failed to add book', 'error');
    }
  };

  // Show loading state while checking access
  if (!accessChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recommendations...</p>
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
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900">📖 Recommended for You</h1>
          <p className="text-sm text-gray-600 mt-1">
            Personalized book suggestions based on your reading history
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">How Recommendations Work</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Analyzes books you've rated highly in your reading list</li>
            <li>• Finds similar books by genre and authors you enjoy</li>
            <li>• Uses AI to rank books based on your preferences</li>
            <li>• Respects your organization's book access settings</li>
          </ul>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Building Your Recommendations</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Add books to your reading list and rate them to get personalized recommendations
              tailored to your specific interests and spiritual journey.
            </p>
            <button
              onClick={() => router.push('/resources/books')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((book) => (
              <div
                key={book.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Book Cover */}
                <div className="relative h-64 bg-gray-100">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                      <div className="text-white text-center p-4">
                        <div className="text-xl font-bold mb-1">{book.title}</div>
                        <div className="text-sm opacity-90">{book.author}</div>
                      </div>
                    </div>
                  )}
                  {/* Alignment Badge */}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                      {Math.round(book.alignmentScore)}% match
                    </span>
                  </div>
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{book.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-3">{book.description}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToReadingList(book.id)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add to List
                    </button>
                    <button
                      onClick={() => router.push(`/resources/books/${book.id}`)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Details
                    </button>
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
