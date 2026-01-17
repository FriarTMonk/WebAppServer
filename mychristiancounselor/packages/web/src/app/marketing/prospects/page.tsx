'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProspectForm } from '../../../components/marketing/ProspectForm';

// Force dynamic rendering for this page since BackButton/Breadcrumbs use searchParams
export const dynamic = 'force-dynamic';

interface ProspectContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface Prospect {
  id: string;
  organizationName: string;
  website: string | null;
  industry: string | null;
  estimatedSize: string | null;
  notes: string | null;
  lastCampaignSentAt: string | null;
  convertedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  contacts: ProspectContact[];
  _count: {
    campaignRecipients: number;
  };
}

export default function ProspectsListPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showConverted, setShowConverted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('includeArchived', showArchived.toString());
      params.append('includeConverted', showConverted.toString());

      const response = await fetch(`${apiUrl}/marketing/prospects?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/marketing/prospects');
          return;
        }
        throw new Error('Failed to fetch prospects');
      }

      const data = await response.json();
      setProspects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showArchived, showConverted, router]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const handleArchive = async (prospectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to archive this prospect?')) {
      return;
    }

    setActionLoading(prospectId);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const response = await fetch(`${apiUrl}/marketing/prospects/${prospectId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to archive prospect');
      }

      await fetchProspects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive prospect');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (prospectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to unarchive this prospect?')) {
      return;
    }

    setActionLoading(prospectId);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const response = await fetch(`${apiUrl}/marketing/prospects/${prospectId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unarchive prospect');
      }

      await fetchProspects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unarchive prospect');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (prospect: Prospect, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProspect(prospect);
  };

  const handleRowClick = (prospectId: string) => {
    router.push(`/marketing/prospects/${prospectId}`);
  };

  const getPrimaryContact = (contacts: ProspectContact[]) => {
    return contacts.find(c => c.isPrimary) || contacts[0];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const canReceiveCampaign = (lastSent: string | null) => {
    if (!lastSent) return true;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return new Date(lastSent) < ninetyDaysAgo;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton />
          <Breadcrumbs />
          <h1 className="text-3xl font-bold text-gray-900">Prospects</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage potential customer organizations and their contacts
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by organization or contact name/email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show Archived</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showConverted}
                  onChange={(e) => setShowConverted(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show Converted</span>
              </label>
            </div>

            <div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add Prospect
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">Loading prospects...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchProspects}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : prospects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No prospects found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Prospect
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Primary Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prospects.map((prospect) => {
                    const primaryContact = getPrimaryContact(prospect.contacts);
                    const eligible = canReceiveCampaign(prospect.lastCampaignSentAt);

                    return (
                      <tr
                        key={prospect.id}
                        onClick={() => handleRowClick(prospect.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {prospect.organizationName}
                          </div>
                          {prospect.industry && (
                            <div className="text-xs text-gray-500">{prospect.industry}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {primaryContact ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{primaryContact.name}</div>
                              <div className="text-gray-500">{primaryContact.email}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No contacts</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {prospect.contacts.length} contact{prospect.contacts.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(prospect.lastCampaignSentAt)}
                          </div>
                          {!eligible && (
                            <div className="text-xs text-yellow-600">90-day cooldown</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {prospect.convertedAt && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Converted
                              </span>
                            )}
                            {prospect.archivedAt && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                Archived
                              </span>
                            )}
                            {!prospect.convertedAt && !prospect.archivedAt && eligible && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Available
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => handleEdit(prospect, e)}
                              className="text-blue-600 hover:text-blue-900"
                              disabled={actionLoading === prospect.id}
                            >
                              Edit
                            </button>
                            {prospect.archivedAt ? (
                              <button
                                onClick={(e) => handleUnarchive(prospect.id, e)}
                                className="text-green-600 hover:text-green-900"
                                disabled={actionLoading === prospect.id}
                              >
                                {actionLoading === prospect.id ? 'Loading...' : 'Unarchive'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleArchive(prospect.id, e)}
                                className="text-red-600 hover:text-red-900"
                                disabled={actionLoading === prospect.id}
                              >
                                {actionLoading === prospect.id ? 'Loading...' : 'Archive'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingProspect) && (
        <ProspectForm
          onClose={() => {
            setShowCreateModal(false);
            setEditingProspect(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingProspect(null);
            fetchProspects();
          }}
          editingProspect={editingProspect || undefined}
        />
      )}
    </div>
  );
}
