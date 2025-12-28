'use client';

import React, { useState, useEffect } from 'react';
import { organizationApi, OrganizationFilters } from '@/lib/api';
import { AddExternalOrganizationForm } from './AddExternalOrganizationForm';

interface ExternalOrganizationsListProps {
  onBack: () => void;
  backButtonText: string;
  title?: string;
  description?: string;
  filterByOrganization?: boolean;
  showAddButton?: boolean;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  organizationTypes?: string[];
  specialtyTags?: string[];
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: string;
  recommendationNote?: string;
  organizationAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isExternal: boolean;
}

export function ExternalOrganizationsList({
  onBack,
  backButtonText,
  title = 'External Organizations',
  description = 'Manage external organization referrals and connections',
  filterByOrganization = false,
  showAddButton = false,
}: ExternalOrganizationsListProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrganizationFilters>({
    search: '',
    take: 20,
    skip: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        setLoading(true);
        setError(null);

        // Always filter to external organizations only (this is ExternalOrganizationsList after all)
        // filterByOrganization controls whether to filter by user's organization
        const apiFilters = {
          ...filters,
          externalOnly: true,
        };

        const response = await organizationApi.browse(apiFilters);

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view organizations');
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
  }, [filters, filterByOrganization]);

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, skip: 0 });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingOrg(null);
    // Refetch organizations
    fetchOrganizations();
  };

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always filter to external organizations only (this is ExternalOrganizationsList after all)
      // filterByOrganization controls whether to filter by user's organization
      const apiFilters = {
        ...filters,
        externalOnly: true,
      };

      const response = await organizationApi.browse(apiFilters);

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view organizations');
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
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setShowForm(true);
  };

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>
          {showAddButton && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add External Organization
            </button>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <AddExternalOrganizationForm
          onClose={() => {
            setShowForm(false);
            setEditingOrg(null);
          }}
          onSuccess={handleFormSuccess}
          editingOrg={editingOrg ? {
            id: editingOrg.id,
            name: editingOrg.name,
            organizationTypes: editingOrg.organizationTypes || [],
            specialtyTags: editingOrg.specialtyTags || [],
            street: editingOrg.organizationAddress?.street || '',
            city: editingOrg.organizationAddress?.city || editingOrg.city || '',
            state: editingOrg.organizationAddress?.state || editingOrg.state || '',
            zipCode: editingOrg.organizationAddress?.zipCode || editingOrg.zipCode || '',
            country: editingOrg.organizationAddress?.country || 'USA',
            phone: editingOrg.phone || '',
            email: editingOrg.email || '',
            website: editingOrg.website || '',
            hours: editingOrg.hours || '',
            recommendationNote: editingOrg.recommendationNote || '',
          } : undefined}
        />
      )}

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
                <div className="flex gap-2 items-center">
                  {showAddButton && org.isExternal && (
                    <button
                      onClick={() => handleEditOrg(org)}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {org.isExternal && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      External
                    </span>
                  )}
                </div>
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Organizations Found
          </h2>
          <p className="text-gray-600">
            {filters.search
              ? 'Try adjusting your search terms'
              : filterByOrganization
              ? 'Your organization has not added any external organizations yet'
              : 'No organizations are currently available'}
          </p>
        </div>
      )}
    </div>
  );
}
