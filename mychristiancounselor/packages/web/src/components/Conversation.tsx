'use client';

import React from 'react';
import { Message, GriefResource, CrisisResource } from '@mychristiancounselor/shared';
import { MessageBubble } from './MessageBubble';
import { GriefAlert } from './GriefAlert';
import { CrisisAlert } from './CrisisAlert';
import { SessionNotesPanel } from './SessionNotesPanel';

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  scriptureReferences: any[];
  griefResources?: GriefResource[];
  crisisResources?: CrisisResource[];
}

interface ConversationData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  topics?: any;
  messages: ConversationMessage[];
}

interface ConversationProps {
  conversation: ConversationData;
  userRole: 'owner' | 'counselor' | 'viewer';
  currentUserId: string;
  canAddNotes: boolean;
  organizationId?: string;
  onBack?: () => void;
  showPrintButton?: boolean;
  backButtonText?: string;
}

export function Conversation({
  conversation,
  userRole,
  currentUserId,
  canAddNotes,
  organizationId,
  onBack,
  showPrintButton = false,
  backButtonText = '← Back',
}: ConversationProps) {
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

  // Debug logging
  console.log('[Conversation] Rendering conversation:', {
    id: conversation.id,
    title: conversation.title,
    totalMessages: conversation.messages?.length || 0,
    userMessages: conversation.messages?.filter((m: any) => m.role === 'user').length || 0,
    assistantMessages: conversation.messages?.filter((m: any) => m.role === 'assistant').length || 0,
    messagesWithGrief: conversation.messages?.filter((m: any) => m.griefResources).length || 0,
    messagesWithCrisis: conversation.messages?.filter((m: any) => m.crisisResources).length || 0,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with back and print buttons */}
        <div className="mb-6 flex items-center justify-between no-print">
          {onBack && (
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              {backButtonText}
            </button>
          )}
          {showPrintButton && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print / Save as PDF
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversation Column (2/3 width on desktop) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6 print:shadow-none print:border-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{conversation.title}</h1>

              {parseTopics(conversation.topics).length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {parseTopics(conversation.topics).map((topic, index) => (
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
                Started: {formatDate(conversation.createdAt)}
                {conversation.updatedAt && ` • Last updated: ${formatDate(conversation.updatedAt)}`}
              </div>

              <div className="space-y-4">
                {conversation.messages.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    No messages in this conversation yet.
                  </div>
                )}
                {conversation.messages.map((message, index) => {
                  // Debug log each message being rendered
                  console.log(`[Conversation] Rendering message ${index + 1}:`, {
                    id: message.id,
                    role: message.role,
                    contentPreview: message.content.substring(0, 50),
                    hasGrief: !!message.griefResources,
                    hasCrisis: !!message.crisisResources,
                  });

                  // Convert to Message type with proper timestamp and ensure arrays
                  const messageForBubble: Message = {
                    ...message,
                    sessionId: conversation.id,
                    timestamp: new Date(message.timestamp),
                    role: message.role as 'system' | 'user' | 'assistant',
                    scriptureReferences: Array.isArray(message.scriptureReferences)
                      ? message.scriptureReferences
                      : (message.scriptureReferences ? Object.values(message.scriptureReferences) : []),
                  };

                  // Convert resources to arrays if they're objects
                  const crisisArray: any[] = Array.isArray(message.crisisResources)
                    ? message.crisisResources
                    : (message.crisisResources ? Object.values(message.crisisResources) : []);
                  const griefArray: any[] = Array.isArray(message.griefResources)
                    ? message.griefResources
                    : (message.griefResources ? Object.values(message.griefResources) : []);

                  return (
                    <React.Fragment key={message.id}>
                      <MessageBubble message={messageForBubble} comparisonMode={false} />
                      {crisisArray.length > 0 && (
                        <CrisisAlert resources={crisisArray} />
                      )}
                      {griefArray.length > 0 && (
                        <GriefAlert resources={griefArray} />
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
              sessionId={conversation.id}
              currentUserId={currentUserId}
              userRole={canAddNotes ? (userRole === 'owner' ? 'user' : userRole) : 'viewer'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
