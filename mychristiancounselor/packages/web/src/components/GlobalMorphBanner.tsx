'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MorphBanner } from './MorphBanner';

/**
 * GlobalMorphBanner component that displays the morph warning banner
 * when a user is in an active morph session.
 *
 * This should be added to the root layout to show globally across all pages.
 */
export function GlobalMorphBanner() {
  const { morphSession, endMorph } = useAuth();

  console.log('[GLOBAL MORPH BANNER] morphSession:', morphSession);

  // Don't render anything if not morphed
  if (!morphSession?.isMorphed) {
    console.log('[GLOBAL MORPH BANNER] Not morphed, returning null');
    return null;
  }

  console.log('[GLOBAL MORPH BANNER] Rendering banner');

  const handleEndMorph = async () => {
    try {
      await endMorph();
    } catch (error) {
      console.error('Failed to end morph session:', error);
      alert('Failed to end morph session. Please try again.');
    }
  };

  return (
    <MorphBanner
      morphedUserEmail={morphSession.morphedUserEmail || 'Unknown User'}
      morphedUserName={morphSession.morphedUserName}
      onEndMorph={handleEndMorph}
    />
  );
}
