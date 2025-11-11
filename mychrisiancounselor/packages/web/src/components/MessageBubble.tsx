import React from 'react';
import { Message } from '@mychrisiancounselor/shared';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
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
          <div className="mt-3 pt-3 border-t border-gray-300">
            <p className="text-sm font-semibold mb-2">Referenced Scriptures:</p>
            {message.scriptureReferences.map((ref, idx) => (
              <div key={idx} className="text-sm mb-2">
                <span className="font-medium">
                  {ref.book} {ref.chapter}:{ref.verseStart}
                </span>
                <p className="italic mt-1">"{ref.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
