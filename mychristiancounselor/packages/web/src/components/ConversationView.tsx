'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { CrisisModal } from './CrisisModal';
import { GriefAlert } from './GriefAlert';
import { TranslationSelector } from './TranslationSelector';
import { ComparisonTranslationSelector } from './ComparisonTranslationSelector';
import { UserMenu } from './UserMenu';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import QuestionProgressIndicator from './QuestionProgressIndicator';
import { Message, CrisisResource, GriefResource, BibleTranslation, DEFAULT_TRANSLATION } from '@mychristiancounselor/shared';
import axios from 'axios';
import { getAccessToken } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

// Extended message type to include grief resources for display
interface ExtendedMessage extends Message {
  griefResources?: GriefResource[];
}

export function ConversationView() {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preferredTranslation, setPreferredTranslation] = useState<BibleTranslation>(DEFAULT_TRANSLATION);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonTranslations, setComparisonTranslations] = useState<BibleTranslation[]>([
    'ESV',
    'NASB',
    'NIV',
    'NKJV',
  ]);
  const [crisisModal, setCrisisModal] = useState<{
    isOpen: boolean;
    resources: CrisisResource[];
  }>({ isOpen: false, resources: [] });
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [currentSessionQuestionCount, setCurrentSessionQuestionCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user preferences on mount if authenticated
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!isAuthenticated) return;

      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        if (profile.preferredTranslation) {
          setPreferredTranslation(profile.preferredTranslation as BibleTranslation);
        }
        if (profile.comparisonTranslations && profile.comparisonTranslations.length > 0) {
          setComparisonTranslations(profile.comparisonTranslations as BibleTranslation[]);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
        // Silently fail - use default preferences
      }
    };

    loadUserPreferences();
  }, [isAuthenticated]);

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      const token = getAccessToken();
      if (!token) {
        setSubscriptionStatus({
          subscriptionStatus: 'none',
          maxClarifyingQuestions: 0,
        });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/subscriptions/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setSubscriptionStatus(await response.json());
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ExtendedMessage = {
      id: Date.now().toString(),
      sessionId: sessionId || '',
      role: 'user',
      content: inputValue,
      scriptureReferences: [],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get auth token if user is logged in (optional)
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_URL}/counsel/ask`, {
        message: inputValue,
        sessionId,
        preferredTranslation,
        comparisonMode,
        comparisonTranslations: comparisonMode ? comparisonTranslations : undefined,
      }, {
        headers
      });

      const {
        sessionId: newSessionId,
        message,
        isCrisisDetected,
        crisisResources,
        isGriefDetected,
        griefResources,
        currentSessionQuestionCount: responseQuestionCount
      } = response.data;

      console.log('API Response:', { isGriefDetected, griefResources, hasGriefResources: !!griefResources });

      if (!sessionId) {
        setSessionId(newSessionId);
      }

      // Update question count if provided
      if (typeof responseQuestionCount === 'number') {
        setCurrentSessionQuestionCount(responseQuestionCount);
      }

      // Attach grief resources to the message for inline display
      const extendedMessage: ExtendedMessage = {
        ...message,
        griefResources: isGriefDetected ? griefResources : undefined,
      };

      console.log('Extended message:', { hasGriefResources: !!extendedMessage.griefResources, resourceCount: extendedMessage.griefResources?.length });

      setMessages((prev) => [...prev, extendedMessage]);

      if (isCrisisDetected && crisisResources) {
        setCrisisModal({ isOpen: true, resources: crisisResources });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        sessionId: sessionId || '',
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        scriptureReferences: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">MyChristianCounselor</h1>
            <OrganizationSwitcher />
          </div>
          <div className="flex items-center gap-4">
            {!comparisonMode ? (
              <TranslationSelector
                selectedTranslation={preferredTranslation}
                onTranslationChange={setPreferredTranslation}
              />
            ) : (
              <ComparisonTranslationSelector
                selectedTranslations={comparisonTranslations}
                onTranslationsChange={setComparisonTranslations}
              />
            )}
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${comparisonMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {comparisonMode ? 'Single Translation' : 'Compare Translations'}
            </button>
            <UserMenu />
          </div>
        </div>
        <p className="text-sm text-gray-600">Biblical guidance for life's questions</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Welcome! How can I help you today?
            </h2>
            <p className="text-gray-600">
              I'm here to provide Biblical guidance through a guided conversation.
              I may ask a few questions to better understand your situation.
            </p>
            <div className="mt-6 text-sm text-gray-500 max-w-2xl mx-auto">
              <p className="font-semibold mb-2">Disclaimer:</p>
              <p>
                This is AI-powered spiritual guidance, not professional counseling.
                For emergencies, contact 911 or crisis services.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <React.Fragment key={message.id}>
            <MessageBubble message={message} comparisonMode={comparisonMode} />
            {message.griefResources && message.griefResources.length > 0 && (
              <GriefAlert resources={message.griefResources} />
            )}
          </React.Fragment>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          {subscriptionStatus && sessionId && (
            <QuestionProgressIndicator
              currentCount={currentSessionQuestionCount}
              maxCount={subscriptionStatus.maxClarifyingQuestions}
              subscriptionStatus={subscriptionStatus.subscriptionStatus}
            />
          )}
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <CrisisModal
        isOpen={crisisModal.isOpen}
        resources={crisisModal.resources}
        onClose={() => setCrisisModal({ isOpen: false, resources: [] })}
      />
    </div>
  );
}
