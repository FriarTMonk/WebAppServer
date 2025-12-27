'use client';

import { useRouter } from 'next/navigation';
import { useUserPermissions } from '../../../../../hooks/useUserPermissions';

export default function PendingEvaluationsPage() {
  const router = useRouter();
  const permissions = useUserPermissions();

  // Redirect if not org admin
  if (!permissions.isOrgAdmin) {
    router.push('/resources/books');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/org-admin/resources/books')}
            className="text-green-600 hover:text-green-800 text-sm font-medium mb-2"
          >
            ← Back to Endorsed Books
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Pending Evaluations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track books submitted by your organization awaiting evaluation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-4">Book Title</div>
              <div className="col-span-2">Author</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-2">Actions</div>
            </div>
          </div>

          {/* Empty State */}
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Evaluations</h3>
            <p className="text-gray-600 mb-6">
              Books submitted by your organization will appear here while they're being evaluated.
            </p>
            <button
              onClick={() => router.push('/resources/books/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add New Book
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Evaluation tracking with real-time status updates is coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
