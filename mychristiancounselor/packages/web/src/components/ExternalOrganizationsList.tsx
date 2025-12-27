'use client';

import React from 'react';

interface ExternalOrganizationsListProps {
  onBack: () => void;
  backButtonText: string;
  title?: string;
  description?: string;
  filterByOrganization?: boolean;
}

export function ExternalOrganizationsList({
  onBack,
  backButtonText,
  title = 'External Organizations',
  description = 'Manage external organization referrals and connections',
  filterByOrganization = false,
}: ExternalOrganizationsListProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backButtonText}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8zm0 4a1 1 0 000 2h6a1 1 0 000-2H8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {filterByOrganization ? 'Your Endorsed Organizations' : 'Platform-Wide Organizations'}
            </h3>
            <p className="text-blue-800 mb-2">
              {filterByOrganization
                ? 'Manage external organizations that your organization recommends to members. These organizations appear in the organization directory and provide additional support and counseling referral options.'
                : 'View all external organizations across the entire platform. Each organization shows how many member organizations have endorsed or recommended it - similar to book endorsements.'}
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>External organizations are not duplicated - each appears once with an endorsement count</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Endorsement count shows how many organizations recommend this external resource</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Organizations include crisis hotlines, counseling centers, support groups, and local services</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Empty State / Coming Soon */}
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          {filterByOrganization
            ? 'Organization management features are currently being developed. You\'ll soon be able to add and manage external organization referrals and connections for your members.'
            : 'Platform-wide external organization management with endorsement tracking is currently being developed. This feature will allow you to view and manage all external organizations across the platform.'}
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left max-w-md mx-auto">
          <h4 className="font-semibold text-gray-900 mb-2">Planned Features:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>View external organizations with endorsement counts</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>See which member organizations recommend each external resource</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Filter and search organizations by type, location, and services</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Manage organization directory and quality control</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Track referral usage and connection analytics</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
