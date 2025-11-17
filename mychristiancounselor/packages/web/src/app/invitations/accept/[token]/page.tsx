'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';

type InvitationStatus = 'loading' | 'success' | 'error' | 'not_logged_in';

interface ErrorDetails {
  message: string;
  statusCode?: number;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  const token = params.token as string;

  useEffect(() => {
    if (!user) {
      setStatus('not_logged_in');
      return;
    }

    acceptInvitation();
  }, [user, token]);

  const acceptInvitation = async () => {
    try {
      setStatus('loading');
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const accessToken = localStorage.getItem('accessToken');

      const response = await fetch(`${apiUrl}/organizations/invitations/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw {
          message: errorData.message || 'Failed to accept invitation',
          statusCode: response.status,
        };
      }

      const member = await response.json();

      // Try to get organization name from member data if available
      if (member.organization?.name) {
        setOrganizationName(member.organization.name);
      }

      setStatus('success');

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError({
        message: err.message || 'An unexpected error occurred',
        statusCode: err.statusCode,
      });
      setStatus('error');
    }
  };

  const handleLoginRedirect = () => {
    // Save the current URL to return after login
    const returnUrl = `/invitations/accept/${token}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleSignupRedirect = () => {
    // Save the current URL to return after signup
    const returnUrl = `/invitations/accept/${token}`;
    router.push(`/signup?redirect=${encodeURIComponent(returnUrl)}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="animate-spin h-12 w-12 mx-auto text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Invitation</h1>
          <p className="text-gray-600">Please wait while we accept your invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'not_logged_in') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 text-center">
            <svg className="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
            <p className="text-gray-600 mb-6">
              You need to be logged in to accept this organization invitation. If you don't have an account yet, you can sign up first.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLoginRedirect}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Login to Accept Invitation
            </button>
            <button
              onClick={handleSignupRedirect}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              Create Account
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              After logging in, you will be redirected back to accept the invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
          <p className="text-gray-600 mb-4">
            {organizationName
              ? `You have successfully joined ${organizationName}.`
              : 'You have successfully joined the organization.'}
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you to the home page...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    const isInvitationNotFound = error?.statusCode === 404;
    const isInvitationExpired = error?.message?.toLowerCase().includes('expired');
    const isInvitationUsed = error?.message?.toLowerCase().includes('already used');
    const isWrongUser = error?.statusCode === 403;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 text-center">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isInvitationNotFound && 'Invitation Not Found'}
              {isInvitationExpired && 'Invitation Expired'}
              {isInvitationUsed && 'Invitation Already Used'}
              {isWrongUser && 'Invitation Not For This Account'}
              {!isInvitationNotFound && !isInvitationExpired && !isInvitationUsed && !isWrongUser && 'Error Accepting Invitation'}
            </h1>
            <p className="text-gray-600 mb-6">
              {error?.message || 'An unexpected error occurred while accepting the invitation.'}
            </p>
          </div>

          {isWrongUser && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                This invitation was sent to a different email address. Please log in with the account that received the invitation or contact the organization administrator.
              </p>
            </div>
          )}

          {(isInvitationExpired || isInvitationNotFound) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Please contact the organization administrator to request a new invitation.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Go to Home
            </button>
            {isWrongUser && (
              <button
                onClick={() => {
                  // Log out and redirect to login
                  localStorage.removeItem('accessToken');
                  handleLoginRedirect();
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Login with Different Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
