'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '../../lib/api';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiPost('/auth/resend-verification', { email }, { skipAuth: true });

      setSuccess(true);
      setEmail(''); // Clear form
    } catch (err: any) {
      // Unix principle: Fail gracefully with clear message
      if (err.message?.includes('Too many')) {
        setError(err.message);
      } else {
        // Security: Don't reveal if email exists
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Resend Verification Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email to receive a new verification link
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Check your email</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    If an account exists with that email, we've sent a new verification link.
                  </p>
                  <p className="mt-2">
                    Please check your inbox and spam folder.
                  </p>
                </div>
                <div className="mt-4 space-x-4">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                    }}
                    className="text-sm font-medium text-green-800 hover:text-green-700 underline"
                  >
                    Send another email
                  </button>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-green-800 hover:text-green-700 underline"
                  >
                    Go to login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send verification email'}
              </button>
            </div>

            <div className="text-sm text-center space-y-2">
              <p className="text-gray-600">
                Already verified?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
              <p className="text-gray-600">
                Need help?{' '}
                <Link href="/support/new" className="font-medium text-blue-600 hover:text-blue-500">
                  Contact support
                </Link>
              </p>
            </div>
          </form>
        )}

        <div className="mt-6 bg-blue-50 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Tips:</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Check your spam/junk folder</li>
            <li>Make sure you're using the correct email</li>
            <li>You can only request a new link once per hour</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
