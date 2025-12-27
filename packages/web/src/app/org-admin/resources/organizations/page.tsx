'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/lib/hooks/useUserPermissions';

export default function OrgAdminOrganizationsPage() {
  const router = useRouter();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();

  // Check permissions - redirect if not org admin
  useEffect(() => {
    if (!permissionsLoading && !hasPermission('manage_organization_content')) {
      router.push('/dashboard');
    }
  }, [hasPermission, permissionsLoading, router]);

  if (permissionsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
          <div className="h-40 w-full bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!hasPermission('manage_organization_content')) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Organizations</h1>
        <p className="text-gray-600">
          Manage external organization referrals and connections
        </p>
      </div>

      {/* Info Box - External Organizations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8zm0 4a1 1 0 000 2h6a1 1 0 000-2H8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              External Organizations
            </h3>
            <p className="text-blue-800">
              Manage referral organizations and external resources for your users. These organizations appear
              in the organization directory and provide additional support and counseling referral options to
              your members. External organizations can include crisis hotlines, counseling centers, support
              groups, and other local services.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Organization management features are currently being developed. You'll soon be able to add and manage
          external organization referrals and connections for your members.
        </p>
      </div>
    </div>
  );
}
