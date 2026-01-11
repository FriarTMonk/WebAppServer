'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface CostAnalytics {
  totalCost: number;
  costThisMonth: number;
  avgCostPerBook: number;
  totalEvaluations: number;
  costByFramework: Array<{ version: string; cost: number; count: number }>;
  expensiveBooks: Array<{ bookId: string; title: string; cost: number; tokens: number }>;
  costTrend: Array<{ date: string; cost: number; count: number }>;
  tokenUsage: {
    totalInput: number;
    totalOutput: number;
    avgInputPerBook: number;
    avgOutputPerBook: number;
  };
}

export default function EvaluationCostsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedFramework, setSelectedFramework] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedFramework]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();

      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (selectedFramework !== 'all') params.append('frameworkVersion', selectedFramework);

      const response = await fetch(`${apiUrl}/admin/evaluation/analytics/costs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/evaluation/costs');
          return;
        }
        throw new Error('Failed to fetch cost analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching cost analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <AdminLayout>
      <div>
        <Breadcrumbs />
        <BackButton />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Evaluation Cost Analytics</h2>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Framework Version</label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Versions</option>
                {analytics?.costByFramework.map(fw => (
                  <option key={fw.version} value={fw.version}>{fw.version}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && analytics && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                <p className="text-3xl font-bold text-blue-800">{formatCost(analytics.totalCost)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(analytics.totalEvaluations)} evaluations</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-green-800">{formatCost(analytics.costThisMonth)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Avg per Book</p>
                <p className="text-3xl font-bold text-purple-800">{formatCost(analytics.avgCostPerBook)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-1">Total Tokens</p>
                <p className="text-2xl font-bold text-orange-800">
                  {formatNumber(analytics.tokenUsage.totalInput + analytics.tokenUsage.totalOutput)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  In: {formatNumber(analytics.tokenUsage.totalInput)} | Out: {formatNumber(analytics.tokenUsage.totalOutput)}
                </p>
              </div>
            </div>

            {/* Cost by Framework */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Cost by Framework Version</h3>
              <div className="space-y-4">
                {analytics.costByFramework.map((fw) => (
                  <div key={fw.version} className="flex items-center">
                    <div className="w-32 text-sm font-medium text-gray-700">{fw.version}</div>
                    <div className="flex-1">
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-blue-600">
                              {formatCost(fw.cost)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-gray-600">
                              {fw.count} evaluations
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                          <div
                            style={{ width: `${(fw.cost / analytics.totalCost) * 100}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Usage Breakdown */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Token Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Average Input Tokens per Book</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.tokenUsage.avgInputPerBook)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Average Output Tokens per Book</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.tokenUsage.avgOutputPerBook)}</p>
                </div>
              </div>
            </div>

            {/* Most Expensive Books */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold">Most Expensive Evaluations</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Tokens</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.expensiveBooks.map((book) => (
                    <tr key={book.bookId}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{book.title}</div>
                        <div className="text-sm text-gray-500">{book.bookId.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {formatCost(book.cost)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatNumber(book.tokens)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost Trend Chart (Simple Text Version) */}
            {analytics.costTrend.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-xl font-semibold mb-4">Cost Trend</h3>
                <div className="space-y-2">
                  {analytics.costTrend.slice(0, 10).map((trend) => (
                    <div key={trend.date} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{new Date(trend.date).toLocaleDateString()}</span>
                      <span className="font-medium text-gray-900">{formatCost(trend.cost)}</span>
                      <span className="text-gray-500">({trend.count} evaluations)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
