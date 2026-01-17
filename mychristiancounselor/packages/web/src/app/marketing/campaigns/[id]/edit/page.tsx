'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ProspectSelector } from '../../../../../components/marketing/ProspectSelector';
import { showToast } from '../../../../../components/Toast';

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlBody: '',
    textBody: '',
    prospectContactIds: [] as string[],
    scheduleType: 'now' as 'now' | 'later',
    scheduledFor: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const response = await fetch(`${apiUrl}/marketing/campaigns/${id}`, {
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
          showToast('Campaign not found', 'error');
          router.push('/marketing/campaigns');
          return;
        }
        throw new Error('Failed to fetch campaign');
      }

      const campaign = await response.json();

      // Only allow editing draft campaigns
      if (campaign.status !== 'draft') {
        showToast('Only draft campaigns can be edited', 'error');
        router.push(`/marketing/campaigns/${id}`);
        return;
      }

      // Populate form with campaign data
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        htmlBody: campaign.htmlBody,
        textBody: campaign.textBody,
        prospectContactIds: campaign.recipients.map((r: any) => r.prospectContact.id),
        scheduleType: campaign.scheduledFor ? 'later' : 'now',
        scheduledFor: campaign.scheduledFor ? new Date(campaign.scheduledFor).toISOString().slice(0, 16) : '',
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      showToast(error instanceof Error ? error.message : 'Failed to fetch campaign', 'error');
      router.push('/marketing/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    if (!formData.htmlBody.trim()) {
      newErrors.htmlBody = 'Email HTML body is required';
    }

    if (!formData.textBody.trim()) {
      newErrors.textBody = 'Email text body is required';
    }

    if (formData.prospectContactIds.length === 0) {
      newErrors.prospectContactIds = 'At least one recipient contact is required';
    }

    if (formData.scheduleType === 'later' && !formData.scheduledFor) {
      newErrors.scheduledFor = 'Scheduled date/time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        subject: formData.subject,
        htmlBody: formData.htmlBody,
        textBody: formData.textBody,
        prospectContactIds: formData.prospectContactIds,
      };

      // Add scheduledFor if scheduling
      if (formData.scheduleType === 'later' && formData.scheduledFor) {
        payload.scheduledFor = new Date(formData.scheduledFor).toISOString();
      }

      // Update the campaign
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
      const response = await fetch(`${apiUrl}/marketing/campaigns/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update campaign');
      }

      showToast('Campaign updated successfully', 'success');
      router.push(`/marketing/campaigns/${id}`);
    } catch (error) {
      console.error('Error updating campaign:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/marketing/campaigns/${id}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaign
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update your email campaign details
          </p>
        </div>

        <div className="space-y-6">
          {/* Campaign Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Q1 2024 Outreach"
                  disabled={submitting}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Discover Our Christian Counseling Platform"
                  disabled={submitting}
                />
                {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Email Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.htmlBody}
                  onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                  rows={8}
                  className={`w-full px-4 py-2 border rounded-lg font-mono text-sm ${errors.htmlBody ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="<html>...</html>"
                  disabled={submitting}
                />
                {errors.htmlBody && <p className="text-red-500 text-sm mt-1">{errors.htmlBody}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  HTML version of your email. Use standard HTML tags.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plain Text Email Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.textBody}
                  onChange={(e) => setFormData({ ...formData, textBody: e.target.value })}
                  rows={8}
                  className={`w-full px-4 py-2 border rounded-lg ${errors.textBody ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Plain text version of your email..."
                  disabled={submitting}
                />
                {errors.textBody && <p className="text-red-500 text-sm mt-1">{errors.textBody}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Plain text version for email clients that don't support HTML.
                </p>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recipients <span className="text-red-500">*</span>
            </h2>
            {errors.prospectContactIds && (
              <p className="text-red-500 text-sm mb-4">{errors.prospectContactIds}</p>
            )}
            <ProspectSelector
              selectedContactIds={formData.prospectContactIds}
              onChange={(contactIds) => setFormData({ ...formData, prospectContactIds: contactIds })}
            />
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduling</h2>

            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={formData.scheduleType === 'now'}
                    onChange={() => setFormData({ ...formData, scheduleType: 'now', scheduledFor: '' })}
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700">Send Immediately</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={formData.scheduleType === 'later'}
                    onChange={() => setFormData({ ...formData, scheduleType: 'later' })}
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700">Schedule for Later</span>
                </label>
              </div>

              {formData.scheduleType === 'later' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                    className={`px-4 py-2 border rounded-lg ${errors.scheduledFor ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={submitting}
                  />
                  {errors.scheduledFor && <p className="text-red-500 text-sm mt-1">{errors.scheduledFor}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push(`/marketing/campaigns/${id}`)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
