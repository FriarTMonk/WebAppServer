'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // These should match your Stripe Price IDs from .env
  const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_id_here';
  const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || 'price_annual_id_here';

  const handleSubscribe = async (priceId: string) => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const response = await api.post('/subscriptions/create-checkout-session', {
        priceId,
        successUrl: `${baseUrl}/subscribe/success`,
        cancelUrl: `${baseUrl}/subscribe/cancel`,
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      setError(err.response?.data?.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock unlimited AI-powered Christian counseling and support your spiritual journey
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Monthly Plan */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all">
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Monthly</h2>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">$9</span>
                  <span className="text-2xl font-medium text-gray-500">.99</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-gray-600 mt-2">Billed monthly</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Unlimited AI counseling sessions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Session history & notes</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Advanced AI contextual guidance</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Session sharing & collaboration</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(MONTHLY_PRICE_ID)}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Subscribe Monthly'}
              </button>
            </div>
          </div>

          {/* Annual Plan */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-500 relative hover:shadow-2xl transition-all">
            {/* Best Value Badge */}
            <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
              BEST VALUE
            </div>

            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Annual</h2>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-gray-900">$99</span>
                  <span className="text-gray-500 ml-2">/year</span>
                </div>
                <p className="text-green-600 font-semibold mt-2">Save $20.88 per year!</p>
                <p className="text-gray-500 text-sm">($8.25/month)</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Unlimited AI counseling sessions</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Session history & notes</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Advanced AI contextual guidance</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Session sharing & collaboration</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(ANNUAL_PRICE_ID)}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Subscribe Annually'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-gray-600">
          <p className="mb-2">✝️ All subscriptions support faith-based AI counseling</p>
          <p className="text-sm">Cancel anytime. No questions asked.</p>
        </div>
      </div>
    </div>
  );
}
