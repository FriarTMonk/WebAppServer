import React from 'react';
import { Message } from '@mychristiancounselor/shared';
import { ScriptureCard } from './ScriptureCard';
import { ScriptureComparison } from './ScriptureComparison';

interface MessageBubbleProps {
  message: Message;
  comparisonMode?: boolean;
}

export function MessageBubble({ message, comparisonMode = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-primary-600 text-white'
            : isSystem
            ? 'bg-red-50 border border-red-200 text-red-900'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {message.scriptureReferences.length > 0 && (
          <div className="mt-3">
            {comparisonMode ? (
              <ScriptureComparison scriptures={message.scriptureReferences} />
            ) : (
              <div className="space-y-2">
                {message.scriptureReferences.map((ref, idx) => (
                  <ScriptureCard key={idx} scripture={ref} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
