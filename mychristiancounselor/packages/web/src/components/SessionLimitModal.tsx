'use client';

import React, { useState, useEffect } from 'react';
import { SessionLimitStatus } from '@mychristiancounselor/shared';

interface SessionLimitModalProps {
  isOpen: boolean;
  limitStatus: SessionLimitStatus | null;
  onClose: () => void;
  onUpgrade: () => void;
}

/**
 * Modal shown when user reaches daily session limit
 * Displays countdown to midnight and upgrade options
 * Dismissible - user can continue existing session
 */
export function SessionLimitModal({ isOpen, limitStatus, onClose, onUpgrade }: SessionLimitModalProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!limitStatus || !isOpen) return;

    const updateCountdown = () => {
      const now = new Date();
      const reset = new Date(limitStatus.resetTime);
      const diff = reset.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Available now!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [limitStatus, isOpen]);

  if (!isOpen || !limitStatus) {
    return null;
  }

  // Determine trial-aware messaging
  const isTrialUser = limitStatus.isInTrialPeriod;
  const modalTitle = isTrialUser ? 'Trial Limit Reached' : 'Daily Limit Reached';
  const limitDescription = isTrialUser && limitStatus.trialDaysRemaining !== undefined
    ? `You've used all ${limitStatus.limit} logins today during your trial period. Your trial ends in ${limitStatus.trialDaysRemaining} ${limitStatus.trialDaysRemaining === 1 ? 'day' : 'days'}.`
    : `You've used all ${limitStatus.limit} logins today on the free tier.`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{modalTitle}</h2>
          <p className="text-gray-600 mt-2">
            {limitDescription}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Next login available in:</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{timeRemaining}</p>
            </div>
            <svg
              className="w-12 h-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 mb-4 text-white">
          <h3 className="font-bold text-lg mb-2">Upgrade for Unlimited Access</h3>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Unlimited daily logins
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Save conversation history
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Access premium features
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade Now
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can continue your current session, but cannot log in again until tomorrow.
        </p>
      </div>
    </div>
  );
}
