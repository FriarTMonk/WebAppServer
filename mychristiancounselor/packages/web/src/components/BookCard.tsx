'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlignmentScoreBadge } from './AlignmentScoreBadge';

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
}

export function BookCard({ book, showActions = true, compact = false }: BookCardProps) {
  const router = useRouter();
  const [showReadingListMenu, setShowReadingListMenu] = useState(false);

  const handleViewDetails = () => {
    router.push(`/resources/books/${book.id}`);
  };

  const handleSaveToList = (status: string) => {
    // TODO: Implement reading list functionality in Phase 2
    console.log('Save to list:', book.id, status);
    setShowReadingListMenu(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={`${book.title} cover`}
              className={`${compact ? 'w-16 h-24' : 'w-24 h-36'} object-cover rounded`}
            />
          ) : (
            <div className={`${compact ? 'w-16 h-24' : 'w-24 h-36'} bg-gray-200 rounded flex items-center justify-center`}>
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
            <div className="flex gap-2 mt-3">
              {/* Reading List Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowReadingListMenu(!showReadingListMenu)}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Save to List ▼
                </button>

                {showReadingListMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowReadingListMenu(false)}
                    />
                    <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                      <button
                        onClick={() => handleSaveToList('want_to_read')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Want to Read
                      </button>
                      <button
                        onClick={() => handleSaveToList('currently_reading')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Currently Reading
                      </button>
                      <button
                        onClick={() => handleSaveToList('finished')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Finished
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleViewDetails}
                className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
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
