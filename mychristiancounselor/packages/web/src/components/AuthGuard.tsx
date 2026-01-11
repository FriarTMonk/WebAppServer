'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * AuthGuard - Ensures authentication state is fully loaded before rendering children
 *
 * Prevents rendering errors by:
 * 1. Showing loading state while auth initializes
 * 2. Optionally redirecting unauthenticated users
 * 3. Ensuring components have access to user data before mounting
 *
 * Usage:
 *   <AuthGuard requireAuth redirectTo="/login">
 *     <YourProtectedComponent />
 *   </AuthGuard>
 */
export function AuthGuard({ children, requireAuth = true, redirectTo = '/login' }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if auth has finished loading and user is not authenticated
    if (!isLoading && requireAuth && !user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const redirect = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
      router.push(`${redirectTo}${redirect}`);
    }
  }, [isLoading, user, requireAuth, redirectTo, router]);

  // Show loading spinner while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not logged in, show nothing (redirect will happen)
  if (requireAuth && !user) {
    return null;
  }

  // Auth is ready, render children
  return <>{children}</>;
}
