'use client';

import React, { useState } from 'react';
import { AdminOrganizationMember } from '@mychristiancounselor/shared';

interface UserManagementModalProps {
  member: AdminOrganizationMember | null;
  organizationId: string;
  isPlatformAdmin?: boolean;
  availableRoles: Array<{ id: string; name: string }>;
  userSubscription?: {
    subscriptionStatus: string;
    subscriptionTier?: string | null;
  };
  onClose: () => void;
  onUpdateRole: (userId: string, newRoleId: string) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  onMorph: (userId: string) => Promise<void>;
  onRelease?: (userId: string) => Promise<void>;
  onUpdateSubscription?: (userId: string, subscriptionData: {
    subscriptionStatus: string;
    subscriptionTier?: string | null;
  }) => Promise<void>;
}

export function UserManagementModal({
  member,
  organizationId,
  isPlatformAdmin = false,
  availableRoles,
  userSubscription,
  onClose,
  onUpdateRole,
  onResetPassword,
  onMorph,
  onRelease,
  onUpdateSubscription,
}: UserManagementModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(member?.roleId || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(userSubscription?.subscriptionStatus || 'none');
  const [subscriptionTier, setSubscriptionTier] = useState<string>(userSubscription?.subscriptionTier || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!member) return null;

  const handleUpdateRole = async () => {
    if (selectedRoleId === member.roleId) {
      setError('Please select a different role');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onUpdateRole(member.userId, selectedRoleId);
      setSuccessMessage('Role updated successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm the new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onResetPassword(member.userId, newPassword);
      setSuccessMessage('Password reset successfully');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleMorph = async () => {
    if (!confirm(`Are you sure you want to morph into ${member.email}? You will be logged in as this user.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onMorph(member.userId);
      // The onMorph handler should redirect
    } catch (err: any) {
      setError(err.message || 'Failed to start morph session');
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!onUpdateSubscription) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onUpdateSubscription(member.userId, {
        subscriptionStatus,
        subscriptionTier: subscriptionTier || null,
      });
      setSuccessMessage('Subscription updated successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!onRelease) return;

    if (!confirm(`Are you sure you want to release ${member.email} from the organization?\n\nThis will:\n• Remove them from the organization\n• Convert their account to an individual account\n• Retain all their data and sessions\n• Remove counselor oversight\n• Require an individual subscription for premium features`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onRelease(member.userId);
      setSuccessMessage('Member released successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to release member');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Manage User</h2>
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
          {/* User Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {member.firstName && member.lastName
                  ? `${member.firstName} ${member.lastName}`
                  : 'No name provided'}
              </p>
              <p>
                <span className="font-medium">Email:</span> {member.email}
              </p>
              <p>
                <span className="font-medium">Current Role:</span> {member.roleName}
              </p>
              <p>
                <span className="font-medium">Joined:</span>{' '}
                {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
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

          {/* Change Role Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Change Role</h3>
            <div className="flex gap-3">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a role</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleUpdateRole}
                disabled={loading || !selectedRoleId || selectedRoleId === member.roleId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>

          {/* Reset Password Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Reset Password</h3>
            <div className="space-y-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleResetPassword}
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>

          {/* Morph Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Morph into User</h3>
            <p className="text-sm text-gray-600">
              Morphing will log you in as this user. All actions will be tracked and logged.
            </p>
            <button
              onClick={handleMorph}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Starting Morph...' : 'Morph into User'}
            </button>
          </div>

          {/* Release Member Section */}
          {onRelease && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Release Member</h3>
              <p className="text-sm text-gray-600">
                Releasing this member will remove them from your organization and convert their account to an individual account. They will retain all their data and sessions, but will lose counselor oversight and need an individual subscription for premium features.
              </p>
              <button
                onClick={handleRelease}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Releasing...' : 'Release Member'}
              </button>
            </div>
          )}

          {/* Subscription Management Section (Platform Admin Only) */}
          {isPlatformAdmin && onUpdateSubscription && (
            <div className="space-y-3 border-t pt-6 mt-6">
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800 font-medium">
                  Platform Admin Only: Manual Subscription Management
                </p>
              </div>

              <h3 className="font-semibold text-gray-900">Manage Subscription</h3>
              <p className="text-sm text-gray-600">
                Manually set user subscription without payment processing.
              </p>

              <div className="space-y-3">
                {/* Subscription Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Status
                  </label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="none">None</option>
                    <option value="active">Active</option>
                    <option value="canceled">Canceled</option>
                    <option value="past_due">Past Due</option>
                  </select>
                </div>

                {/* Subscription Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={subscriptionTier}
                    onChange={(e) => setSubscriptionTier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">No Tier</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                {/* Current Subscription Display */}
                {userSubscription && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <p className="text-gray-600">
                      Current: <span className="font-medium">{userSubscription.subscriptionStatus}</span>
                      {userSubscription.subscriptionTier && (
                        <> | Tier: <span className="font-medium">{userSubscription.subscriptionTier}</span></>
                      )}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpdateSubscription}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Updating Subscription...' : 'Update Subscription'}
                </button>
              </div>
            </div>
          )}
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
