'use client';

import CounselorDashboard from '@/components/CounselorDashboard';
import { AuthGuard } from '@/components/AuthGuard';

export default function CounselPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <CounselorDashboard />
    </AuthGuard>
  );
}
