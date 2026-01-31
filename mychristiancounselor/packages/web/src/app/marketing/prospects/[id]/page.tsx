'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProspectForm } from '../../../../components/marketing/ProspectForm';

interface ProspectContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface CampaignRecipient {
  id: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  convertedAt: string | null;
  prospectContact: ProspectContact;
  campaign: {
    id: string;
    name: string;
    subject: string;
    sentAt: string | null;
    status: string;
  };
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
  convertedToOrganization: {
    id: string;
    name: string;
  } | null;
  archivedAt: string | null;
  createdAt: string;
  contacts: ProspectContact[];
  campaignRecipients: CampaignRecipient[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProspect = async (prospectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const response = await fetch(`${apiUrl}/marketing/prospects/${prospectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/marketing/prospects');
          return;
        }
        if (response.status === 404) {
          setError('Prospect not found');
          return;
        }
        throw new Error('Failed to fetch prospect');
      }

      const data = await response.json();
      setProspect(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // In Next.js 15+, params is a Promise and must be awaited
    const loadProspect = async () => {
      const { id } = await params;
      setProspectId(id);
      fetchProspect(id);
    };
    loadProspect();
  }, [params]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading prospect...</p>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Prospect not found'}</p>
          <button
            onClick={() => router.push('/marketing/prospects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Prospects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/marketing/prospects')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Prospects
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{prospect.organizationName}</h1>
              <p className="mt-2 text-sm text-gray-600">
                {prospect.industry && `${prospect.industry} • `}
                Created {formatShortDate(prospect.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="mt-4 flex gap-2">
            {prospect.convertedAt && (
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                Converted {formatShortDate(prospect.convertedAt)}
              </span>
            )}
            {prospect.archivedAt && (
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">
                Archived
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details & Contacts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prospect.website && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {prospect.website}
                      </a>
                    </dd>
                  </div>
                )}
                {prospect.industry && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Industry</dt>
                    <dd className="mt-1 text-sm text-gray-900">{prospect.industry}</dd>
                  </div>
                )}
                {prospect.estimatedSize && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estimated Size</dt>
                    <dd className="mt-1 text-sm text-gray-900">{prospect.estimatedSize}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Campaign Sent</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatShortDate(prospect.lastCampaignSentAt)}</dd>
                </div>
                {prospect.convertedToOrganization && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Converted To</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`/admin/organizations/${prospect.convertedToOrganization.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {prospect.convertedToOrganization.name}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {prospect.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Notes</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">{prospect.notes}</dd>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contacts ({prospect.contacts.length})
              </h2>
              <div className="space-y-4">
                {prospect.contacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{contact.name}</h3>
                          {contact.isPrimary && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.title && (
                          <p className="text-xs text-gray-500 mt-1">{contact.title}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-700">
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </p>
                          {contact.phone && (
                            <p className="text-sm text-gray-700">
                              <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                                {contact.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Campaign History ({prospect.campaignRecipients.length})
              </h2>

              {prospect.campaignRecipients.length === 0 ? (
                <p className="text-sm text-gray-500">No campaigns sent yet</p>
              ) : (
                <div className="space-y-4">
                  {prospect.campaignRecipients.map((recipient) => (
                    <div key={recipient.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            <a
                              href={`/marketing/campaigns/${recipient.campaign.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {recipient.campaign.name}
                            </a>
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            To: {recipient.prospectContact.name} ({recipient.prospectContact.email})
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(recipient.status)}`}>
                          {recipient.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                        <div>
                          <span className="text-gray-500">Sent:</span>
                          <div className="text-gray-900">{formatShortDate(recipient.sentAt)}</div>
                        </div>
                        {recipient.openedAt && (
                          <div>
                            <span className="text-gray-500">Opened:</span>
                            <div className="text-gray-900">{formatShortDate(recipient.openedAt)}</div>
                          </div>
                        )}
                        {recipient.clickedAt && (
                          <div>
                            <span className="text-gray-500">Clicked:</span>
                            <div className="text-gray-900">{formatShortDate(recipient.clickedAt)}</div>
                          </div>
                        )}
                        {recipient.repliedAt && (
                          <div>
                            <span className="text-gray-500">Replied:</span>
                            <div className="text-gray-900">{formatShortDate(recipient.repliedAt)}</div>
                          </div>
                        )}
                        {recipient.convertedAt && (
                          <div>
                            <span className="text-gray-500">Converted:</span>
                            <div className="text-gray-900">{formatShortDate(recipient.convertedAt)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {prospect.createdBy.firstName} {prospect.createdBy.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(prospect.createdAt)}</dd>
                </div>
                {prospect.lastCampaignSentAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Campaign</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(prospect.lastCampaignSentAt)}</dd>
                  </div>
                )}
                {prospect.convertedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Converted At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(prospect.convertedAt)}</dd>
                  </div>
                )}
                {prospect.archivedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Archived At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(prospect.archivedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ProspectForm
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            if (prospectId) fetchProspect(prospectId);
          }}
          editingProspect={prospect}
        />
      )}
    </div>
  );
}
