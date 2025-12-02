'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-red-600">500</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We're sorry for the inconvenience. An unexpected error has occurred.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-xs font-mono text-red-800 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            onClick={reset}
            className="block w-full px-4 py-3 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Try again
          </button>

          <Link
            href="/"
            className="block w-full px-4 py-3 text-red-600 bg-white border border-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            Go back home
          </Link>

          <Link
            href="/support/tickets"
            className="block w-full px-4 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
          >
            Contact support
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            If this problem persists, please contact our support team with the error details.
          </p>
        </div>
      </div>
    </div>
  );
}
