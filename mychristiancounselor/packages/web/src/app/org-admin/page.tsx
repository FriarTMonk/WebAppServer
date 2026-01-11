'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OrgAdminLayout } from '../../components/OrgAdminLayout';
import { BackButton } from '@/components/BackButton';

interface OrgMetrics {
  organizationId: string;
  activeMembers: number;
  counselingSessions: number;
  licenseUtilization: {
    used: number;
    available: number;
    percentage: number;
  };
}

interface OrganizationInfo {
  id: string;
  name: string;
}

export default function OrgAdminOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const token = localStorage.getItem('accessToken');

      // Fetch organization info
      const orgResponse = await fetch(`${apiUrl}/org-admin/organization`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!orgResponse.ok) {
        if (orgResponse.status === 401 || orgResponse.status === 403) {
          router.push('/login?redirect=/org-admin');
          return;
        }
        const errorText = await orgResponse.text();
        console.error('Failed to fetch organization info:', {
          status: orgResponse.status,
          statusText: orgResponse.statusText,
          body: errorText,
          url: orgResponse.url
        });
        throw new Error(`Failed to fetch organization info: ${orgResponse.status} ${orgResponse.statusText}`);
      }

      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Fetch metrics
      const metricsResponse = await fetch(`${apiUrl}/org-admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!metricsResponse.ok) {
        if (metricsResponse.status === 401 || metricsResponse.status === 403) {
          router.push('/login?redirect=/org-admin');
          return;
        }
        const errorText = await metricsResponse.text();
        console.error('Failed to fetch metrics:', {
          status: metricsResponse.status,
          statusText: metricsResponse.statusText,
          body: errorText,
          url: metricsResponse.url
        });
        throw new Error(`Failed to fetch metrics: ${metricsResponse.status} ${metricsResponse.statusText}`);
      }

      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <OrgAdminLayout organizationName={organization?.name}>
      <div>
        <BackButton />
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Organization Overview</h2>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading metrics...</p>
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

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Members Card */}
            <div className="bg-white rounded-lg shadow p-6" data-tour="active-members-card">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Members</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeMembers}</p>
              <p className="mt-2 text-sm text-gray-600">
                Active in last 7 days
              </p>
            </div>

            {/* Counseling Sessions Card */}
            <div className="bg-white rounded-lg shadow p-6" data-tour="counseling-sessions-card">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Counseling Sessions</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.counselingSessions}</p>
              <p className="mt-2 text-sm text-gray-600">
                Total sessions
              </p>
            </div>

            {/* License Utilization Card */}
            <div className="bg-white rounded-lg shadow p-6" data-tour="license-utilization-card">
              <h3 className="text-sm font-medium text-gray-500 mb-2">License Utilization</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900">{metrics.licenseUtilization.percentage}%</p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Used: {metrics.licenseUtilization.used}</span>
                  <span>Available: {metrics.licenseUtilization.available}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.licenseUtilization.percentage >= 90
                        ? 'bg-red-600'
                        : metrics.licenseUtilization.percentage >= 75
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${metrics.licenseUtilization.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Refresh Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Actions</h3>
              <button
                onClick={fetchData}
                className="w-full mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Refresh Metrics
              </button>
              <button
                onClick={() => router.push('/org-admin/members')}
                className="w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                data-tour="view-members-button"
              >
                View Members
              </button>
            </div>
          </div>
        )}

        {/* Quick Info Section */}
        {metrics && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Info</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>
                • Your organization has <strong>{metrics.licenseUtilization.used}</strong> members
                using <strong>{metrics.licenseUtilization.available}</strong> available seats.
              </li>
              {metrics.licenseUtilization.percentage >= 90 && (
                <li className="text-red-700 font-medium">
                  ⚠️ Warning: License utilization is at {metrics.licenseUtilization.percentage}%.
                  Consider upgrading your license.
                </li>
              )}
              <li>
                • <strong>{metrics.activeMembers}</strong> members have been active in the last 7 days.
              </li>
              <li>
                • Total of <strong>{metrics.counselingSessions}</strong> counseling sessions recorded.
              </li>
            </ul>
          </div>
        )}
      </div>
    </OrgAdminLayout>
  );
}
