'use client';

import React from 'react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayActive: () => void;
}

export function InactivityWarningModal({ isOpen, secondsRemaining, onStayActive }: InactivityWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-12 w-12 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Timeout Warning</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your session will timeout in <span className="font-bold text-red-600">{secondsRemaining} seconds</span> due to inactivity.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-6">
          To continue your conversation, please click the button below. Otherwise, you'll be returned to the home page.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onStayActive}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Stay Active
          </button>
        </div>
      </div>
    </div>
  );
}
