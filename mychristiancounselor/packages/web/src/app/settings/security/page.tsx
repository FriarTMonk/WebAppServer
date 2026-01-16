'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { TwoFactorCodeInput } from '@/components/security/TwoFactorCodeInput';

interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email' | 'totp' | null;
  twoFactorEnabledAt: string | null;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email 2FA setup states
  const [emailSetupStep, setEmailSetupStep] = useState<'initial' | 'verify'>('initial');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/auth/2fa/status');
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableEmail2FA = async () => {
    setSendingCode(true);
    setError(null);

    try {
      await api.post('/auth/2fa/email/enable');
      setEmailSetupStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    setSendingCode(true);
    setCodeError(null);

    try {
      await api.post('/auth/2fa/email/resend');
    } catch (err: any) {
      setCodeError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setVerifyingCode(true);
    setCodeError(null);

    try {
      await api.post('/auth/2fa/email/verify', { code });
      // Refresh status
      await fetchStatus();
      setEmailSetupStep('initial');
      setError(null);
    } catch (err: any) {
      setCodeError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    try {
      await api.post('/auth/2fa/disable');
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <BackButton />
          <Breadcrumbs
            items={[
              { label: 'Settings', href: '/settings' },
              { label: 'Security', href: '/settings/security' },
            ]}
          />
          <div className="mt-8 text-center">
            <p className="text-gray-600">Loading security settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <BackButton />
        <Breadcrumbs
          items={[
            { label: 'Settings', href: '/settings' },
            { label: 'Security', href: '/settings/security' },
          ]}
        />

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account security and two-factor authentication
          </p>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Two-Factor Authentication Section */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Two-Factor Authentication
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Add an extra layer of security to your account
            </p>
          </div>

          <div className="px-6 py-5">
            {!status?.twoFactorEnabled ? (
              // 2FA Disabled - Setup Options
              <div className="space-y-6">
                {emailSetupStep === 'initial' ? (
                  <>
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          Email Verification
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Receive a verification code via email when logging in from a new device
                        </p>
                      </div>
                      <button
                        onClick={handleEnableEmail2FA}
                        disabled={sendingCode}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sendingCode ? 'Sending...' : 'Enable'}
                      </button>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            Authenticator App (TOTP)
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Use an authenticator app like Google Authenticator or Authy
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Coming soon
                          </p>
                        </div>
                        <button
                          disabled
                          className="ml-4 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          Enable
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // Email 2FA Verification Step
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Verify Your Email
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        We sent a 6-digit code to your email address. Enter it below to enable two-factor authentication.
                      </p>
                    </div>

                    <TwoFactorCodeInput
                      length={6}
                      onComplete={handleVerifyCode}
                      disabled={verifyingCode}
                      error={codeError || undefined}
                      label="Verification Code"
                    />

                    <div className="flex justify-between items-center">
                      <button
                        onClick={handleResendCode}
                        disabled={sendingCode}
                        className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {sendingCode ? 'Sending...' : 'Resend Code'}
                      </button>

                      <button
                        onClick={() => setEmailSetupStep('initial')}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 2FA Enabled - Status and Management
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 text-green-600 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Two-factor authentication is enabled
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Method: {status.twoFactorMethod === 'email' ? 'Email Verification' : 'Authenticator App'}
                      </p>
                    </div>
                  </div>
                </div>

                {status.twoFactorMethod === 'email' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💡 Want better security? Upgrade to an authenticator app (TOTP) for faster and more secure logins.
                    </p>
                    <button
                      disabled
                      className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Upgrade to TOTP (Coming Soon)
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={handleDisable2FA}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Disable Two-Factor Authentication
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
