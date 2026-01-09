'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export default function EvaluationManagementPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Wait for permissions to load: render immediately when authorized, wait before redirecting
  useEffect(() => {
    if (permissions.isPlatformAdmin) {
      // User is confirmed as platform admin, render immediately
      setPermissionsLoading(false);
      return;
    }

    // Wait for permissions to load before deciding to redirect
    const timer = setTimeout(() => {
      setPermissionsLoading(false);
    }, 1500); // Allow time for permissions API calls to complete

    return () => clearTimeout(timer);
  }, [permissions.isPlatformAdmin]);

  // Redirect only after permissions have loaded AND user is not authorized
  useEffect(() => {
    if (!permissionsLoading && !permissions.isPlatformAdmin) {
      router.push('/resources/books');
    }
  }, [permissionsLoading, permissions.isPlatformAdmin, router]);

  // Show loading state while permissions load
  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (!permissions.isPlatformAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/admin/resources/books')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2"
          >
            ← Back to All Books
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Evaluation Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            System-level evaluation controls and analytics
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Current Framework Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Framework</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Version</p>
                <p className="text-2xl font-bold text-gray-900">v2.1</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-base text-gray-900">March 2024</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Categories</p>
                <p className="text-base text-gray-900">12 categories</p>
              </div>
            </div>
          </div>

          {/* Alignment Thresholds Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alignment Thresholds</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Premium Tier</span>
                <span className="text-base font-semibold text-green-600">≥90%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Standard Tier</span>
                <span className="text-base font-semibold text-blue-600">70-89%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Hidden Tier</span>
                <span className="text-base font-semibold text-red-600">&lt;70%</span>
              </div>
            </div>
          </div>

          {/* Evaluation Queue Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Queue</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Books Pending</p>
                <p className="text-2xl font-bold text-gray-900">Check Queue →</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-base text-gray-900">View details</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/org-admin/resources/books/pending')}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-semibold"
                >
                  View Pending Evaluations & Trigger Jobs
                </button>
              </div>
            </div>
          </div>

          {/* Cost Analytics Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Analytics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">$0.00</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Evaluations Run</p>
                <p className="text-base text-gray-900">0 this month</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Cost per Book</p>
                <p className="text-base text-gray-900">~$0.05</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Management Features */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Advanced Management Features</h2>
          <p className="text-sm text-blue-800 mb-4">
            Access advanced evaluation management tools:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/admin/evaluation/frameworks')}
              className="flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:border-blue-500 transition-colors text-left"
            >
              <div>
                <div className="font-semibold text-blue-900 text-sm">Framework Management</div>
                <div className="text-xs text-blue-700">Update evaluation criteria and thresholds</div>
              </div>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => router.push('/admin/evaluation/bulk-re-evaluate')}
              className="flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:border-blue-500 transition-colors text-left"
            >
              <div>
                <div className="font-semibold text-blue-900 text-sm">Bulk Re-evaluation</div>
                <div className="text-xs text-blue-700">Trigger re-evaluation of all books</div>
              </div>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => router.push('/admin/evaluation/queue')}
              className="flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:border-blue-500 transition-colors text-left"
            >
              <div>
                <div className="font-semibold text-blue-900 text-sm">Queue Monitoring</div>
                <div className="text-xs text-blue-700">Real-time evaluation job status</div>
              </div>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => router.push('/admin/evaluation/costs')}
              className="flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:border-blue-500 transition-colors text-left"
            >
              <div>
                <div className="font-semibold text-blue-900 text-sm">Cost Analytics</div>
                <div className="text-xs text-blue-700">Detailed API cost tracking</div>
              </div>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
