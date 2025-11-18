'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CounselorDashboard from '@/components/CounselorDashboard';
import { getAccessToken } from '@/lib/auth';

export default function CounselPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check for token directly to avoid race condition with auth context initialization
    const token = getAccessToken();
    if (!token) {
      // Use replace to avoid adding login to history stack
      router.replace('/login');
    }
  }, [router]);

  // Also check for token existence, not just user from context
  const token = getAccessToken();
  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <CounselorDashboard />;
}
