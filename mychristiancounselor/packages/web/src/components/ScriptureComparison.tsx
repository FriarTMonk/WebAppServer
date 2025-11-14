'use client';

import React from 'react';
import { ScriptureReference } from '@mychristiancounselor/shared';

interface ScriptureComparisonProps {
  scriptures: ScriptureReference[];
}

export function ScriptureComparison({ scriptures }: ScriptureComparisonProps) {
  // Group scriptures by book/chapter/verse
  const groupedScriptures = scriptures.reduce((acc, scripture) => {
    const key = `${scripture.book}-${scripture.chapter}-${scripture.verseStart}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(scripture);
    return acc;
  }, {} as Record<string, ScriptureReference[]>);

  // Only show verses that have multiple translations
  const comparisonVerses = Object.entries(groupedScriptures).filter(
    ([_, versions]) => versions.length > 1
  );

  // If no verses have multiple translations, show all verses with their single translation
  const versesToDisplay = comparisonVerses.length > 0
    ? comparisonVerses
    : Object.entries(groupedScriptures);

  return (
    <div className="space-y-4">
      {versesToDisplay.map(([key, versions]) => {
        const reference = versions[0];
        return (
          <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {/* Reference Header */}
            <div className="font-semibold text-blue-900 mb-3 text-lg">
              {reference.book} {reference.chapter}:{reference.verseStart}
              {versions.length === 1 && (
                <span className="text-sm ml-2 text-blue-700">({versions[0].translation} only)</span>
              )}
            </div>

            {/* Translation Comparison Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {versions.map((scripture) => (
                <div
                  key={scripture.translation}
                  className="bg-white border border-blue-300 rounded p-3"
                >
                  <div className="text-xs font-semibold text-blue-700 mb-2">
                    {scripture.translation}
                  </div>
                  <p className="text-blue-900 italic">"{scripture.text}"</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
