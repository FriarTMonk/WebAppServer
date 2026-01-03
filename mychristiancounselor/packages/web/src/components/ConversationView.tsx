'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageBubble } from './MessageBubble';
import { CrisisModal } from './CrisisModal';
import { CrisisAlert } from './CrisisAlert';
import { GriefAlert } from './GriefAlert';
import { TranslationSelector } from './TranslationSelector';
import { ComparisonTranslationSelector } from './ComparisonTranslationSelector';
import { UserMenu } from './UserMenu';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { ResourcesMenuSection } from './shared/ResourcesMenuSection';
import QuestionProgressIndicator from './QuestionProgressIndicator';
import { SessionNotesPanel } from './SessionNotesPanel';
import { SessionExportView } from './SessionExportView';
import { SharedWithMe } from './SharedWithMe';
import RegistrationPromptModal from './RegistrationPromptModal';
import { ThinkingIndicator } from './ThinkingIndicator';
import { SessionCounter } from './SessionCounter';
import { SessionLimitModal } from './SessionLimitModal';
import { TrialExpirationBanner } from './TrialExpirationBanner';
import MemberTasksCard from './MemberTasksCard';
import MemberAssessmentsCard from './MemberAssessmentsCard';
import MyTasksModal from './MyTasksModal';
import MyAssessmentsModal from './MyAssessmentsModal';
import { Message, CrisisResource, GriefResource, BibleTranslation, DEFAULT_TRANSLATION, SessionLimitStatus } from '@mychristiancounselor/shared';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// Extended message type to include grief and crisis resources for display
interface ExtendedMessage extends Message {
  griefResources?: GriefResource[];
  crisisResources?: CrisisResource[];
}

