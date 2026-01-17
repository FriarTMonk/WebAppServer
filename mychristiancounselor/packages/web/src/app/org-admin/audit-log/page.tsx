'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OrgAdminLayout } from '../../../components/OrgAdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  metadata?: any;
}

interface Organization {
  name?: string;
  [key: string]: any;
}

export default function OrgAdminAuditLogPage() {
  const router = useRouter();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const token = localStorage.getItem('accessToken');

      // Fetch organization info
      const orgResponse = await fetch(`${apiUrl}/org-admin/organization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!orgResponse.ok) {
        if (orgResponse.status === 401 || orgResponse.status === 403) {
          router.push('/login?redirect=/org-admin/audit-log');
          return;
        }
        throw new Error('Failed to fetch organization info');
      }

      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Fetch audit log
      const auditResponse = await fetch(`${apiUrl}/org-admin/audit-log`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!auditResponse.ok) {
        if (auditResponse.status === 401 || auditResponse.status === 403) {
          router.push('/login?redirect=/org-admin/audit-log');
          return;
        }
        throw new Error('Failed to fetch audit log');
      }

      const auditData = await auditResponse.json();
      // Handle both array response and object with entries property
      if (Array.isArray(auditData)) {
        setAuditLog(auditData);
      } else {
        setAuditLog(auditData?.entries || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <OrgAdminLayout organizationName={organization?.name}>
      <div>
        <Breadcrumbs />
        <BackButton />
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Audit Log</h2>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading audit log...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.user?.firstName || entry.user?.lastName
                        ? `${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim()
                        : entry.user?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.metadata ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {JSON.stringify(entry.metadata)}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {auditLog.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No audit log entries found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </OrgAdminLayout>
  );
}
