'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CounselorAssignmentManager from '@/components/CounselorAssignmentManager';
import { OrgAdminLayout } from '@/components/OrgAdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function CounselorAssignmentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <OrgAdminLayout>
      <Breadcrumbs />
      <BackButton />
      <CounselorAssignmentManager />
    </OrgAdminLayout>
  );
}
