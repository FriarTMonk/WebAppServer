'use client';

import { ConversationView } from '../../components/ConversationView';
import { AuthGuard } from '../../components/AuthGuard';

/**
 * Home Page - Conversation View
 *
 * Unix Principles Applied:
 * - Single purpose: Provide counseling conversation interface
 * - Authentication required: Redirects to login if not authenticated
 * - Simple: Just show the conversation view after auth check
 *
 * Requires authentication to access.
 * Redirects to login page if user is not logged in.
 */
export default function HomePage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <ConversationView />
    </AuthGuard>
  );
}
