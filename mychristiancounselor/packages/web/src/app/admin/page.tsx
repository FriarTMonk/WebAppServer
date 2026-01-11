'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { PlatformMetrics } from '@mychristiancounselor/shared';
import { api } from '../../lib/api';

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

  // Cleanup state
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Session check state
  const [showSessionCheckDialog, setShowSessionCheckDialog] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(false);
  const [sessionCheckResults, setSessionCheckResults] = useState<any>(null);
  const [sessionCheckEmails, setSessionCheckEmails] = useState('');

  const handleCleanupSessions = useCallback(async () => {
    // Confirmation dialog
    if (!confirm(
      'Are you sure you want to clean up stale sessions?\n\n' +
      'This will:\n' +
      '• Delete all expired refresh tokens\n' +
      '• Delete anonymous sessions older than 7 days\n' +
      '• Preserve all authenticated user conversation history\n\n' +
      'This action cannot be undone.'
    )) {
      return;
    }

    try {
      setCleanupLoading(true);
      setError(null);

      const response = await api.post('/admin/system/cleanup-sessions');

      if (response.data) {
        const { expiredTokensCount, anonymousSessionsCount, totalCleaned } = response.data;
        alert(
          `Cleanup Successful!\n\n` +
          `• Expired tokens removed: ${expiredTokensCount}\n` +
          `• Anonymous sessions removed: ${anonymousSessionsCount}\n` +
          `• Total items cleaned: ${totalCleaned}`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Cleanup failed: ${errorMessage}`);
      alert(`Cleanup failed: ${errorMessage}`);
    } finally {
      setCleanupLoading(false);
    }
  }, []);

  const handleCheckSessions = useCallback(async () => {
    try {
      setSessionCheckLoading(true);
      setError(null);

      // Parse emails from comma-separated string (optional)
      const emails = sessionCheckEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // If no emails provided, fetch all users, otherwise fetch specific users
      const requestBody = emails.length > 0 ? { emails } : {};

      const response = await api.post('/admin/system/check-user-sessions', requestBody);

      if (response.data) {
        setSessionCheckResults(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Session check failed: ${errorMessage}`);
      alert(`Session check failed: ${errorMessage}`);
    } finally {
      setSessionCheckLoading(false);
    }
  }, [sessionCheckEmails]);

  return (
    <AdminLayout>
      <div>
        <BackButton />
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

        {/* Performance Metrics Section */}
        {metrics && metrics.performance && (
          <div className="bg-white p-6 rounded-lg shadow" data-tour="performance-metrics">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Uptime Card */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Uptime</p>
                <p className="text-2xl font-bold text-green-800">
                  {metrics.performance.uptimePercentage.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.floor(metrics.performance.uptimeSeconds / 3600)}h {Math.floor((metrics.performance.uptimeSeconds % 3600) / 60)}m
                </p>
              </div>

              {/* Response Time Card */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-800">
                  {metrics.performance.avgResponseTimeMs}ms
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Average API response
                </p>
              </div>

              {/* Requests Card */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-purple-800">
                  {metrics.performance.totalRequests.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.performance.requestsPerMinute} req/min
                </p>
              </div>

              {/* Error Rate Card */}
              <div className={`p-4 border rounded-lg ${
                metrics.performance.errorRate > 5
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-sm text-gray-600 mb-1">Error Rate</p>
                <p className={`text-2xl font-bold ${
                  metrics.performance.errorRate > 5 ? 'text-red-800' : 'text-gray-800'
                }`}>
                  {metrics.performance.errorRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  4xx and 5xx responses
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Metrics Section */}
        {metrics && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Subscription Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Active Users Card */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-tour="active-users-card">
                <p className="text-sm text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-blue-800">{metrics.activeUsers.total}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Individual: {metrics.activeUsers.individual}</p>
                  <p>Organization: {metrics.activeUsers.organization}</p>
                </div>
              </div>

              {/* Total Users Card */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg" data-tour="total-users-card">
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-green-800">{metrics.totalUsers}</p>
              </div>

              {/* Organizations Card */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg" data-tour="organizations-card">
                <p className="text-sm text-gray-600 mb-1">Organizations</p>
                <p className="text-3xl font-bold text-purple-800">{metrics.organizations.total}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Trial: {metrics.organizations.trial}</p>
                  <p>Active: {metrics.organizations.active}</p>
                  <p>Expired: {metrics.organizations.expired}</p>
                </div>
              </div>

              {/* Last Updated Card */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(metrics.timestamp).toLocaleString()}
                </p>
                <button
                  onClick={fetchMetrics}
                  className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  data-tour="refresh-button"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales Performance Section */}
        {metrics && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow" data-tour="sales-metrics">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sales Performance</h2>
              <Link
                href="/admin/sales"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Sales Queue →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Pipeline Value Card */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-indigo-800">
                  ${((metrics.salesMetrics?.pipelineValue || 0) / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Weighted opportunities
                </p>
              </div>

              {/* Active Opportunities Card */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active Opps</p>
                <p className="text-2xl font-bold text-blue-800">
                  {metrics.salesMetrics?.activeOpportunities || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  In pipeline
                </p>
              </div>

              {/* Average Deal Size Card */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Deal Size</p>
                <p className="text-2xl font-bold text-green-800">
                  ${((metrics.salesMetrics?.avgDealSize || 0) / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last 90 days
                </p>
              </div>

              {/* Win Rate Card */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-purple-800">
                  {(metrics.salesMetrics?.winRate || 0).toFixed(0)}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{ width: `${metrics.salesMetrics?.winRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Average Sales Cycle Card */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Cycle</p>
                <p className="text-2xl font-bold text-orange-800">
                  {metrics.salesMetrics?.avgSalesCycle || 0}d
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Time to close
                </p>
              </div>

              {/* Forecasted Revenue Card */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Forecast</p>
                <p className="text-2xl font-bold text-teal-800">
                  ${((metrics.salesMetrics?.forecastedRevenue || 0) / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Campaigns Section */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Marketing Campaigns</h2>
            <Link
              href="/marketing"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Marketing Dashboard →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Prospects Card */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Prospects</p>
              <p className="text-2xl font-bold text-indigo-800">
                {metrics?.marketingMetrics?.totalProspects || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Active organizations
              </p>
            </div>

            {/* Campaigns Card */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Campaigns</p>
              <p className="text-2xl font-bold text-blue-800">
                {metrics?.marketingMetrics?.totalCampaigns || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics?.marketingMetrics?.activeCampaigns || 0} active
              </p>
            </div>

            {/* Campaign Performance Card */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Open Rate</p>
              <p className="text-2xl font-bold text-green-800">
                {(metrics?.marketingMetrics?.avgOpenRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Last 30 days
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <p>Manage prospect outreach and track campaign performance. Create targeted email campaigns and monitor engagement metrics.</p>
          </div>
        </div>

        {/* Support Metrics Section */}
        {metrics && metrics.slaHealth && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow" data-tour="sla-health">
            <h2 className="text-xl font-semibold mb-4">Support Metrics</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Breached SLAs */}
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600 font-semibold">Breached</p>
                <p className="text-2xl font-bold text-red-800">
                  {metrics.slaHealth.breachedResponse + metrics.slaHealth.breachedResolution}
                </p>
                <p className="text-xs text-red-600">
                  {metrics.slaHealth.breachedResponse} response, {metrics.slaHealth.breachedResolution} resolution
                </p>
              </div>

              {/* Critical SLAs */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm text-orange-600 font-semibold">Critical</p>
                <p className="text-2xl font-bold text-orange-800">
                  {metrics.slaHealth.criticalResponse + metrics.slaHealth.criticalResolution}
                </p>
                <p className="text-xs text-orange-600">
                  {metrics.slaHealth.criticalResponse} response, {metrics.slaHealth.criticalResolution} resolution
                </p>
              </div>
            </div>

            {/* Compliance Rates */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 font-semibold mb-3">
                SLA Compliance (Last 30 Days)
              </p>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall</span>
                    <span className="font-semibold">{metrics.slaHealth.complianceRate.overall}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metrics.slaHealth.complianceRate.overall}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Response SLA</span>
                    <span className="font-semibold">{metrics.slaHealth.complianceRate.response}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${metrics.slaHealth.complianceRate.response}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Resolution SLA</span>
                    <span className="font-semibold">{metrics.slaHealth.complianceRate.resolution}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${metrics.slaHealth.complianceRate.resolution}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Link to tickets */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href="/admin/support?slaFilter=breached"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View breached tickets →
              </Link>
            </div>
          </div>
        )}

        {/* System Maintenance Section */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">System Maintenance</h2>

          {/* Clean Up Stale Sessions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  Clean Up Stale Sessions
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Remove expired refresh tokens and old anonymous sessions to free up database space.
                </p>
                <ul className="text-xs text-gray-500 space-y-1 mb-3">
                  <li>• Deletes expired refresh tokens (past expiration date)</li>
                  <li>• Deletes anonymous sessions older than 7 days</li>
                  <li>• Preserves all authenticated user conversation history</li>
                </ul>
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 inline-block">
                  ⚠ This action cannot be undone
                </p>
              </div>

              <button
                onClick={handleCleanupSessions}
                disabled={cleanupLoading}
                className={`ml-4 px-4 py-2 rounded font-medium ${
                  cleanupLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {cleanupLoading ? 'Cleaning...' : 'Run Cleanup'}
              </button>
            </div>
          </div>

          {/* Check User Sessions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  Check User Sessions
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Diagnostic tool to check session status for specific users.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• View user account details and status</li>
                  <li>• Check refresh token validity</li>
                  <li>• View active counseling sessions</li>
                  <li>• Displays session timeout configuration</li>
                </ul>
              </div>

              <button
                onClick={() => setShowSessionCheckDialog(true)}
                className="ml-4 px-4 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Check Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Session Check Dialog */}
        {showSessionCheckDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Check User Sessions</h3>
                <button
                  onClick={() => {
                    setShowSessionCheckDialog(false);
                    setSessionCheckResults(null);
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Input Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Email (optional, comma-separated)
                  </label>
                  <textarea
                    value={sessionCheckEmails}
                    onChange={(e) => setSessionCheckEmails(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Leave empty to show all users, or enter emails: user1@example.com, user2@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to view all users (max 100), or enter specific email addresses to filter
                  </p>
                  <button
                    onClick={handleCheckSessions}
                    disabled={sessionCheckLoading}
                    className={`mt-3 px-4 py-2 rounded font-medium ${
                      sessionCheckLoading
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {sessionCheckLoading ? 'Checking...' : 'Run Check'}
                  </button>
                </div>

                {/* Results Section */}
                {sessionCheckResults && (
                  <div className="space-y-6">
                    {/* Results Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-1">Results Summary</h4>
                      <p className="text-sm">
                        Showing {sessionCheckResults.totalResults} user{sessionCheckResults.totalResults !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Checked at: {new Date(sessionCheckResults.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {/* Configuration */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Session Configuration</h4>
                      <div className="text-sm space-y-1">
                        <p>JWT Access Token: {sessionCheckResults.configuration.jwtAccessTokenExpiration}</p>
                        <p>Refresh Token: {sessionCheckResults.configuration.refreshTokenExpiration}</p>
                        <p>Session Timeout: {sessionCheckResults.configuration.sessionTimeoutMinutes} minutes</p>
                      </div>
                    </div>

                    {/* User Results */}
                    {sessionCheckResults.results.map((result: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-lg mb-3 flex items-center">
                          {result.found ? (
                            <span className="text-green-600">✓ {result.email}</span>
                          ) : (
                            <span className="text-red-600">✗ {result.email}</span>
                          )}
                        </h4>

                        {result.found ? (
                          <div className="space-y-4">
                            {/* User Info */}
                            <div>
                              <h5 className="font-medium text-sm text-gray-700 mb-1">User Information</h5>
                              <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                                <p><span className="font-medium">Name:</span> {result.user.name}</p>
                                <p><span className="font-medium">ID:</span> {result.user.id}</p>
                                <p><span className="font-medium">Account Type:</span> {result.user.accountType}</p>
                                <p><span className="font-medium">Email Verified:</span> {result.user.emailVerified ? 'Yes' : 'No'}</p>
                                <p><span className="font-medium">Active:</span> {result.user.isActive ? 'Yes' : 'No'}</p>
                                <p><span className="font-medium">Subscription:</span> {result.user.subscriptionStatus} ({result.user.subscriptionTier || 'none'})</p>
                                <p><span className="font-medium">Created:</span> {new Date(result.user.createdAt).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Refresh Tokens */}
                            <div>
                              <h5 className="font-medium text-sm text-gray-700 mb-1">
                                Refresh Tokens ({result.refreshTokens.valid} valid, {result.refreshTokens.expired} expired)
                              </h5>
                              {result.refreshTokens.tokens.length === 0 ? (
                                <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                  ⚠ No refresh tokens found - user may not be logged in
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {result.refreshTokens.tokens.map((token: any, tidx: number) => (
                                    <div
                                      key={tidx}
                                      className={`text-xs p-2 rounded ${
                                        token.isExpired
                                          ? 'bg-red-50 border border-red-200'
                                          : 'bg-green-50 border border-green-200'
                                      }`}
                                    >
                                      <p className="font-medium">
                                        {token.isExpired ? '❌ EXPIRED' : '✅ VALID'}
                                      </p>
                                      <p>Created: {new Date(token.createdAt).toLocaleString()}</p>
                                      <p>Expires: {new Date(token.expiresAt).toLocaleString()}</p>
                                      {token.ipAddress && <p>IP: {token.ipAddress}</p>}
                                      {token.userAgent && <p>User Agent: {token.userAgent}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Active Sessions */}
                            <div>
                              <h5 className="font-medium text-sm text-gray-700 mb-1">
                                Active Sessions ({result.activeSessions.total})
                              </h5>
                              {result.activeSessions.sessions.length === 0 ? (
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  No active sessions
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {result.activeSessions.sessions.map((session: any, sidx: number) => (
                                    <div key={sidx} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                                      <p className="font-medium">{session.title}</p>
                                      <p>ID: {session.id}</p>
                                      <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
                                      <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-red-600">{result.message}</p>
                        )}
                      </div>
                    ))}

                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                      <p className="font-medium mb-1">Note:</p>
                      <p>
                        The JWT access token expires after 15 minutes. If the user does not use the refresh
                        token to get a new access token, they will see a session timeout error on their next
                        API call.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
