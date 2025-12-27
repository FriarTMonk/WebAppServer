'use client';

import { useState } from 'react';

export default function BrowseOrganizationsPage() {
  const [filters] = useState({
    location: '',
    type: 'all',
    distance: '5',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Organizations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Discover churches, counseling centers, and support services in your area
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                disabled
                placeholder="ZIP code or city (Coming soon)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
              >
                <option value="all">All Types (Coming soon)</option>
                <option value="church">Church</option>
                <option value="counseling">Counseling Center</option>
                <option value="crisis">Crisis Service</option>
                <option value="support">Support Group</option>
              </select>
            </div>

            {/* Distance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  disabled
                  min="1"
                  max="50"
                  className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-not-allowed"
                />
                <span className="text-sm text-gray-500 min-w-fit">
                  {filters.distance} miles
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21l-7-5m0 0l-7 5m7-5v-2.586a1 1 0 00-1-1H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-6a1 1 0 00-1 1v2.586z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Directory Coming Soon
          </h2>

          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            We're building a comprehensive directory of churches, counseling centers, and support services. This feature will be available soon!
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
            <h3 className="font-semibold text-blue-900 mb-2">What's Coming:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Search organizations by location and type</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>View contact information and services offered</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Request connections with local organizations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Distance-based filtering and mapping</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            In the meantime, contact your organization administrator for information about connected services.
          </p>
        </div>
      </div>
    </div>
  );
}
