'use client';

import { useState } from 'react';
import { CreateShareRequest, CreateShareResponse } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface ShareModalProps {
  sessionId: string;
  sessionTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ sessionId, sessionTitle, isOpen, onClose }: ShareModalProps) {
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [allowNotesAccess, setAllowNotesAccess] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        setError('You must be logged in to share conversations');
        return;
      }

      const payload: CreateShareRequest = {
        sessionId,
        expiresInDays: expiresInDays || undefined,
        allowNotesAccess,
      };

      const response = await axios.post<CreateShareResponse>(
        `${API_URL}/share`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Build full URL
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${response.data.shareUrl}`;
      setShareUrl(fullUrl);
    } catch (err: any) {
      console.error('Failed to generate share link:', err);
      setError(err.response?.data?.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setCopied(false);
    setAllowNotesAccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Conversation</h2>
            <p className="text-sm text-gray-600 mt-1">"{sessionTitle}"</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {!shareUrl ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Expiration
              </label>
              <select
                value={expiresInDays || ''}
                onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="">Never expires</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Choose how long the share link will remain active. Recipients must be logged in to view.
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowNotesAccess}
                  onChange={(e) => setAllowNotesAccess(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium">Allow recipients to add notes</span>
                  <p className="text-xs text-gray-500 mt-1">
                    If checked, recipients can add their own notes to this conversation. Otherwise, it's read-only.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Share this link via email or message. Recipients must be logged in to view.
                {expiresInDays && ` Link expires in ${expiresInDays} days.`}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
