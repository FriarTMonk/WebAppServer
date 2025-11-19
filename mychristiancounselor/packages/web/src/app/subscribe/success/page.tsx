'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/counsel');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to MyChristianCounselor!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Your subscription is now active. Thank you for joining our community!
        </p>

        {/* What's Next */}
        <div className="bg-purple-50 rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">What's next?</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">✓</span>
              <span>Start unlimited counseling sessions</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">✓</span>
              <span>Access your session history and notes</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">✓</span>
              <span>Share sessions with trusted individuals</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">✓</span>
              <span>Receive advanced AI guidance</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/counsel"
            className="block w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Start Your First Session
          </Link>
          <Link
            href="/settings/subscription"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Manage Subscription
          </Link>
        </div>

        {/* Auto-redirect Notice */}
        <p className="text-sm text-gray-500 mt-6">
          Redirecting to counsel page in 5 seconds...
        </p>
      </div>
    </div>
  );
}
