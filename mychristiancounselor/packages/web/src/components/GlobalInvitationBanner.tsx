'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { InvitationBanner } from './InvitationBanner';

/**
 * GlobalInvitationBanner component that displays pending organization invitations
 * when a user logs in with an email that has pending invitations.
 *
 * This should be added to the root providers to show globally across all pages.
 */
export function GlobalInvitationBanner() {
  const { pendingInvitations, acceptInvitation, dismissInvitationBanner } = useAuth();

  // Don't render anything if no pending invitations
  if (!pendingInvitations || pendingInvitations.length === 0) {
    return null;
  }

  const handleAcceptInvitation = async (token: string) => {
    try {
      await acceptInvitation(token);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  };

  return (
    <InvitationBanner
      invitations={pendingInvitations}
      onAcceptInvitation={handleAcceptInvitation}
      onDismiss={dismissInvitationBanner}
    />
  );
}
