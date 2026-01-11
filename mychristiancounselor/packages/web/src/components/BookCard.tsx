'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AlignmentScoreBadge } from './AlignmentScoreBadge';
import { AddToReadingListButton } from './reading-list/AddToReadingListButton';
import { buildLinkWithReferrer } from '@/lib/navigation-utils';

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

interface BookCardProps {
  book: Book;
  showActions?: boolean;
  compact?: boolean;
  onClick?: () => void;
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

export function BookCard({ book, showActions = true, compact = false, onClick }: BookCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);

  const handleViewDetails = () => {
    if (onClick) {
      onClick();
    } else {
      const bookLink = buildLinkWithReferrer(`/resources/books/${book.id}`, pathname);
      router.push(bookLink);
    }
  };

  // Validate image URL for security
  const validImageUrl = book.coverImageUrl && isValidImageUrl(book.coverImageUrl) && !imageError
    ? book.coverImageUrl
    : null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleViewDetails}
    >
      <div className="flex gap-4">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          {validImageUrl ? (
            <img
              src={validImageUrl}
              alt={`${book.title} cover`}
              className={clsx(
                'object-cover rounded',
                compact ? 'w-16 h-24' : 'w-24 h-36'
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={clsx(
              'bg-gray-200 rounded flex items-center justify-center',
              compact ? 'w-16 h-24' : 'w-24 h-36'
            )}>
              <span className="text-gray-400 text-xs text-center px-2">No Cover</span>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {book.author}
          </p>

          {/* Alignment Score Badge */}
          {book.biblicalAlignmentScore !== undefined && (
            <div className="mb-2">
              <AlignmentScoreBadge score={book.biblicalAlignmentScore} size="small" />
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {book.genreTag && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {book.genreTag}
              </span>
            )}
            {book.matureContent && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Mature Content
              </span>
            )}
          </div>

          {/* Endorsement Count */}
          {book.endorsementCount !== undefined && book.endorsementCount > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Recommended by {book.endorsementCount} organization{book.endorsementCount !== 1 ? 's' : ''}
            </p>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <AddToReadingListButton
                bookId={book.id}
                bookTitle={book.title}
                size="sm"
              />
              <button
                onClick={handleViewDetails}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
              >
                View Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
