'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface ConversationSummary {
  id: string;
  title: string;
  excerpt: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
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
  }>;
}

export default function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('status', activeTab);

      const response = await fetch(
        `${API_URL}/profile/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        setError('Failed to load conversation history');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('An error occurred while loading history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchHistory();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [activeTab]);

  const loadConversation = async (conversationId: string) => {
    try {
      const token = getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`${API_URL}/counsel/session/${conversationId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between no-print">
            <button
              onClick={() => setSelectedConversation(null)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back to History
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
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-50 border border-blue-200'
                      : message.role === 'assistant'
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-yellow-50 border border-yellow-200'
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
                      <p className="text-sm font-semibold text-gray-700 mb-2">Scripture References:</p>
                      {message.scriptureReferences.map((ref: any, index: number) => (
                        <div key={index} className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">{ref.reference}</span>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Home
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Conversation History</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
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
              onClick={fetchHistory}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-4 py-2 rounded-md ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex-1 px-4 py-2 rounded-md ${
                activeTab === 'archived'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">You haven't started any conversations yet.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => loadConversation(conversation.id)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">{conversation.title}</h2>
                  <span className="text-sm text-gray-500">{formatDate(conversation.createdAt)}</span>
                </div>

                {parseTopics(conversation.topics).length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {parseTopics(conversation.topics).map((topic, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-gray-600 line-clamp-2">{conversation.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
