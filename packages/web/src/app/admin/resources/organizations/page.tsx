'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // CORRECT PATTERN: Permission check in useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPermissionsChecked(true);
      if (!permissions.isPlatformAdmin) {
        router.push('/resources/books');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [permissions.isPlatformAdmin, router]);

  // Show loading state while permissions load
  if (!permissionsChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Organizations</h1>
          <p className="mt-2 text-gray-600">
            Manage all organizations that can endorse resources on the platform
          </p>
        </div>

        {/* Table Structure (Empty) */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Books Endorsed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-6 py-16">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Platform-wide organization management features are under development
                    </p>
                    <div className="max-w-2xl mx-auto text-left bg-blue-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-3">Features to be added:</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          View and manage all organizations across the platform
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          Approve or suspend organization accounts
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          Monitor organization endorsement activity
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          View organization details and audit logs
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          Set platform-wide organization policies
                        </li>
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
