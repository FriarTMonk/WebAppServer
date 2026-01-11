'use client';

import CounselorDashboard from '@/components/CounselorDashboard';
import { AuthGuard } from '@/components/AuthGuard';
import { BackButton } from '@/components/BackButton';

export default function CounselPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <BackButton />
          <CounselorDashboard />
        </div>
      </div>
    </AuthGuard>
  );
}
