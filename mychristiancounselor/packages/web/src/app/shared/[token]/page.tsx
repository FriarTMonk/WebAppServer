'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getAccessToken } from '../../../lib/auth';
import { SessionNotesPanel } from '../../../components/SessionNotesPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  scriptureReferences: any[];
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  notes: any[];
}

interface ShareData {
  session: Session;
  canView: boolean;
  canAddNotes: boolean;
  sharedBy: string;
  expiresAt: string | null;
}

export default function SharedConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, [token, isAuthenticated, router]);

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with share info */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/history')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
          >
            ← Back to Journal
          </button>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  📖 Shared Conversation {!canAddNotes && '(Read-Only)'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Shared by user ID: {sharedBy}
                  {expiresAt && ` • Expires: ${formatDate(expiresAt)}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area with conversation and notes side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation Messages (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
              <p className="text-sm text-gray-600 mb-6">
                Started: {formatDate(session.createdAt)} • Last updated: {formatDate(session.updatedAt)}
              </p>

              <div className="space-y-4">
                {session.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900 capitalize">
                        {message.role === 'assistant' ? 'Counselor' : message.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>

                    {message.scriptureReferences && message.scriptureReferences.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Scripture References:
                        </p>
                        {message.scriptureReferences.map((ref: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">
                              {ref.book} {ref.chapter}:{ref.verseStart}
                              {ref.verseEnd && ref.verseEnd !== ref.verseStart && `-${ref.verseEnd}`}
                              {' '}({ref.translation})
                            </span>
                            {ref.theme && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                {ref.theme}
                              </span>
                            )}
                            <p className="italic mt-1">{ref.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session Notes Panel (1/3 width) */}
          <div className="lg:col-span-1">
            {user && (
              <SessionNotesPanel
                sessionId={session.id}
                currentUserId={user.id}
                userRole={canAddNotes ? 'user' : 'viewer'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
