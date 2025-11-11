import React from 'react';
import { ScriptureReference } from '@mychrisiancounselor/shared';

interface ScriptureCardProps {
  scripture: ScriptureReference;
}

export function ScriptureCard({ scripture }: ScriptureCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
      <div className="font-semibold text-blue-900 mb-2">
        {scripture.book} {scripture.chapter}:{scripture.verseStart} ({scripture.translation})
      </div>
      <p className="text-blue-800 italic">"{scripture.text}"</p>
    </div>
  );
}
