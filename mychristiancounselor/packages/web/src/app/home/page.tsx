'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationView } from '../../components/ConversationView';
import { useAuth } from '../../contexts/AuthContext';

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
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      // Not logged in - redirect to login with return URL
      router.push('/login?redirect=/home');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show nothing if not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  return <ConversationView />;
}
