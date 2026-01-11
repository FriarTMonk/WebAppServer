'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bookApi } from '@/lib/api';
import { AlignmentScoreBadge } from '@/components/AlignmentScoreBadge';
import { BookDetailTabs } from '@/components/books/BookDetailTabs';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface DoctrineCategoryScore {
  category: string;
  score: number;
  notes?: string;
}

interface PurchaseLink {
  retailer: string;
  url: string;
  isPrimary: boolean;
  price?: string;
}

interface BookEndorsement {
  organizationId: string;
  organizationName: string;
}

interface BookDetail {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
  evaluationStatus: string;
  biblicalAlignmentScore?: number;
  visibilityTier: string;
  matureContent: boolean;
  evaluatedAt?: Date;
  theologicalSummary?: string;
  scriptureComparisonNotes?: string;
  denominationalTags: string[];
  theologicalStrengths: string[];
  theologicalConcerns: string[];
  doctrineCategoryScores: DoctrineCategoryScore[];
  scoringReasoning?: string;
  purchaseUrl?: string;
  purchaseLinks: PurchaseLink[];
  endorsements: BookEndorsement[];
  endorsementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Validate URL to prevent XSS attacks
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params?.id as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      if (!bookId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await bookApi.getById(bookId);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Book not found');
          } else if (response.status === 403) {
            setError('You do not have permission to view this book');
          } else {
            setError('Failed to load book details');
          }
          return;
        }

        const data = await response.json();
        setBook(data);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [bookId]);

  const handleShare = () => {
    if (navigator.share && book) {
      navigator
        .share({
          title: book.title,
          text: `Check out "${book.title}" by ${book.author}`,
          url: window.location.href,
        })
        .catch((err) => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Validate image URL for security
  const validImageUrl =
    book?.coverImageUrl && isValidImageUrl(book.coverImageUrl) && !imageError
      ? book.coverImageUrl
      : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Book not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error === 'You do not have permission to view this book'
              ? 'This book may require a higher subscription tier to access.'
              : 'The book you are looking for does not exist or has been removed.'}
          </p>
          <button
            onClick={() => router.push('/resources/books')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Back to Book Resources
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs />
        <BackButton />

        {/* Book Header Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              {validImageUrl ? (
                <img
                  src={validImageUrl}
                  alt={`${book.title} cover`}
                  className="w-48 h-72 object-cover rounded shadow-md"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-48 h-72 bg-gray-200 rounded shadow-md flex items-center justify-center">
                  <span className="text-gray-400 text-center px-4">
                    No Cover Available
                  </span>
                </div>
              )}
            </div>

            {/* Book Metadata */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {book.title}
              </h1>
              <p className="text-xl text-gray-700 mb-4">{book.author}</p>

              {/* Alignment Score Badge */}
              {book.biblicalAlignmentScore !== undefined && (
                <div className="mb-4">
                  <AlignmentScoreBadge
                    score={book.biblicalAlignmentScore}
                    size="large"
                  />
                </div>
              )}

              {/* Publication Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
                {book.publisher && (
                  <p>
                    <strong>Publisher:</strong> {book.publisher}
                  </p>
                )}
                {book.publicationYear && (
                  <p>
                    <strong>Publication Year:</strong> {book.publicationYear}
                  </p>
                )}
                {book.isbn && (
                  <p>
                    <strong>ISBN:</strong> {book.isbn}
                  </p>
                )}
                {book.evaluatedAt &&
                  !isNaN(new Date(book.evaluatedAt).getTime()) && (
                    <p>
                      <strong>Evaluated:</strong>{' '}
                      {new Date(book.evaluatedAt).toLocaleDateString()}
                    </p>
                  )}
              </div>

              {/* Denominational Tags */}
              {book.denominationalTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {book.denominationalTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Mature Content Warning */}
              {book.matureContent && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠ This book contains mature content
                  </p>
                </div>
              )}

              {/* Description */}
              {book.description && (
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    Description
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 items-center">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  onClick={() => alert('Reading list feature coming in Phase 3')}
                >
                  Add to Reading List
                </button>
                <button
                  onClick={handleShare}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                >
                  Share
                </button>

                {/* Purchase Button - Right Aligned */}
                {(book.purchaseUrl || book.purchaseLinks.length > 0) && (
                  <div className="ml-auto">
                    {(() => {
                      // Use purchaseLinks if available, otherwise fallback to purchaseUrl
                      if (book.purchaseLinks.length > 0) {
                        const primaryLink = book.purchaseLinks.find((link) => link.isPrimary) || book.purchaseLinks[0];
                        return (
                          <a
                            href={primaryLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors font-medium"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                              />
                            </svg>
                            Purchase at {primaryLink.retailer}
                            {primaryLink.price && (
                              <span className="ml-2 text-green-100">({primaryLink.price})</span>
                            )}
                          </a>
                        );
                      } else if (book.purchaseUrl) {
                        return (
                          <a
                            href={book.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors font-medium"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                              />
                            </svg>
                            Purchase Book
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <BookDetailTabs book={book} />
      </div>
    </div>
  );
}
