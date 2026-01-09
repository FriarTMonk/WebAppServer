'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '../../hooks/useUserPermissions';

interface MarketingMetrics {
  prospects: {
    total: number;
    active: number;
    converted: number;
    archived: number;
  };
  campaigns: {
    total: number;
    draft: number;
    scheduled: number;
    sent: number;
  };
  engagement: {
    avgOpenRate: number;
    avgClickRate: number;
    avgReplyRate: number;
    totalRecipients: number;
  };
}

export default function MarketingDashboardPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/marketing/campaigns/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/marketing');
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(permissions.isPlatformAdmin ? '/admin' : '/home')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage prospects and email campaigns
          </p>
        </div>

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

        {!loading && !error && metrics && (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div
                onClick={() => router.push('/marketing/prospects')}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Prospects</h2>
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.prospects.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-green-600">{metrics.prospects.active}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Converted</p>
                    <p className="text-2xl font-bold text-blue-600">{metrics.prospects.converted}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Archived</p>
                    <p className="text-2xl font-bold text-gray-600">{metrics.prospects.archived}</p>
                  </div>
                </div>
                <button className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  Manage Prospects →
                </button>
              </div>

              <div
                onClick={() => router.push('/marketing/campaigns')}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Campaigns</h2>
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.campaigns.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Draft</p>
                    <p className="text-2xl font-bold text-gray-600">{metrics.campaigns.draft}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">{metrics.campaigns.scheduled}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="text-2xl font-bold text-green-600">{metrics.campaigns.sent}</p>
                  </div>
                </div>
                <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  View Campaigns →
                </button>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Total Recipients</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.engagement.totalRecipients}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Avg Open Rate</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.engagement.avgOpenRate.toFixed(1)}%</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metrics.engagement.avgOpenRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Avg Click Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.engagement.avgClickRate.toFixed(1)}%</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${metrics.engagement.avgClickRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Avg Reply Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics.engagement.avgReplyRate.toFixed(1)}%</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${metrics.engagement.avgReplyRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Getting Started</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-medium">Add Prospects</p>
                    <p className="text-blue-700">Create prospect organizations with multiple contacts to build your outreach list.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-medium">Create Campaigns</p>
                    <p className="text-blue-700">Design email campaigns and select recipients from your prospect list.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-medium">Track Engagement</p>
                    <p className="text-blue-700">Monitor opens, clicks, and replies. 90-day cooldown enforced between campaigns.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
