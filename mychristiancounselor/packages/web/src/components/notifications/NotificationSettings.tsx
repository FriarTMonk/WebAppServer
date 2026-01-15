'use client';

import { useState, useEffect } from 'react';
import { SoundAlerts } from '@/utils/soundAlerts';
import { BrowserNotifications } from './BrowserNotifications';

interface NotificationSettingsProps {
  onClose: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(SoundAlerts.isEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    BrowserNotifications.getPermission() === 'granted'
  );

  useEffect(() => {
    const permission = BrowserNotifications.getPermission();
    setNotificationsEnabled(permission === 'granted');
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    SoundAlerts.setEnabled(enabled);
    localStorage.setItem('soundAlertsEnabled', enabled.toString());
  };

  const handleTestSound = () => {
    SoundAlerts.playAlert('success');
  };

  const handleRequestNotifications = async () => {
    try {
      const permission = await BrowserNotifications.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Notification Settings</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Browser Notifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">Browser Notifications</p>
                  <p className="text-sm text-gray-600">
                    Get desktop notifications for queue alerts
                  </p>
                </div>
                {notificationsEnabled ? (
                  <span className="text-green-600 text-sm font-medium">Enabled</span>
                ) : (
                  <button
                    onClick={handleRequestNotifications}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Enable
                  </button>
                )}
              </div>
              {!notificationsEnabled && BrowserNotifications.getPermission() === 'denied' && (
                <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              )}
            </div>

            {/* Sound Alerts */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">Sound Alerts</p>
                  <p className="text-sm text-gray-600">
                    Play audio alerts for critical events
                  </p>
                </div>
                <button
                  onClick={() => handleSoundToggle(!soundEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {soundEnabled && (
                <button
                  onClick={handleTestSound}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Test sound
                </button>
              )}
            </div>

            {/* Alert Types */}
            <div className="border-t pt-6">
              <p className="font-medium text-gray-900 mb-3">Alert Types</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">🔴</span>
                  <div>
                    <p className="font-medium text-gray-900">Critical Alerts</p>
                    <p className="text-gray-600">Failure spikes, stalled queue</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">🟡</span>
                  <div>
                    <p className="font-medium text-gray-900">Warning Alerts</p>
                    <p className="text-gray-600">Max retries reached, queue paused</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> Notifications only trigger when the tab is active or backgrounded.
                Sound alerts play regardless of browser notification permission.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
