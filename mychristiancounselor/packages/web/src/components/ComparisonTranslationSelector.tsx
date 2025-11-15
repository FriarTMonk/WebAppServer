'use client';

import React from 'react';
import { BibleTranslation, TRANSLATIONS } from '@mychristiancounselor/shared';

interface ComparisonTranslationSelectorProps {
  selectedTranslations: BibleTranslation[];
  onTranslationsChange: (translations: BibleTranslation[]) => void;
}

export function ComparisonTranslationSelector({
  selectedTranslations,
  onTranslationsChange,
}: ComparisonTranslationSelectorProps) {
  // Sort translations alphabetically by code
  const translations = Object.values(TRANSLATIONS).sort((a, b) => a.code.localeCompare(b.code));

  // Check if translation has Strong's numbers
  const hasStrongs = (translation: typeof TRANSLATIONS[keyof typeof TRANSLATIONS]) => {
    return translation.characteristics?.some(c => c.toLowerCase().includes("strong's"));
  };

  const handleToggle = (code: BibleTranslation) => {
    const isSelected = selectedTranslations.includes(code);

    if (isSelected) {
      // Prevent deselecting if it would leave less than 2 selected
      if (selectedTranslations.length <= 2) {
        return;
      }
      onTranslationsChange(selectedTranslations.filter(t => t !== code));
    } else {
      // Prevent selecting more than 4
      if (selectedTranslations.length >= 4) {
        return;
      }
      onTranslationsChange([...selectedTranslations, code]);
    }
  };

  const isDisabled = (code: BibleTranslation) => {
    const isSelected = selectedTranslations.includes(code);
    return !isSelected && selectedTranslations.length >= 4;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Compare Translations
        </h3>
        <p className="text-xs text-gray-500">
          Select 2-4 translations to compare ({selectedTranslations.length} selected)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {translations.map((translation) => {
          const isSelected = selectedTranslations.includes(translation.code);
          const disabled = isDisabled(translation.code);

          return (
            <label
              key={translation.code}
              className={`
                flex items-center gap-2 p-2 rounded border cursor-pointer
                transition-colors
                ${isSelected
                  ? 'bg-blue-50 border-blue-300'
                  : disabled
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(translation.code)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {translation.name}{hasStrongs(translation) ? ' *' : ''}
                </div>
                <div className="text-xs text-gray-500">
                  {translation.fullName}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {selectedTranslations.length < 2 && (
        <p className="text-xs text-red-600 mt-2">
          Please select at least 2 translations
        </p>
      )}
    </div>
  );
}
