'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ExternalOrganizationsList } from '@/components/ExternalOrganizationsList';

export default function OrgAdminOrganizationsPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Check permissions - redirect if not org admin
  useEffect(() => {
    const timer = setTimeout(() => {
      setPermissionsChecked(true);
      if (!permissions.isOrgAdmin) {
        router.push('/dashboard');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [permissions.isOrgAdmin, router]);

  if (!permissionsChecked) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
          <div className="h-40 w-full bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!permissions.isOrgAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <ExternalOrganizationsList
      onBack={() => router.push('/org-admin')}
      backButtonText="Back to Organization Admin"
      title="External Organizations"
      description="Manage external organization referrals and connections for your members"
      filterByOrganization={true}
    />
  );
}
