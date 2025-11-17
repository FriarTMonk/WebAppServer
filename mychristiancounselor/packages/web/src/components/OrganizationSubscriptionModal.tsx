'use client';

import React, { useState } from 'react';

interface OrganizationSubscriptionModalProps {
  organization: {
    id: string;
    name: string;
    maxMembers: number;
    licenseStatus: string;
    licenseType?: string | null;
    licenseExpiresAt?: Date | string | null;
    currentMemberCount?: number;
  } | null;
  onClose: () => void;
  onUpdateSubscription: (organizationId: string, subscriptionData: {
    maxMembers?: number;
    licenseStatus?: string;
    licenseType?: string;
    licenseExpiresAt?: string | null;
  }) => Promise<void>;
}

export function OrganizationSubscriptionModal({
  organization,
  onClose,
  onUpdateSubscription,
}: OrganizationSubscriptionModalProps) {
  const [maxMembers, setMaxMembers] = useState<number>(organization?.maxMembers || 10);
  const [licenseStatus, setLicenseStatus] = useState<string>(organization?.licenseStatus || 'trial');
  const [licenseType, setLicenseType] = useState<string>(organization?.licenseType || '');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string>(
    organization?.licenseExpiresAt
      ? new Date(organization.licenseExpiresAt).toISOString().split('T')[0]
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!organization) return null;

  const handleUpdateSubscription = async () => {
    // Validation: maxMembers must not be less than current member count
    if (organization.currentMemberCount && maxMembers < organization.currentMemberCount) {
      setError(
        `Cannot set max members to ${maxMembers}. Organization currently has ${organization.currentMemberCount} members.`
      );
      return;
    }

    if (maxMembers < 1) {
      setError('Max members must be at least 1');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onUpdateSubscription(organization.id, {
        maxMembers,
        licenseStatus,
        licenseType: licenseType || undefined,
        licenseExpiresAt: licenseExpiresAt || null,
      });
      setSuccessMessage('Organization subscription updated successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Manage Organization Subscription</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Organization Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Organization Information</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span> {organization.name}
              </p>
              {organization.currentMemberCount !== undefined && (
                <p>
                  <span className="font-medium">Current Members:</span> {organization.currentMemberCount}
                </p>
              )}
              <p>
                <span className="font-medium">Current Max Members:</span> {organization.maxMembers}
              </p>
              <p>
                <span className="font-medium">Current License Status:</span>{' '}
                <span className={`font-semibold ${
                  organization.licenseStatus === 'active' ? 'text-green-600' :
                  organization.licenseStatus === 'trial' ? 'text-blue-600' :
                  organization.licenseStatus === 'expired' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {organization.licenseStatus}
                </span>
              </p>
              {organization.licenseType && (
                <p>
                  <span className="font-medium">Current License Type:</span> {organization.licenseType}
                </p>
              )}
              {organization.licenseExpiresAt && (
                <p>
                  <span className="font-medium">Current Expiration:</span>{' '}
                  {new Date(organization.licenseExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Platform Admin Notice */}
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800 font-medium">
              Platform Admin Only: Manual Subscription Management
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Set subscription limits without payment processing
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {/* Subscription Controls */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Update Subscription Settings</h3>

            {/* Max Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Members (Subscription Seats)
              </label>
              <input
                type="number"
                min="1"
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              {organization.currentMemberCount !== undefined && (
                <p className="text-xs text-gray-600 mt-1">
                  Must be at least {organization.currentMemberCount} (current member count)
                </p>
              )}
            </div>

            {/* License Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Status
              </label>
              <select
                value={licenseStatus}
                onChange={(e) => setLicenseStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* License Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Type
              </label>
              <select
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">No Type</option>
                <option value="Family">Family</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {/* License Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Expiration Date
              </label>
              <input
                type="date"
                value={licenseExpiresAt}
                onChange={(e) => setLicenseExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-600 mt-1">
                Leave empty for no expiration
              </p>
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateSubscription}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Updating Subscription...' : 'Update Organization Subscription'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
