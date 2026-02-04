'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParableContext } from '@/contexts/ParableContext';
import { saveParable, unsaveParable, isParableSaved } from '@/lib/parables-api';
import { showToast } from '@/components/Toast';

export function ParableCTA() {
  const parableContext = useParableContext();
  const { user, isAuthenticated } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // If context is not available yet, show loading state
  if (!parableContext) {
    return null;
  }

  const { parableId, parableSlug } = parableContext;

  // Check if user can save parables (subscribed or organization member)
  // Use useMemo to recalculate when user changes (including when organizationMemberships loads)
  const canSaveParables = useMemo(() => {
    return user?.subscriptionStatus === 'active' ||
      (user?.organizationMemberships && user.organizationMemberships.length > 0);
  }, [user]);

  // Check if parable is already saved
  useEffect(() => {
    if (isAuthenticated && canSaveParables) {
      isParableSaved(parableSlug)
        .then(saved => {
          setIsSaved(saved);
          setIsCheckingStatus(false);
        })
        .catch(() => {
          setIsCheckingStatus(false);
        });
    } else {
      setIsCheckingStatus(false);
    }
  }, [isAuthenticated, canSaveParables, parableSlug]);

  const handleSaveToggle = async () => {
    if (!canSaveParables || isLoading) return;

    setIsLoading(true);
    try {
      if (isSaved) {
        await unsaveParable(parableId);
        setIsSaved(false);
        showToast('Parable removed from your reading list', 'success');
      } else {
        await saveParable(parableId);
        setIsSaved(true);
        showToast('Parable saved to your reading list!', 'success');
      }
    } catch (error) {
      console.error('Error saving/unsaving parable:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to save parable',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="my-8 p-6 bg-blue-100 rounded-lg text-center">
        <p className="text-gray-700 mb-4">
          Sign in to save this parable to your reading list
        </p>
        <a
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
        <button
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            canSaveParables
              ? isSaved
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!canSaveParables || isLoading || isCheckingStatus}
          onClick={handleSaveToggle}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {isSaved ? 'Removing...' : 'Saving...'}
            </>
          ) : canSaveParables ? (
            <>
              {isSaved ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Saved to My Parables
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  Save to My Parables
                </>
              )}
            </>
          ) : (
            'Upgrade to Save'
          )}
        </button>

        <button
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          onClick={() => {
            // TODO: Implement share functionality
            if (navigator.share) {
              navigator.share({
                title: document.title,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }
          }}
        >
          Share Parable
        </button>
      </div>

      {!canSaveParables && (
        <p className="text-sm text-gray-600 text-center mt-4">
          Premium subscribers and organization members can save parables for later reflection.{' '}
          <a href="/pricing" className="text-blue-600 hover:underline">
            Upgrade now
          </a>
        </p>
      )}
    </div>
  );
}
