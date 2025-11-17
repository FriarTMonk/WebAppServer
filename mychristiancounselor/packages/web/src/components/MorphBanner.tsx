'use client';

import React, { useState } from 'react';

interface MorphBannerProps {
  morphedUserEmail: string;
  morphedUserName?: string;
  onEndMorph: () => Promise<void>;
}

export function MorphBanner({
  morphedUserEmail,
  morphedUserName,
  onEndMorph,
}: MorphBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndMorph = async () => {
    if (!confirm('Are you sure you want to end the morph session and return to your admin account?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onEndMorph();
      // The onEndMorph handler should handle token update and redirect
    } catch (err: any) {
      setError(err.message || 'Failed to end morph session');
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-500 border-b-4 border-yellow-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Warning Info */}
          <div className="flex items-center gap-3">
            {/* Warning Icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-yellow-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Morph Info */}
            <div>
              <p className="font-bold text-yellow-900">
                MORPHED SESSION ACTIVE
              </p>
              <p className="text-sm text-yellow-800">
                You are currently morphed as:{' '}
                <span className="font-semibold">
                  {morphedUserName ? `${morphedUserName} (${morphedUserEmail})` : morphedUserEmail}
                </span>
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                All actions are being logged and tracked
              </p>
            </div>
          </div>

          {/* End Morph Button */}
          <button
            onClick={handleEndMorph}
            disabled={loading}
            className="px-6 py-2 bg-yellow-900 text-white font-semibold rounded-md hover:bg-yellow-800 disabled:bg-yellow-700 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {loading ? 'Ending Morph...' : 'End Morph Session'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