export function ConversationView() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
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
  const [showMobileNotes, setShowMobileNotes] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [sessionLimitModal, setSessionLimitModal] = useState<{
    isOpen: boolean;
    limitStatus: SessionLimitStatus | null;
  }>({ isOpen: false, limitStatus: null });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showAssessmentsModal, setShowAssessmentsModal] = useState(false);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const [assessmentRefreshTrigger, setAssessmentRefreshTrigger] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Speech recognition
  const {
    transcript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  const scrollToBottom = () => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        // Scroll the container to the bottom
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll when loading state changes to show the thinking indicator
  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  // Update input value when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Close export modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showExportModal) {
        setShowExportModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showExportModal]);

  // Load user preferences on mount if authenticated
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await apiGet('/profile');

        if (response.ok) {
          const profile = await response.json();
          if (profile.preferredTranslation) {
            setPreferredTranslation(profile.preferredTranslation as BibleTranslation);
          }
          if (profile.comparisonTranslations && profile.comparisonTranslations.length > 0) {
            setComparisonTranslations(profile.comparisonTranslations as BibleTranslation[]);
          }
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
      if (!isAuthenticated) {
        setSubscriptionStatus({
          subscriptionStatus: 'none',
          maxClarifyingQuestions: 0,
        });
        return;
      }

      try {
        const response = await apiGet('/subscriptions/status');
        if (response.ok) {
          setSubscriptionStatus(await response.json());
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    };

    fetchSubscriptionStatus();
  }, [isAuthenticated]);

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
      const response = await apiPost('/counsel/ask', {
        message: inputValue,
        sessionId,
        preferredTranslation,
        comparisonMode,
        comparisonTranslations: comparisonMode ? comparisonTranslations : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const {
        sessionId: newSessionId,
        message,
        isCrisisDetected,
        crisisResources,
        isGriefDetected,
        griefResources,
        currentSessionQuestionCount: responseQuestionCount
      } = data;

      console.log('API Response:', { isGriefDetected, griefResources, hasGriefResources: !!griefResources });

      if (!sessionId) {
        setSessionId(newSessionId);
      }

      // Update question count if provided
      if (typeof responseQuestionCount === 'number') {
        setCurrentSessionQuestionCount(responseQuestionCount);
      }

      // Attach grief and crisis resources to the message for inline display
      const extendedMessage: ExtendedMessage = {
        ...message,
        griefResources: isGriefDetected ? griefResources : undefined,
        crisisResources: isCrisisDetected ? crisisResources : undefined,
      };

      console.log('Extended message:', {
        hasGriefResources: !!extendedMessage.griefResources,
        hasCrisisResources: !!extendedMessage.crisisResources,
        resourceCount: extendedMessage.griefResources?.length
      });

      setMessages((prev) => [...prev, extendedMessage]);

      // Show crisis modal that user must acknowledge before seeing the AI response
      if (isCrisisDetected && crisisResources) {
        setCrisisModal({ isOpen: true, resources: crisisResources });
      }

      // Show registration prompt for anonymous users after each response
      if (!isAuthenticated) {
        setShowRegistrationPrompt(true);
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
          <div className="flex items-center gap-2 lg:gap-4">
            <img
              src="/logo.jpg"
              alt="MyChristianCounselor Online"
              className="h-8 lg:h-10 w-auto"
            />
            <div className="hidden lg:block">
              <OrganizationSwitcher />
            </div>
          </div>
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Desktop Controls - Hidden on Mobile */}
          <div className="hidden lg:flex items-center gap-4">
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
            {/* Mobile Notes Toggle */}
            {sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
              <button
                onClick={() => setShowMobileNotes(!showMobileNotes)}
                className="lg:hidden px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                📝 Notes
              </button>
            )}
            {/* Export Button */}
            {sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                title="Export/Print Session"
              >
                🖨️ Export
              </button>
            )}
            {/* Session Counter - Shows for free users */}
            {isAuthenticated && !subscriptionStatus?.hasHistoryAccess && (
              <SessionCounter
                key={sessionId || 'no-session'} // Force refetch when session is created
                onLimitReached={async () => {
                  try {
                    const response = await apiGet('/profile/session-limit-status');
                    const status = await response.json() as SessionLimitStatus;
                    setSessionLimitModal({ isOpen: true, limitStatus: status });
                  } catch (error) {
                    console.error('Failed to fetch limit status:', error);
                  }
                }}
              />
            )}
            <UserMenu />
          </div>
        </div>
        <p className="text-sm text-gray-600">Biblical guidance for life's questions</p>
      </div>

      {/* Mobile Menu Panel */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Organization Switcher */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Organization</h3>
                <OrganizationSwitcher />
              </div>

              {/* Translation Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Bible Translation</h3>
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
              </div>

              {/* Comparison Mode Toggle */}
              <div>
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className={`
                    w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${comparisonMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {comparisonMode ? 'Single Translation' : 'Compare Translations'}
                </button>
              </div>

              {/* Notes Button */}
              {sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
                <div>
                  <button
                    onClick={() => {
                      setShowMobileNotes(!showMobileNotes);
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    📝 Notes
                  </button>
                </div>
              )}

              {/* Export Button */}
              {sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
                <div>
                  <button
                    onClick={() => {
                      setShowExportModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    🖨️ Export Session
                  </button>
                </div>
              )}

              {/* Session Counter */}
              {isAuthenticated && !subscriptionStatus?.hasHistoryAccess && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Session Status</h3>
                  <SessionCounter
                    key={sessionId || 'no-session'}
                    onLimitReached={async () => {
                      try {
                        const response = await apiGet('/profile/session-limit-status');
                        const status = await response.json() as SessionLimitStatus;
                        setSessionLimitModal({ isOpen: true, limitStatus: status });
                        setShowMobileMenu(false);
                      } catch (error) {
                        console.error('Failed to fetch limit status:', error);
                      }
                    }}
                  />
                </div>
              )}

              {/* Resources Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="px-4 text-sm font-semibold text-gray-900 mb-2">
                  Resources
                </h3>
                <ResourcesMenuSection
                  onNavigate={() => setShowMobileMenu(false)}
                  showBorder={false}
                  roleGroup={false}
                />
              </div>

              {/* User Menu */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Account</h3>
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Dashboard Cards - Tasks and Assessments */}
      {isAuthenticated && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <MemberTasksCard
              onOpenModal={() => setShowTasksModal(true)}
              refreshTrigger={taskRefreshTrigger}
            />
            <MemberAssessmentsCard
              onOpenModal={() => setShowAssessmentsModal(true)}
              refreshTrigger={assessmentRefreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Messages and Notes Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div className={`h-full grid grid-cols-1 gap-4 ${sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess ? 'lg:grid-cols-3' : ''}`}>
          {/* Conversation Column (2/3 width on desktop) */}
          <div
            ref={messagesContainerRef}
            className={sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess ? 'lg:col-span-2 overflow-y-auto' : 'overflow-y-auto'}
          >
            {/* Trial Expiration Banner - Shows for free users nearing end of trial */}
            {isAuthenticated && !subscriptionStatus?.hasHistoryAccess && (
              <TrialExpirationBanner />
            )}

            {messages.length === 0 && isAuthenticated && (
              <div className="mb-6">
                <SharedWithMe />
              </div>
            )}

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
                {message.crisisResources && message.crisisResources.length > 0 && (
                  <CrisisAlert resources={message.crisisResources} />
                )}
                {message.griefResources && message.griefResources.length > 0 && (
                  <GriefAlert resources={message.griefResources} />
                )}
              </React.Fragment>
            ))}

            {isLoading && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Notes Panel (1/3 width on desktop) - Only for subscribed users */}
          {sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
            <div className="lg:col-span-1 hidden lg:block">
              <SessionNotesPanel
                sessionId={sessionId}
                currentUserId={user?.id || ''}
                userRole="user"
              />
            </div>
          )}
        </div>
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
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                disabled={isLoading}
              />
              {/* Microphone Button */}
              {isSpeechSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
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

      <RegistrationPromptModal
        isOpen={showRegistrationPrompt}
        onClose={() => setShowRegistrationPrompt(false)}
      />

      <SessionLimitModal
        isOpen={sessionLimitModal.isOpen}
        limitStatus={sessionLimitModal.limitStatus}
        onClose={() => setSessionLimitModal({ isOpen: false, limitStatus: null })}
        onUpgrade={() => {
          setSessionLimitModal({ isOpen: false, limitStatus: null });
          router.push('/settings/subscription');
        }}
      />

      {/* Mobile Notes Overlay - Only for subscribed users */}
      {showMobileNotes && sessionId && isAuthenticated && subscriptionStatus?.hasHistoryAccess && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMobileNotes(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Session Notes</h3>
                <button
                  onClick={() => setShowMobileNotes(false)}
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
                  aria-label="Close notes"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SessionNotesPanel
                  sessionId={sessionId}
                  currentUserId={user?.id || ''}
                  userRole="user"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal - Only for subscribed users */}
      {showExportModal && sessionId && subscriptionStatus?.hasHistoryAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Session Export</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              <SessionExportView sessionId={sessionId} />
            </div>
          </div>
        </div>
      )}

      {/* Tasks Modal */}
      {showTasksModal && (
        <MyTasksModal
          onClose={() => setShowTasksModal(false)}
          onTaskUpdate={() => setTaskRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Assessments Modal */}
      {showAssessmentsModal && (
        <MyAssessmentsModal
          onClose={() => setShowAssessmentsModal(false)}
          onAssessmentUpdate={() => setAssessmentRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
}
