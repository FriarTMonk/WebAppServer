import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Share {
  id: string;
  sessionId: string;
  shareToken: string;
  sharedWith: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface ShareConversationModalProps {
  sessionId: string;
  onClose: () => void;
}

const ShareConversationModal: React.FC<ShareConversationModalProps> = ({
  sessionId,
  onClose,
}) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [shareWith, setShareWith] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShares();
  }, [sessionId]);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/counsel/share/${sessionId}/list`);
      setShares(response.data.shares || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch shares');
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`/api/counsel/share/${sessionId}`, {
        sharedWith: shareWith || undefined,
      });

      const shareToken = response.data.shareToken;
      const url = `${window.location.origin}/share/${shareToken}`;
      setShareUrl(url);
      setShareWith('');

      // Refresh the shares list
      await fetchShares();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create share');
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      setLoading(true);
      setError('');
      await axios.delete(`/api/counsel/share/${shareId}`);
      await fetchShares();

      // Clear the share URL if it was just revoked
      setShareUrl('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke share');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getShareUrl = (shareToken: string) => {
    return `${window.location.origin}/share/${shareToken}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Share Conversation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Create New Share Link</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              placeholder="Optional: Restrict to email address"
              value={shareWith}
              onChange={(e) => setShareWith(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={createShare}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Leave email blank to create a public link anyone can access
          </p>
        </div>

        {shareUrl && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-semibold text-green-900 mb-2">
              Share link created successfully!
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm"
              />
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-3">Active Shares</h3>
          {loading && shares.length === 0 ? (
            <p className="text-gray-600">Loading shares...</p>
          ) : shares.length === 0 ? (
            <p className="text-gray-600">
              No active shares. Create one above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="p-4 border border-gray-200 rounded-md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {share.sharedWith ? (
                          <>Shared with: {share.sharedWith}</>
                        ) : (
                          <>Public link</>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Created: {new Date(share.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeShare(share.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getShareUrl(share.shareToken)}
                      readOnly
                      className="flex-1 px-3 py-1 text-sm bg-gray-50 border border-gray-300 rounded-md"
                    />
                    <button
                      onClick={() => copyToClipboard(getShareUrl(share.shareToken))}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareConversationModal;
