'use client';

import { useState } from 'react';
import { showToast } from '../Toast';
import { apiPost } from '@/lib/api';

interface AddToReadingListButtonProps {
  bookId: string;
  bookTitle: string;
  size?: 'sm' | 'md' | 'lg';
  onAdded?: () => void;
}

export function AddToReadingListButton({
  bookId,
  bookTitle,
  size = 'md',
  onAdded
}: AddToReadingListButtonProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const response = await apiPost('/resources/reading-list', {
        bookId,
        status: 'want_to_read',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add to reading list');
      }

      setAdded(true);
      showToast(`"${bookTitle}" added to reading list`, 'success');
      if (onAdded) onAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to reading list';
      showToast(message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (added) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} bg-green-600 text-white rounded cursor-not-allowed flex items-center space-x-1`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Added</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className={`${sizeClasses[size]} bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span>{adding ? 'Adding...' : 'Add to List'}</span>
    </button>
  );
}
