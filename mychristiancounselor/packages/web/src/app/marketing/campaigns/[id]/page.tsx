'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignStatusBadge } from '../../../../components/marketing/CampaignStatusBadge';
import { showToast } from '../../../../components/Toast';

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
}

interface Recipient {
  id: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  repliedAt: string | null;
  convertedAt: string | null;
  conversionType: string | null;
  prospectContact: ProspectContact;
  prospect: Prospect;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  recipients: Recipient[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Metrics {
  totalRecipients: number;
  sent: number;
  sentRate: number;
  bounced: number;
  bounceRate: number;
  opened: number;
  openRate: number;
  clicked: number;
  clickRate: number;
  replied: number;
  replyRate: number;
  converted: number;
  conversionRate: number;
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<'html' | 'text'>('html');

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/marketing/campaigns/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/login?redirect=/marketing/campaigns');
          return;
        }
        if (response.status === 404) {
          setError('Campaign not found');
          return;
        }
        throw new Error('Failed to fetch campaign');
      }

      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const calculateMetrics = (): Metrics => {
    if (!campaign) {
      return {
        totalRecipients: 0,
        sent: 0,
        sentRate: 0,
        bounced: 0,
        bounceRate: 0,
        opened: 0,
        openRate: 0,
        clicked: 0,
        clickRate: 0,
        replied: 0,
        replyRate: 0,
        converted: 0,
        conversionRate: 0,
      };
    }

    const total = campaign.recipients.length;
    const sent = campaign.recipients.filter(r => r.sentAt).length;
    const bounced = campaign.recipients.filter(r => r.bouncedAt).length;
    const opened = campaign.recipients.filter(r => r.openedAt).length;
    const clicked = campaign.recipients.filter(r => r.clickedAt).length;
    const replied = campaign.recipients.filter(r => r.repliedAt).length;
    const converted = campaign.recipients.filter(r => r.convertedAt).length;

    return {
      totalRecipients: total,
      sent,
      sentRate: total > 0 ? (sent / total) * 100 : 0,
      bounced,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      opened,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clicked,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      replied,
      replyRate: sent > 0 ? (replied / sent) * 100 : 0,
      converted,
      conversionRate: sent > 0 ? (converted / sent) * 100 : 0,
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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

  const handleSendNow = async () => {
    if (!campaign) return;

    if (!confirm('Are you sure you want to send this campaign now?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/marketing/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to send campaign');
      }

      showToast('Campaign sent successfully', 'success');
      fetchCampaign();
    } catch (error) {
      console.error('Error sending campaign:', error);
      showToast(error instanceof Error ? error.message : 'Failed to send campaign', 'error');
    }
  };

  const handleCancel = async () => {
    if (!campaign) return;

    if (!confirm('Are you sure you want to cancel this scheduled campaign?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/marketing/campaigns/${campaign.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel campaign');
      }

      showToast('Campaign cancelled successfully', 'success');
      fetchCampaign();
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      showToast(error instanceof Error ? error.message : 'Failed to cancel campaign', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading campaign...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Campaign not found'}</p>
          <button
            onClick={() => router.push('/marketing/campaigns')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/marketing/campaigns')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaigns
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="mt-2 text-sm text-gray-600">{campaign.subject}</p>
              <div className="mt-3 flex items-center gap-3">
                <CampaignStatusBadge status={campaign.status} />
                {campaign.sentAt && (
                  <span className="text-sm text-gray-500">
                    Sent {formatDateTime(campaign.sentAt)}
                  </span>
                )}
                {campaign.scheduledFor && campaign.status === 'scheduled' && (
                  <span className="text-sm text-gray-500">
                    Scheduled for {formatDateTime(campaign.scheduledFor)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {campaign.status === 'draft' && (
                <>
                  <button
                    onClick={() => router.push(`/marketing/campaigns/${campaign.id}/edit`)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleSendNow}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send Now
                  </button>
                </>
              )}
              {campaign.status === 'scheduled' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Recipients</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.totalRecipients}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Sent</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.sent}</p>
            <p className="text-sm text-gray-500">{metrics.sentRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Bounced</h3>
            <p className="mt-2 text-3xl font-semibold text-red-600">{metrics.bounced}</p>
            <p className="text-sm text-gray-500">{metrics.bounceRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Opened</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">{metrics.opened}</p>
            <p className="text-sm text-gray-500">{metrics.openRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Clicked</h3>
            <p className="mt-2 text-3xl font-semibold text-blue-600">{metrics.clicked}</p>
            <p className="text-sm text-gray-500">{metrics.clickRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Replied</h3>
            <p className="mt-2 text-3xl font-semibold text-purple-600">{metrics.replied}</p>
            <p className="text-sm text-gray-500">{metrics.replyRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Converted</h3>
            <p className="mt-2 text-3xl font-semibold text-yellow-600">{metrics.converted}</p>
            <p className="text-sm text-gray-500">{metrics.conversionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Recipients Table */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recipients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Replied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Converted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaign.recipients.map((recipient) => (
                  <tr key={recipient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {recipient.prospectContact.name}
                          {recipient.prospectContact.isPrimary && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500">{recipient.prospectContact.email}</div>
                        <div className="text-xs text-gray-400">{recipient.prospect.organizationName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(recipient.status)}`}>
                        {recipient.status}
                      </span>
                      {recipient.bouncedAt && recipient.bounceReason && (
                        <div className="text-xs text-red-600 mt-1">{recipient.bounceReason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recipient.sentAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recipient.openedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recipient.clickedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(recipient.repliedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipient.convertedAt ? (
                        <div>
                          <div>{formatDate(recipient.convertedAt)}</div>
                          {recipient.conversionType && (
                            <div className="text-xs text-gray-500">{recipient.conversionType}</div>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Preview */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview('html')}
                  className={`px-3 py-1 text-sm rounded ${
                    showPreview === 'html'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setShowPreview('text')}
                  className={`px-3 py-1 text-sm rounded ${
                    showPreview === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-500">Subject: </span>
              <span className="text-sm text-gray-900">{campaign.subject}</span>
            </div>
            {showPreview === 'html' ? (
              <div className="border border-gray-300 rounded p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: campaign.htmlBody }} />
              </div>
            ) : (
              <div className="border border-gray-300 rounded p-4 bg-gray-50 font-mono text-sm whitespace-pre-wrap">
                {campaign.textBody}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
