'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getAccessToken } from '../../../../../lib/auth';
import { SessionNotesPanel } from '../../../../../components/SessionNotesPanel';
import { GriefAlert } from '../../../../../components/GriefAlert';
import { CrisisAlert } from '../../../../../components/CrisisAlert';
import { MessageBubble } from '../../../../../components/MessageBubble';
import { CrisisResource, GriefResource, Message } from '@mychristiancounselor/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  questionCount: number;
}

interface FullConversation {
  id: string;
  title: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
    scriptureReferences: any[];
    griefResources?: GriefResource[];
    crisisResources?: CrisisResource[];
  }>;
}

interface MemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function MemberJournalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const memberId = params?.memberId as string;

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<FullConversation | null>(null);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!memberId) {
      setError('Member ID is required');
      setLoading(false);
      return;
    }

    // Only fetch if we have authentication (token exists)
    const token = getAccessToken();
    if (token) {
      fetchMemberSessions();
    } else {
      // No token, redirect to login (replace to avoid adding to history)
      router.replace('/login');
    }
  }, [memberId, router]);

  const fetchMemberSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAccessToken();

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const url = params.toString()
        ? `${API_URL}/counsel/members/${memberId}/sessions?${params.toString()}`
        : `${API_URL}/counsel/members/${memberId}/sessions`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else if (response.status === 403) {
        setError('You do not have access to this member');
      } else {
        setError('Failed to load member sessions');
      }
    } catch (err) {
      console.error('Error fetching member sessions:', err);
      setError('An error occurred while loading sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (sessionId: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/counsel/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data);

        // Extract member info from session user data if available
        if (data.user && !memberInfo) {
          setMemberInfo({
            id: memberId,
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || ''
          });
        }
      } else {
        setError('Failed to load conversation details');
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError('An error occurred while loading conversation');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseTopics = (topics: any): string[] => {
    if (Array.isArray(topics)) return topics;
    if (typeof topics === 'string') {
      try {
        const parsed = JSON.parse(topics);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading member journal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between no-print">
            <button
              onClick={() => setSelectedConversation(null)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back to Member Journal
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation Column (2/3 width on desktop) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6 mb-6 print:shadow-none print:border-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedConversation.title}</h1>

                {parseTopics(selectedConversation.topics).length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {parseTopics(selectedConversation.topics).map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 mb-6">
                  Started: {formatDate(selectedConversation.createdAt)}
                </div>

                <div className="space-y-4">
                  {selectedConversation.messages.map((message) => {
                    // Convert to Message type with proper timestamp
                    const messageForBubble: Message = {
                      ...message,
                      sessionId: selectedConversation.id,
                      timestamp: new Date(message.timestamp),
                      role: message.role as 'system' | 'user' | 'assistant',
                    };

                    return (
                      <React.Fragment key={message.id}>
                        <MessageBubble message={messageForBubble} comparisonMode={false} />
                        {message.crisisResources && message.crisisResources.length > 0 && (
                          <CrisisAlert resources={message.crisisResources} />
                        )}
                        {message.griefResources && message.griefResources.length > 0 && (
                          <GriefAlert resources={message.griefResources} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Notes Panel (1/3 width on desktop) */}
            <div className="lg:col-span-1">
              <SessionNotesPanel
                sessionId={selectedConversation.id}
                currentUserId={user?.id || ''}
                userRole="counselor"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Member Journal
        </h1>
        {memberInfo && (
          <p className="text-gray-600 mb-6">
            {memberInfo.firstName} {memberInfo.lastName} ({memberInfo.email})
          </p>
        )}

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <button
              onClick={fetchMemberSessions}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">This member hasn't started any conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2
                    onClick={() => loadConversation(session.id)}
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                  >
                    {session.title}
                  </h2>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{formatDate(session.createdAt)}</span>
                  <span className="text-gray-400">
                    {session.questionCount} {session.questionCount === 1 ? 'question' : 'questions'}
                  </span>
                </div>

                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
