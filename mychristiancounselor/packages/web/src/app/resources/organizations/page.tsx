'use client';

import { useState, useEffect } from 'react';
import { organizationApi, OrganizationFilters } from '@/lib/api';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Organization {
  id: string;
  name: string;
  description?: string;
  organizationTypes?: string[];
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  isExternal: boolean;
}

export default function BrowseOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrganizationFilters>({
    search: '',
    take: 20,
    skip: 0,
  });

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        setLoading(true);
        setError(null);

        const response = await organizationApi.browse(filters);

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to browse organizations');
            return;
          }
          setError('Failed to load organizations');
          return;
        }

        const data = await response.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, [filters]);

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, skip: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs />
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Organizations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Discover churches, counseling centers, and support services
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Organizations
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Organizations List */}
        {!loading && !error && organizations.length > 0 && (
          <div className="space-y-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                  {org.isExternal && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      External
                    </span>
                  )}
                </div>

                {org.description && (
                  <p className="text-gray-700 mb-3">{org.description}</p>
                )}

                {org.organizationTypes && org.organizationTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {org.organizationTypes.map((type) => (
                      <span
                        key={type}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  {org.city && org.state && (
                    <p>
                      <strong>Location:</strong> {org.city}, {org.state} {org.zipCode}
                    </p>
                  )}
                  {org.phone && (
                    <p>
                      <strong>Phone:</strong>{' '}
                      <a href={`tel:${org.phone}`} className="text-blue-600 hover:underline">
                        {org.phone}
                      </a>
                    </p>
                  )}
                  {org.email && (
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href={`mailto:${org.email}`} className="text-blue-600 hover:underline">
                        {org.email}
                      </a>
                    </p>
                  )}
                  {org.website && (
                    <p>
                      <strong>Website:</strong>{' '}
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && organizations.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
              No Organizations Found
            </h2>
            <p className="text-gray-600">
              {filters.search
                ? 'Try adjusting your search terms'
                : 'No organizations are currently available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
