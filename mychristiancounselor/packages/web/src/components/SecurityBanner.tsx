'use client';

import { useState } from 'react';

interface SecurityBannerProps {
  type: 'deployment' | '3-day' | '9-day';
  onDismiss: () => void;
  onEnable: () => void;
}

export default function SecurityBanner({ type, onDismiss, onEnable }: SecurityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const messages = {
    deployment: {
      title: 'New Security Feature Available',
      body: 'Two-factor authentication is now available to help protect your account.',
      icon: '🔒',
    },
    '3-day': {
      title: 'Reminder: Enable Two-Factor Authentication',
      body: 'Add an extra layer of security to your account in just 2 minutes.',
      icon: '🛡️',
    },
    '9-day': {
      title: 'Protect Your Account',
      body: 'Two-factor authentication helps keep your counseling data secure.',
      icon: '🔐',
    },
  };

  const content = messages[type];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="text-3xl mr-4">{content.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">{content.title}</h3>
          <p className="text-blue-800 text-sm">{content.body}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onEnable}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Enable Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1 text-blue-600 text-sm hover:underline"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
