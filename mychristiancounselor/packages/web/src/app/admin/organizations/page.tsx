'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { AddRegisteredOrganizationForm } from '../../../components/AddRegisteredOrganizationForm';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  licenseType: string | null;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  maxMembers: number;
  specialtyTags: string[];
  website: string | null;
  createdAt: string;
  archivedAt: string | null;
  organizationAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  _count: {
    members: number;
  };
}

export default function OrganizationsListPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('licenseStatus', statusFilter);

      const response = await fetch(`${apiUrl}/admin/organizations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        // Redirect to login on auth errors
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/admin/organizations');
          return;
        }
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, router]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleArchive = async (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to archive this organization? Members will be able to remove themselves from this organization.')) {
      return;
    }

    setActionLoading(orgId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/organizations/${orgId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to archive organization');
      }

      await fetchOrganizations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to unarchive this organization?')) {
      return;
    }

    setActionLoading(orgId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/organizations/${orgId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unarchive organization');
      }

      await fetchOrganizations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unarchive organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrg(org);
    setShowCreateModal(true);
  };

  return (
    <AdminLayout>
      <div>
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Organizations</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Organization
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading organizations...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    License Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {org.name}
                      </div>
                      {org.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {org.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.licenseStatus)}`}>
                        {org.licenseStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {org.licenseType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {org._count.members} / {org.maxMembers}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleEdit(org, e)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                        >
                          Edit
                        </button>
                        {org.licenseStatus === 'archived' ? (
                          <button
                            onClick={(e) => handleUnarchive(org.id, e)}
                            disabled={actionLoading === org.id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs"
                          >
                            {actionLoading === org.id ? 'Unarchiving...' : 'Unarchive'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleArchive(org.id, e)}
                            disabled={actionLoading === org.id}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs"
                          >
                            {actionLoading === org.id ? 'Archiving...' : 'Archive'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {organizations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No organizations found</p>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Organization Modal */}
        {showCreateModal && (
          <AddRegisteredOrganizationForm
            onClose={() => {
              setShowCreateModal(false);
              setEditingOrg(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingOrg(null);
              fetchOrganizations();
            }}
            editingOrg={editingOrg ? {
              id: editingOrg.id,
              name: editingOrg.name,
              description: editingOrg.description || '',
              ownerEmail: '', // Not needed for edit, but required by interface
              licenseType: editingOrg.licenseType || '',
              licenseStatus: editingOrg.licenseStatus,
              maxMembers: editingOrg.maxMembers,
              specialtyTags: editingOrg.specialtyTags,
              website: editingOrg.website || '',
              street: editingOrg.organizationAddress?.street || '',
              city: editingOrg.organizationAddress?.city || '',
              state: editingOrg.organizationAddress?.state || '',
              zipCode: editingOrg.organizationAddress?.zipCode || '',
              country: editingOrg.organizationAddress?.country || 'USA',
            } : undefined}
          />
        )}
      </div>
    </AdminLayout>
  );
}
