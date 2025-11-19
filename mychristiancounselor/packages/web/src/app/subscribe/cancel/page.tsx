'use client';

import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Cancel Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-yellow-600"
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
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Subscription Not Completed
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          It looks like you cancelled the checkout process. No charges have been made.
        </p>

        {/* Why Subscribe Section */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">Why subscribe?</h2>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Unlimited access to AI-powered Christian counseling</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Save and review your session history</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Share sessions with counselors or trusted friends</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Advanced AI features for deeper spiritual guidance</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Support faith-based AI counseling development</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/subscribe"
            className="block w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Try Again - Subscribe Now
          </Link>
          <Link
            href="/counsel"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Continue Without Subscribing
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Questions about pricing?</strong>
          </p>
          <p className="text-sm text-gray-500">
            Contact us at{' '}
            <a
              href="mailto:support@mychristiancounselor.com"
              className="text-purple-600 hover:underline"
            >
              support@mychristiancounselor.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
