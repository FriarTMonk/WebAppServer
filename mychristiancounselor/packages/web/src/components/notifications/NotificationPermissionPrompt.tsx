'use client';

import { useState, useEffect } from 'react';
import { BrowserNotifications } from './BrowserNotifications';

interface NotificationPermissionPromptProps {
  onPermissionChange?: (permission: 'granted' | 'denied' | 'default') => void;
}

export function NotificationPermissionPrompt({
  onPermissionChange,
}: NotificationPermissionPromptProps) {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (BrowserNotifications.isSupported()) {
      const currentPermission = BrowserNotifications.getPermission();
      setPermission(currentPermission);
      setShowPrompt(currentPermission === 'default');
    }
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const newPermission = await BrowserNotifications.requestPermission();
      setPermission(newPermission);
      setShowPrompt(false);
      onPermissionChange?.(newPermission);
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!BrowserNotifications.isSupported()) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 mb-1">
              Notifications Blocked
            </h3>
            <p className="text-sm text-yellow-800">
              Browser notifications are blocked. To receive queue alerts, please enable notifications
              in your browser settings for this site.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-green-800">
          <span className="text-green-600">✓</span>
          <span>Browser notifications enabled</span>
        </div>
      </div>
    );
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-blue-600 text-xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">
            Enable Queue Alerts
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Get instant notifications for critical queue events like failures, stalls, and max retries.
            You can always change this later.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {requesting ? 'Requesting...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-100"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
