'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalOrganizationsList } from '@/components/ExternalOrganizationsList';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function OrgAdminOrganizationsPage() {
  const router = useRouter();

  return (
    <div>
      <Breadcrumbs />
      <ExternalOrganizationsList
        onBack={() => router.push('/org-admin')}
        backButtonText="Back to Organization Admin"
        title="External Organizations"
        description="Manage external organization referrals and connections for your members"
        filterByOrganization={true}
        showAddButton={true}
      />
    </div>
  );
}
