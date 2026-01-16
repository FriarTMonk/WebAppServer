'use client';

import React, { useState } from 'react';

interface SecurityBannerProps {
  type: 'deployment' | '3-day' | '9-day';
  onDismiss: () => Promise<void>;
  onEnable: () => void;
}

export function SecurityBanner({ type, onDismiss, onEnable }: SecurityBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = {
    deployment: {
      title: 'NEW SECURITY FEATURE AVAILABLE',
      body: 'Two-factor authentication is now available to help protect your account.',
      detail: 'Set up 2FA in just 2 minutes for enhanced account security.',
    },
    '3-day': {
      title: 'REMINDER: ENABLE TWO-FACTOR AUTHENTICATION',
      body: 'Add an extra layer of security to your account.',
      detail: 'Protect your counseling data with 2FA - it only takes 2 minutes.',
    },
    '9-day': {
      title: 'PROTECT YOUR ACCOUNT',
      body: 'Two-factor authentication helps keep your counseling data secure.',
      detail: 'Enable 2FA now to ensure your sessions and personal information stay private.',
    },
  };

  const content = messages[type];

  const handleDismiss = async () => {
    setLoading(true);
    setError(null);

    try {
      await onDismiss();
    } catch (err: any) {
      setError(err.message || 'Failed to dismiss banner');
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-500 border-b-4 border-blue-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Security Info */}
          <div className="flex items-center gap-3 flex-1">
            {/* Shield Icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Security Details */}
            <div className="flex-1">
              <p className="font-bold text-blue-900">
                {content.title}
              </p>
              <p className="text-sm text-blue-800">
                {content.body}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {content.detail}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEnable}
              disabled={loading}
              className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-md border-2 border-blue-600"
            >
              Enable 2FA
            </button>
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="px-4 py-2 text-white hover:text-blue-100 disabled:text-blue-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Dismiss security banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
