'use client';

import { useState } from 'react';
import { WellbeingStatus } from '@mychristiancounselor/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface OverrideStatusModalProps {
  memberName: string;
  memberId: string;
  currentStatus: WellbeingStatus;
  aiSuggestedStatus: WellbeingStatus;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OverrideStatusModal({
  memberName,
  memberId,
  currentStatus,
  aiSuggestedStatus,
  organizationId,
  onClose,
  onSuccess,
}: OverrideStatusModalProps) {
  const [newStatus, setNewStatus] = useState<WellbeingStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason for the override');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/counsel/members/${memberId}/status?organizationId=${organizationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, reason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to override status');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override status');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: WellbeingStatus) => {
    switch (status) {
      case 'red': return 'bg-red-100 border-red-300 text-red-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'green': return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Override Wellbeing Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            Override AI-suggested status for {memberName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* AI Suggested Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Suggested Status
            </label>
            <div className={`px-3 py-2 rounded border ${getStatusColor(aiSuggestedStatus)}`}>
              {aiSuggestedStatus.toUpperCase()}
            </div>
          </div>

          {/* New Status Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Override Status *
            </label>
            <div className="space-y-2">
              {(['red', 'yellow', 'green'] as WellbeingStatus[]).map((status) => (
                <label key={status} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={newStatus === status}
                    onChange={(e) => setNewStatus(e.target.value as WellbeingStatus)}
                    className="w-4 h-4"
                  />
                  <span className={`px-3 py-1 rounded border ${getStatusColor(status)}`}>
                    {status === 'red' && '🔴 Red - Crisis'}
                    {status === 'yellow' && '🟡 Yellow - Concern'}
                    {status === 'green' && '🟢 Green - Stable'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Override *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why you're overriding the AI's suggestion..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be logged for audit purposes.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Override Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
