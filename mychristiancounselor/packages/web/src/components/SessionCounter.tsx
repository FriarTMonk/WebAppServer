'use client';

import React, { useState, useEffect } from 'react';
import { SessionLimitStatus } from '@mychristiancounselor/shared';
import { apiGet } from '../lib/api';

interface SessionCounterProps {
  onLimitReached?: () => void; // Callback when limit is reached
}

/**
 * Displays session usage for free users
 * Shows "X of 3 sessions used today" in top-right corner
 * Positioned where Note Panel shows for subscribed users
 */
export function SessionCounter({ onLimitReached }: SessionCounterProps) {
  const [limitStatus, setLimitStatus] = useState<SessionLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLimitStatus();
  }, []);

  const fetchLimitStatus = async () => {
    try {
      const response = await apiGet('/profile/session-limit-status');
      const data = await response.json() as SessionLimitStatus;
      setLimitStatus(data);

      // Call callback if limit is reached
      if (data.isLimited && onLimitReached) {
        onLimitReached();
      }
    } catch (error) {
      console.error('Failed to fetch session limit status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show for unlimited users
  if (!limitStatus || limitStatus.limit === -1) {
    return null;
  }

  // Don't show if loading
  if (isLoading) {
    return null;
  }

  // Determine tier label and additional info
  const tierLabel = limitStatus.isInTrialPeriod ? 'Trial Period' : 'Free Tier';
  const additionalInfo = limitStatus.isInTrialPeriod && limitStatus.trialDaysRemaining !== undefined
    ? `Your trial ends in ${limitStatus.trialDaysRemaining} ${limitStatus.trialDaysRemaining === 1 ? 'day' : 'days'}`
    : 'Resets at midnight';

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`px-3 py-1.5 rounded-lg border ${
          limitStatus.isLimited
            ? 'bg-red-50 border-red-200 text-red-700'
            : limitStatus.remaining === 1
            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : limitStatus.isInTrialPeriod
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}
      >
        <div className="flex flex-col">
          <div>
            <span className="font-semibold">{tierLabel}:</span>
            <span className="ml-1 font-medium">
              {limitStatus.used} of {limitStatus.limit}
            </span>
            <span className="ml-1 font-normal">
              {limitStatus.limit === 1 ? 'login' : 'logins'} today
            </span>
          </div>
          <div className="text-xs mt-0.5 opacity-75">
            ({additionalInfo})
          </div>
        </div>
      </div>

      {limitStatus.isLimited && (
        <button
          onClick={onLimitReached}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
