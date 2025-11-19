'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface SubscriptionStatus {
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionTier?: 'basic' | 'premium';
  maxClarifyingQuestions: number;
  hasHistoryAccess: boolean;
  hasSharingAccess: boolean;
  hasArchiveAccess: boolean;
}

export default function SubscriptionManagementPage() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const response = await api.post('/subscriptions/create-portal-session', {
        returnUrl: `${baseUrl}/settings/subscription`,
      });

      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    } catch (err: any) {
      console.error('Failed to create portal session:', err);
      setError(err.response?.data?.message || 'Failed to open subscription management portal');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const isSubscribed = status?.subscriptionStatus === 'active';
  const isPastDue = status?.subscriptionStatus === 'past_due';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="text-purple-600 hover:text-purple-700 flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Subscription Status Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isSubscribed
                    ? 'bg-green-100 text-green-800'
                    : isPastDue
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {isSubscribed ? 'Active' : isPastDue ? 'Past Due' : 'Free'}
              </span>
            </div>

            {isSubscribed || isPastDue ? (
              <div>
                <p className="text-gray-600 mb-6">
                  {isPastDue
                    ? 'Your payment failed. Please update your payment method to continue your subscription.'
                    : 'You have full access to all premium features.'}
                </p>

                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Premium Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited AI counseling sessions
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Session history & notes ({status?.maxClarifyingQuestions} questions)
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Session sharing & collaboration
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Advanced AI contextual guidance
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription in Stripe'}
                </button>

                <p className="text-sm text-gray-500 mt-4 text-center">
                  Update payment method, view invoices, or cancel your subscription
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  You're currently using the free plan with limited features.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Free Plan Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Limited counseling sessions
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      No session history
                    </li>
                    <li className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      No session sharing
                    </li>
                  </ul>
                </div>

                <Link
                  href="/subscribe"
                  className="block w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-center"
                >
                  Upgrade to Premium
                </Link>

                <p className="text-sm text-gray-500 mt-4 text-center">
                  Starting at $9.99/month or $99/year
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-700 text-sm mb-3">
            Have questions about your subscription or billing?
          </p>
          <a
            href="mailto:support@mychristiancounselor.com"
            className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
          >
            Contact Support →
          </a>
        </div>
      </div>
    </div>
  );
}
