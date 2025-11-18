'use client';

import React, { useState } from 'react';
import type { OrganizationInvitation } from '@mychristiancounselor/shared';

interface InvitationBannerProps {
  invitations: OrganizationInvitation[];
  onAcceptInvitation: (token: string) => Promise<void>;
  onDismiss: () => void;
}

export function InvitationBanner({
  invitations,
  onAcceptInvitation,
  onDismiss,
}: InvitationBannerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (invitation: OrganizationInvitation) => {
    setLoading(invitation.id);
    setError(null);

    try {
      await onAcceptInvitation(invitation.id);
      // After accepting, the parent component should refresh and remove this invitation
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      setLoading(null);
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  // Show the most recent invitation
  const invitation = invitations[0];
  const orgName = invitation.organization?.name || 'an organization';
  const inviterName = invitation.invitedBy?.firstName && invitation.invitedBy?.lastName
    ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
    : invitation.invitedBy?.email || 'Someone';

  return (
    <div className="bg-blue-500 border-b-4 border-blue-600 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Invitation Info */}
          <div className="flex items-center gap-3 flex-1">
            {/* Info Icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Invitation Details */}
            <div className="flex-1">
              <p className="font-bold text-blue-900">
                ORGANIZATION INVITATION
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{inviterName}</span> invited you to join{' '}
                <span className="font-semibold">{orgName}</span>
              </p>
              {invitations.length > 1 && (
                <p className="text-xs text-blue-700 mt-1">
                  You have {invitations.length} pending invitations
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAccept(invitation)}
              disabled={!!loading}
              className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-md border-2 border-blue-600"
            >
              {loading === invitation.id ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={onDismiss}
              disabled={!!loading}
              className="px-4 py-2 text-white hover:text-blue-100 disabled:text-blue-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Dismiss invitation banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
