'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

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

export function RecommendedBooks() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet('/resources/recommendations?limit=5');

      if (!response.ok) {
        // If it's a 404 or similar, just treat as no recommendations
        if (response.status === 404 || response.status === 204) {
          setRecommendations([]);
          return;
        }
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      // Handle both array and object responses
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      // Don't show error for network issues - just show empty state
      console.error('Failed to fetch recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToReadingList = async (bookId: string) => {
    try {
      const response = await apiPost('/resources/reading-list', {
        bookId,
        status: 'want_to_read',
      });

      if (!response.ok) {
        throw new Error('Failed to add to reading list');
      }

      // Refresh recommendations after adding
      await fetchRecommendations();
      alert('Book added to your reading list!');
    } catch (err) {
      alert(`Failed to add book: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recommended for You</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recommended for You</h3>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Recommended for You</h3>
        <p className="text-gray-500 text-sm">
          Add books to your reading list to get personalized recommendations!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Recommended for You</h3>
        <button
          onClick={fetchRecommendations}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((book) => (
          <div
            key={book.id}
            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Book Cover */}
            <div className="relative h-48 bg-gray-100">
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
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{book.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{book.author}</p>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{book.description}</p>

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
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View More Link */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/resources/books')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Browse All Books →
        </button>
      </div>
    </div>
  );
}
