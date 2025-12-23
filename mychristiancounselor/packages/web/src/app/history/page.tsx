'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../lib/auth';
import { ShareModal } from '../../components/ShareModal';
import { TourButton } from '../../components/TourButton';
import { Journal } from '../../components/Journal';
import { Conversation } from '../../components/Conversation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

interface ConversationSummary {
  id: string;
  title: string;
  excerpt: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  noteCount: number;
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
    griefResources?: any[];
    crisisResources?: any[];
  }>;
}

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareConversation, setShareConversation] = useState<{ id: string; title: string } | null>(null);

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
        // Filter out conversations with no messages
        const filteredConversations = data.filter((conv: ConversationSummary) => {
          // If the API doesn't provide message count, include it by default
          return !conv.hasOwnProperty('messageCount') || (conv as any).messageCount > 0;
        });
        setConversations(filteredConversations);
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

  const archiveConversation = async (conversationId: string) => {
    if (!confirm('Archive this conversation? It will be deleted in 30 days.')) {
      return;
    }

    try {
      const token = getAccessToken();
      await fetch(`${API_URL}/profile/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchHistory();
    } catch (err) {
      console.error('Error archiving conversation:', err);
      setError('Failed to archive conversation');
    }
  };

  const restoreConversation = async (conversationId: string) => {
    try {
      const token = getAccessToken();
      await fetch(`${API_URL}/profile/conversations/${conversationId}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchHistory();
    } catch (err) {
      console.error('Error restoring conversation:', err);
      setError('Failed to restore conversation');
    }
  };

  const openShareModal = (conversationId: string, title: string) => {
    setShareConversation({ id: conversationId, title });
    setIsShareModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show conversation detail view
  if (selectedConversation) {
    return (
      <Conversation
        conversation={selectedConversation}
        userRole="owner"
        currentUserId={user?.id || ''}
        canAddNotes={true}
        onBack={() => setSelectedConversation(null)}
        showPrintButton={true}
        backButtonText="← Back to Journal"
      />
    );
  }

  // Show journal list view
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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conversation Journal</h1>
          <TourButton />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Journal
          conversations={conversations}
          userRole="owner"
          activeTab={activeTab}
          searchQuery={searchQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSelectConversation={loadConversation}
          onSearchChange={setSearchQuery}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApplyFilters={fetchHistory}
          onTabChange={setActiveTab}
          onArchive={archiveConversation}
          onRestore={restoreConversation}
          onShare={openShareModal}
          showFilters={true}
          showTabs={true}
          showActions={true}
          emptyMessage="You haven't started any conversations yet."
          emptyActionText="Start a Conversation"
          onEmptyAction={() => router.push('/')}
        />

        {isShareModalOpen && shareConversation && (
          <ShareModal
            sessionId={shareConversation.id}
            sessionTitle={shareConversation.title}
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setShareConversation(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
