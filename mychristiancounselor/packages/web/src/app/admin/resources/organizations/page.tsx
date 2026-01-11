'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { ExternalOrganizationsList } from '@/components/ExternalOrganizationsList';

export default function AdminOrganizationsPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <BackButton />
      <ExternalOrganizationsList
        onBack={() => router.push('/admin')}
        backButtonText="Back to Platform Admin"
        title="External Organizations"
        description="View all external organizations across the platform with endorsement tracking"
        filterByOrganization={false}
      />
    </AdminLayout>
  );
}
