'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '../../../lib/api';

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-verify on page load (Unix principle: do one thing automatically)
    const verifyEmail = async () => {
      try {
        await apiPost('/auth/verify-email', { token: params.token }, { skipAuth: true });

        setStatus('success');

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=Email verified! Please sign in.');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setError(
          err.message ||
          'Verification failed. The link may have expired or is invalid.'
        );
      }
    };

    verifyEmail();
  }, [params.token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        {status === 'verifying' && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="animate-spin h-5 w-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Verifying your email...</h3>
                <p className="mt-2 text-sm text-blue-700">Please wait a moment.</p>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
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
                <h3 className="text-sm font-medium text-green-800">Email verified successfully!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your email address has been confirmed.</p>
                  <p className="mt-2">Redirecting to login...</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-green-800 hover:text-green-700 underline"
                  >
                    Go to login now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="rounded-md bg-red-50 p-4 mb-6">
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
                  <h3 className="text-sm font-medium text-red-800">Verification failed</h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">What to do next:</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-blue-600 font-semibold mr-2">1.</span>
                  <p className="text-gray-700">
                    <Link href="/resend-verification" className="text-blue-600 hover:text-blue-500 underline">
                      Request a new verification email
                    </Link>
                  </p>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 font-semibold mr-2">2.</span>
                  <p className="text-gray-700">
                    Check your spam folder for the original email
                  </p>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 font-semibold mr-2">3.</span>
                  <p className="text-gray-700">
                    Already verified?{' '}
                    <Link href="/login" className="text-blue-600 hover:text-blue-500 underline">
                      Try signing in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
