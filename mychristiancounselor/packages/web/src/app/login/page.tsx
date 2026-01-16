'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, saveTokens, clearTokens } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { SessionLimitModal } from '../../components/SessionLimitModal';
import { TwoFactorCodeInput } from '../../components/security/TwoFactorCodeInput';
import { SessionLimitStatus } from '@mychristiancounselor/shared';
import { api } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLimitModal, setSessionLimitModal] = useState<{
    isOpen: boolean;
    limitStatus: SessionLimitStatus | null;
  }>({ isOpen: false, limitStatus: null });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp' | null>(null);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // Clear any stale tokens when landing on login page
  // This ensures a clean login state
  useEffect(() => {
    clearTokens();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email, password });

      // Check if 2FA is required
      if ((response as any).requires2FA) {
        setRequires2FA(true);
        setTwoFactorUserId((response as any).userId);
        setTwoFactorMethod((response as any).method);
        setLoading(false);
        return;
      }

      // Normal login flow - save tokens and redirect
      saveTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setUser(response.user);

      // Check if session limit was exceeded at login
      if (response.sessionLimitStatus && response.sessionLimitStatus.isLimited) {
        // Show session limit modal instead of redirecting
        setSessionLimitModal({ isOpen: true, limitStatus: response.sessionLimitStatus });
        setLoading(false);
        return;
      }

      // Redirect to the specified redirect URL or home page
      const redirect = searchParams.get('redirect') || '/home';
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (code: string) => {
    if (!twoFactorUserId || !twoFactorMethod) {
      setTwoFactorError('Invalid 2FA state');
      return;
    }

    setVerifying2FA(true);
    setTwoFactorError(null);

    try {
      const response = await api.post('/auth/login/verify-2fa', {
        userId: twoFactorUserId,
        code,
        method: twoFactorMethod,
      });

      // Save tokens and set user
      saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
      setUser(response.data.user);

      // Check session limit
      if (response.data.sessionLimitStatus && response.data.sessionLimitStatus.isLimited) {
        setSessionLimitModal({ isOpen: true, limitStatus: response.data.sessionLimitStatus });
        setVerifying2FA(false);
        return;
      }

      // Redirect
      const redirect = searchParams.get('redirect') || '/home';
      router.push(redirect);
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setTwoFactorUserId(null);
    setTwoFactorMethod(null);
    setTwoFactorError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <img
              src="/logo.jpg"
              alt="MyChristianCounselor Online"
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {requires2FA ? 'Two-Factor Authentication' : 'Sign in to your account'}
          </h2>
          {!requires2FA && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                create a new account
              </Link>
            </p>
          )}
        </div>

        {requires2FA ? (
          // 2FA Verification Screen
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {twoFactorMethod === 'email'
                  ? 'Enter the 6-digit code sent to your email'
                  : 'Enter the 6-digit code from your authenticator app'}
              </p>
            </div>

            <TwoFactorCodeInput
              length={6}
              onComplete={handleVerify2FA}
              disabled={verifying2FA}
              error={twoFactorError || undefined}
            />

            <div className="flex justify-center">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to login
              </button>
            </div>
          </div>
        ) : (
          // Normal Login Form
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        )}
      </div>

      {/* Session Limit Modal */}
      <SessionLimitModal
        isOpen={sessionLimitModal.isOpen}
        limitStatus={sessionLimitModal.limitStatus}
        onClose={() => {
          // User cancelled the modal - redirect to landing page
          setSessionLimitModal({ isOpen: false, limitStatus: null });
          router.push('/');
        }}
        onUpgrade={() => {
          // User wants to upgrade - go to subscription page
          setSessionLimitModal({ isOpen: false, limitStatus: null });
          router.push('/settings/subscription');
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
