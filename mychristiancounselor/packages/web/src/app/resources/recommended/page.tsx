'use client';

import { useRouter } from 'next/navigation';

export default function RecommendedForMePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/home')}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to App
          </button>
          <h1 className="text-2xl font-bold text-gray-900">📖 Recommended for You</h1>
          <p className="text-sm text-gray-600 mt-1">
            Personalized book suggestions based on your spiritual journey
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">How Recommendations Work</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Based on topics discussed in your counseling sessions</li>
            <li>• Aligned with books in your reading list</li>
            <li>• Informed by your spiritual growth patterns</li>
            <li>• Endorsed by your organization's recommendations</li>
          </ul>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Building Your Recommendations</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            As you have counseling conversations and add books to your reading list,
            our AI will suggest books tailored to your specific spiritual journey and needs.
          </p>
          <p className="text-sm text-gray-500">
            AI-powered recommendations feature is in development.
          </p>
        </div>
      </div>
    </div>
  );
}
