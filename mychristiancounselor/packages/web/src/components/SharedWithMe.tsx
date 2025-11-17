'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface SharedConversation {
  shareId: string;
  shareToken: string;
  sessionId: string;
  sessionTitle: string;
  sessionCreatedAt: string;
  ownerName: string;
  ownerId: string;
  allowNotesAccess: boolean;
  expiresAt: string | null;
  lastAccessedAt: string;
}

export function SharedWithMe() {
  const router = useRouter();
  const [sharedConversations, setSharedConversations] = useState<SharedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSharedConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAccessToken();

      if (!token) {
        setSharedConversations([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/share/accessed/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSharedConversations(response.data);
    } catch (err: any) {
      console.error('Error fetching shared conversations:', err);
      setError(err.response?.data?.message || 'Failed to load shared conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedConversations();
  }, []);

  const handleDismiss = async (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Remove this shared conversation from your list?')) {
      return;
    }

    try {
      const token = getAccessToken();
      await axios.patch(
        `${API_URL}/share/accessed/${shareId}/dismiss`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from list
      setSharedConversations(prev => prev.filter(c => c.shareId !== shareId));
    } catch (err) {
      console.error('Error dismissing share:', err);
      alert('Failed to dismiss share');
    }
  };

  const handleOpenConversation = (shareToken: string) => {
    router.push(`/shared/${shareToken}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Shared With Me</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Shared With Me</h2>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (sharedConversations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Shared With Me</h2>
        <p className="text-gray-600 text-sm">
          No shared conversations yet. When someone shares a conversation with you, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Shared With Me</h2>
        <span className="text-sm text-gray-600">{sharedConversations.length} conversation{sharedConversations.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {sharedConversations.map((conversation) => (
          <div
            key={conversation.shareId}
            onClick={() => handleOpenConversation(conversation.shareToken)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{conversation.sessionTitle}</h3>
                <p className="text-sm text-gray-600">
                  Shared by <span className="font-medium">{conversation.ownerName}</span>
                </p>
              </div>
              <button
                onClick={(e) => handleDismiss(conversation.shareId, e)}
                className="ml-2 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Remove from list"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Created: {formatDate(conversation.sessionCreatedAt)}</span>
              <span>•</span>
              <span>Accessed: {formatDate(conversation.lastAccessedAt)}</span>
              {conversation.expiresAt && (
                <>
                  <span>•</span>
                  <span>Expires: {formatDate(conversation.expiresAt)}</span>
                </>
              )}
            </div>

            <div className="mt-2">
              {conversation.allowNotesAccess ? (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Can add notes
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  Read-only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
