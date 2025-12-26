import React from 'react';
import { Message, ScriptureReference } from '@mychristiancounselor/shared';
import { ScriptureCard } from './ScriptureCard';
import { ScriptureComparison } from './ScriptureComparison';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface GroupedScripture {
  primary: ScriptureReference;
  related: ScriptureReference[];
}

function groupScriptures(scriptures: ScriptureReference[]): GroupedScripture[] {
  const groups: GroupedScripture[] = [];
  let currentGroup: GroupedScripture | null = null;

  for (const scripture of scriptures) {
    if (scripture.source === 'ai-cited') {
      // Start new group
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { primary: scripture, related: [] };
    } else if (scripture.source === 'related' && currentGroup) {
      // Add to current group
      currentGroup.related.push(scripture);
    } else {
      // Standalone (theme) scripture
      if (currentGroup) groups.push(currentGroup);
      groups.push({ primary: scripture, related: [] });
      currentGroup = null;
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
}

interface MessageBubbleProps {
  message: Message;
  comparisonMode?: boolean;
}

export function MessageBubble({ message, comparisonMode = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { isSpeaking, isSupported, speak, stop, isPaused, pause, resume } = useTextToSpeech();

  // Handle content as string or object
  const getContentText = (content: any): string => {
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object' && 'text' in content) return content.text;
    return '';
  };

  const contentText = getContentText(message.content);

  // Debug logging
  console.log('[MessageBubble] Rendering:', {
    role: message.role,
    isUser,
    isSystem,
    contentType: typeof message.content,
    contentLength: contentText.length,
    scriptureCount: message.scriptureReferences.length,
  });

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(contentText);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-purple-700 text-white'
            : isSystem
            ? 'bg-red-50 border border-red-200 text-red-900'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="whitespace-pre-wrap flex-1">{contentText}</div>

          {/* Text-to-Speech Button - Only for AI messages */}
          {!isUser && isSupported && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={handleSpeak}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={isSpeaking ? 'Stop' : 'Read aloud'}
              >
                {isSpeaking ? (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              {isSpeaking && (
                <button
                  onClick={handlePauseResume}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? (
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {message.scriptureReferences.length > 0 && (
          <div className="mt-3">
            {comparisonMode ? (
              <ScriptureComparison scriptures={message.scriptureReferences} />
            ) : (
              (() => {
                const groupedScriptures = groupScriptures(message.scriptureReferences);
                return (
                  <div className="space-y-2">
                    {groupedScriptures.map((group, idx) => (
                      <ScriptureCard
                        key={idx}
                        scripture={group.primary}
                        relatedScriptures={group.related}
                      />
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
