'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getAccessToken } from '../../../../../lib/auth';
import { Journal } from '../../../../../components/Journal';
import { Conversation } from '../../../../../components/Conversation';
import { BackButton } from '@/components/BackButton';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';

interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  questionCount: number;
  excerpt?: string;
  topics?: any;
  noteCount?: number;
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

    const token = getAccessToken();
    if (token) {
      fetchMemberSessions();
    } else {
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
        // Transform sessions to match Journal component interface and filter empty ones
        const transformedSessions = (data.sessions || [])
          .filter((session: SessionSummary) => {
            // Filter out sessions with no messages
            return !session.hasOwnProperty('messageCount') || (session as any).messageCount > 0;
          })
          .map((session: SessionSummary) => ({
            ...session,
            excerpt: session.title,
            noteCount: 0,
          }));
        setSessions(transformedSessions);

        // Fetch member info if we haven't already
        if (!memberInfo) {
          fetchMemberInfo();
        }
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

  const fetchMemberInfo = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/counsel/members?organizationId=`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const member = data.members?.find((m: MemberInfo) => m.id === memberId);
        if (member) {
          setMemberInfo(member);
        }
      }
    } catch (err) {
      console.error('Error fetching member info:', err);
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
      } else {
        setError('Failed to load conversation');
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('An error occurred while loading conversation');
    }
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
          <BackButton />
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Show conversation detail view
  if (selectedConversation) {
    return (
      <Conversation
        conversation={selectedConversation}
        userRole="counselor"
        currentUserId={user?.id || ''}
        canAddNotes={true}
        onBack={() => setSelectedConversation(null)}
        showPrintButton={true}
        backButtonText="← Back to Member Journal"
      />
    );
  }

  // Show journal list view
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <BackButton />

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Member Journal
        </h1>
        {memberInfo && (
          <p className="text-gray-600 mb-6">
            {memberInfo.firstName} {memberInfo.lastName} ({memberInfo.email})
          </p>
        )}

        <Journal
          conversations={sessions}
          userRole="counselor"
          searchQuery={searchQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSelectConversation={loadConversation}
          onSearchChange={setSearchQuery}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApplyFilters={fetchMemberSessions}
          showFilters={true}
          showTabs={false}
          showActions={false}
          emptyMessage="This member hasn't started any conversations yet."
        />
      </div>
    </div>
  );
}
