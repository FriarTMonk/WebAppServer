'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getAccessToken } from '../../../lib/auth';
import { Conversation } from '../../../components/Conversation';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';

interface ShareData {
  session: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    topics?: any;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      timestamp: string;
      scriptureReferences: any[];
      griefResources?: any[];
      crisisResources?: any[];
    }>;
  };
  canView: boolean;
  canAddNotes: boolean;
  sharedBy: string;
  expiresAt: string | null;
}

export default function SharedConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for auth to initialize before making decisions
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.push(`/?redirect=/shared/${token}`);
      return;
    }

    const fetchSharedSession = async () => {
      try {
        const accessToken = getAccessToken();
        if (!accessToken) {
          setError('You must be logged in to view shared conversations');
          return;
        }

        const response = await fetch(`${API_URL}/share/${token}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setShareData(data);
        } else if (response.status === 403) {
          setError('This share link has expired or is not accessible to you.');
        } else if (response.status === 404) {
          setError('This share link is invalid or has been removed.');
        } else {
          setError('An error occurred while loading the conversation.');
        }
      } catch (err) {
        console.error('Error fetching shared session:', err);
        setError('An error occurred while loading the conversation.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedSession();
  }, [token, isAuthenticated, authLoading, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading shared conversation...</div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { session, canView, canAddNotes, sharedBy, expiresAt } = shareData;

  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">You do not have permission to view this conversation.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Share info banner */}
      <div className="bg-blue-50 border-b border-blue-200 p-4 no-print">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-blue-800 font-medium">
            📖 Shared Conversation {!canAddNotes && '(Read-Only)'}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Shared by user ID: {sharedBy}
            {expiresAt && ` • Expires: ${formatDate(expiresAt)}`}
          </p>
        </div>
      </div>

      <Conversation
        conversation={session}
        userRole="viewer"
        currentUserId={user?.id || ''}
        canAddNotes={canAddNotes}
        onBack={() => router.push(isAuthenticated ? '/home' : '/login')}
        showPrintButton={false}
        backButtonText="← Back"
      />
    </div>
  );
}
