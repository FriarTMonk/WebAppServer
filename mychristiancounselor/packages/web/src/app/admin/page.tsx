'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../components/AdminLayout';

interface PlatformMetrics {
  activeUsers: {
    total: number;
    individual: number;
    organization: number;
  };
  totalUsers: number;
  organizations: {
    total: number;
    trial: number;
    active: number;
    expired: number;
  };
  timestamp: string;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        // Redirect to login on auth errors
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin');
          return;
        }
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Platform Overview</h2>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading metrics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Users</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeUsers.total}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Individual: {metrics.activeUsers.individual}</p>
                <p>Organization: {metrics.activeUsers.organization}</p>
              </div>
            </div>

            {/* Total Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
            </div>

            {/* Organizations Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Organizations</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.organizations.total}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Trial: {metrics.organizations.trial}</p>
                <p>Active: {metrics.organizations.active}</p>
                <p>Expired: {metrics.organizations.expired}</p>
              </div>
            </div>

            {/* Last Updated Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-900">
                {new Date(metrics.timestamp).toLocaleString()}
              </p>
              <button
                onClick={fetchMetrics}
                className="mt-4 text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
