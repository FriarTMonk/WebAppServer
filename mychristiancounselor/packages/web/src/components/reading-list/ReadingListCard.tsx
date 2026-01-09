'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ReadingStatus = 'want_to_read' | 'currently_reading' | 'finished';

interface ReadingListItem {
  id: string;
  bookId: string;
  status: ReadingStatus;
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

interface ReadingListCardProps {
  item: ReadingListItem;
  onUpdate: (itemId: string, updates: any) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export function ReadingListCard({ item, onUpdate, onRemove }: ReadingListCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [progress, setProgress] = useState(item.progress || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleStatusChange = async (newStatus: ReadingStatus) => {
    setIsUpdating(true);
    try {
      const updates: any = { status: newStatus };

      // Set dateStarted when starting to read
      if (newStatus === 'currently_reading' && !item.dateStarted) {
        updates.dateStarted = new Date().toISOString();
      }

      // Set dateFinished when finishing
      if (newStatus === 'finished' && !item.dateFinished) {
        updates.dateFinished = new Date().toISOString();
        updates.progress = 100;
      }

      await onUpdate(item.id, updates);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    setProgress(newProgress);
  };

  const handleProgressBlur = async () => {
    if (progress === item.progress) return;

    setIsUpdating(true);
    try {
      const updates: any = { progress };

      // Auto-complete if progress reaches 100%
      if (progress === 100 && item.status !== 'finished') {
        updates.status = 'finished';
        updates.dateFinished = new Date().toISOString();
      }

      await onUpdate(item.id, updates);
    } catch (error) {
      console.error('Failed to update progress:', error);
      setProgress(item.progress || 0);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (notes === item.notes) {
      setIsEditingNotes(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(item.id, { notes: notes || null });
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to update notes:', error);
      setNotes(item.notes || '');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    try {
      await onRemove(item.id);
    } catch (error) {
      console.error('Failed to remove book:', error);
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Main Content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Cover Image */}
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => router.push(`/resources/books/${item.bookId}`)}
          >
            {item.book.coverImageUrl ? (
              <img
                src={item.book.coverImageUrl}
                alt={item.book.title}
                className="w-20 h-28 object-cover rounded shadow-sm hover:shadow-md transition-shadow"
              />
            ) : (
              <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center shadow-sm">
                <span className="text-gray-400 text-2xl">📚</span>
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer mb-1"
              onClick={() => router.push(`/resources/books/${item.bookId}`)}
            >
              {item.book.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{item.book.author}</p>

            {/* Status Dropdown */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
                disabled={isUpdating}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="want_to_read">Want to Read</option>
                <option value="currently_reading">Currently Reading</option>
                <option value="finished">Finished</option>
              </select>
            </div>

            {/* Progress Bar (only for currently_reading) */}
            {item.status === 'currently_reading' && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Progress</label>
                  <span className="text-xs font-medium text-gray-700">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  onBlur={handleProgressBlur}
                  disabled={isUpdating}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                />
              </div>
            )}

            {/* Finished Date */}
            {item.status === 'finished' && item.dateFinished && (
              <div className="text-xs text-gray-500 mb-2">
                Finished: {formatDate(item.dateFinished)}
              </div>
            )}

            {/* Biblical Alignment Score */}
            {item.book.biblicalAlignmentScore !== null && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Biblical Alignment:</span>
                <span className="text-xs font-medium text-blue-600">
                  {item.book.biblicalAlignmentScore}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t border-gray-200 flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isExpanded ? (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Details
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Details
            </>
          )}
        </button>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {item.notes ? 'Edit' : 'Add Notes'}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your thoughts, quotes, or reflections..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  disabled={isUpdating}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setNotes(item.notes || '');
                      setIsEditingNotes(false);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {item.notes ? (
                  <p className="whitespace-pre-wrap">{item.notes}</p>
                ) : (
                  <p className="italic text-gray-400">No notes yet</p>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-3 border-t border-gray-200 space-y-1">
            <div className="text-xs text-gray-500">
              <span className="font-medium">Genre:</span> {item.book.genreTag}
            </div>
            {item.dateStarted && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Started:</span> {formatDate(item.dateStarted)}
              </div>
            )}
            <div className="text-xs text-gray-500">
              <span className="font-medium">Added:</span> {formatDate(item.addedAt)}
            </div>
          </div>

          {/* Remove Button */}
          <div className="pt-3 border-t border-gray-200">
            {!showRemoveConfirm ? (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isUpdating}
                className="w-full px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove from Reading List
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 text-center">
                  Remove this book from your reading list?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemove}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Removing...' : 'Yes, Remove'}
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(false)}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
