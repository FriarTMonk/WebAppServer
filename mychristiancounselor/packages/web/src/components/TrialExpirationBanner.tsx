'use client';

import React, { useState, useEffect } from 'react';
import { SessionLimitStatus } from '@mychristiancounselor/shared';
import { apiGet } from '../lib/api';
import { useRouter } from 'next/navigation';

/**
 * Banner shown to trial users when they're approaching the end of their trial period
 * Shows at days 17-18 (week 2.5) of the 21-day trial
 * Warns users their limits will decrease from 6 to 3 logins/day
 */
export function TrialExpirationBanner() {
  const router = useRouter();
  const [limitStatus, setLimitStatus] = useState<SessionLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchLimitStatus();
  }, []);

  const fetchLimitStatus = async () => {
    try {
      const response = await apiGet('/profile/session-limit-status');
      const data = await response.json() as SessionLimitStatus;
      setLimitStatus(data);
    } catch (error) {
      console.error('Failed to fetch session limit status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if loading, dismissed, or not in the right time window
  if (isLoading || isDismissed || !limitStatus) {
    return null;
  }

  // Only show for trial users with 3-4 days remaining (days 17-18)
  const shouldShow =
    limitStatus.isInTrialPeriod === true &&
    limitStatus.trialDaysRemaining !== undefined &&
    limitStatus.trialDaysRemaining >= 3 &&
    limitStatus.trialDaysRemaining <= 4;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 mb-4 rounded-r-lg shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Warning Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-6 h-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-bold text-orange-900 text-lg mb-1">
              Your Trial Period Ends Soon
            </h3>
            <p className="text-orange-800 text-sm mb-2">
              You have <span className="font-semibold">{limitStatus.trialDaysRemaining} days</span> remaining in your trial period.
              After your trial ends, your daily logins will decrease from <span className="font-semibold">6 to 3 per day</span>.
            </p>
            <p className="text-orange-700 text-xs">
              Upgrade now to keep unlimited daily logins and access to conversation history.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-start gap-2 ml-4">
          <button
            onClick={() => router.push('/settings/subscription')}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap shadow-sm"
          >
            Upgrade Now
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="px-2 py-2 text-orange-600 hover:text-orange-800 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
