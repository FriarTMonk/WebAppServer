'use client';

import React from 'react';
import { BibleTranslation, TRANSLATIONS } from '@mychristiancounselor/shared';

interface TranslationSelectorProps {
  selectedTranslation: BibleTranslation;
  onTranslationChange: (translation: BibleTranslation) => void;
}

export function TranslationSelector({ selectedTranslation, onTranslationChange }: TranslationSelectorProps) {
  // Sort translations alphabetically by code
  const translations = Object.values(TRANSLATIONS).sort((a, b) => a.code.localeCompare(b.code));

  // Check if translation has Strong's numbers
  const hasStrongs = (translation: typeof TRANSLATIONS[keyof typeof TRANSLATIONS]) => {
    return translation.characteristics?.some(c => c.toLowerCase().includes("strong's"));
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="translation-select" className="text-gray-600 font-medium">
        Bible Translation:
      </label>
      <select
        id="translation-select"
        value={selectedTranslation}
        onChange={(e) => onTranslationChange(e.target.value as BibleTranslation)}
        className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
      >
        {translations.map((translation) => (
          <option key={translation.code} value={translation.code}>
            {translation.name} - {translation.fullName}{hasStrongs(translation) ? ' *' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
