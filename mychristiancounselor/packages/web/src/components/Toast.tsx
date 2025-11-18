'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300); // Match animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    info: 'bg-blue-500 border-blue-600',
    warning: 'bg-yellow-500 border-yellow-600',
    error: 'bg-red-500 border-red-600',
    success: 'bg-green-500 border-green-600',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-lg border-2 text-white font-medium transition-all duration-300 ${
        typeStyles[type]
      } ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      style={{ minWidth: '300px' }}
    >
      <div className="flex items-center gap-3">
        {type === 'warning' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === 'success' && (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <p className="flex-1">{message}</p>
      </div>
    </div>
  );
}

// Toast container for managing multiple toasts
let toastContainer: HTMLDivElement | null = null;

function getToastContainer() {
  if (typeof window === 'undefined') return null;

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  return toastContainer;
}

// Helper function to show a toast
export function showToast(message: string, type: ToastProps['type'] = 'info', duration = 3000) {
  if (typeof window === 'undefined') return;

  const container = getToastContainer();
  if (!container) return;

  // Create a wrapper div for this toast
  const toastWrapper = document.createElement('div');
  container.appendChild(toastWrapper);

  // Import React and ReactDOM dynamically
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(toastWrapper);

    root.render(
      <Toast
        message={message}
        type={type}
        duration={duration}
        onClose={() => {
          root.unmount();
          container.removeChild(toastWrapper);
        }}
      />
    );
  });
}
