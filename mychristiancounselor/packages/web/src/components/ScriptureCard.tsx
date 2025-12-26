import React, { useState } from 'react';
import { ScriptureReference } from '@mychristiancounselor/shared';

interface ScriptureCardProps {
  scripture: ScriptureReference;
  relatedScriptures?: ScriptureReference[];
  isNested?: boolean;
}

export function ScriptureCard({
  scripture,
  relatedScriptures = [],
  isNested = false
}: ScriptureCardProps) {
  const [showStrongs, setShowStrongs] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [hoveredStrong, setHoveredStrong] = useState<string | null>(null);
  const hasStrongs = scripture.strongs && scripture.strongs.length > 0;
  const hasRelated = relatedScriptures.length > 0;

  // Determine if a Strong's number is Greek (G) or Hebrew (H)
  const getStrongsType = (number: string): 'greek' | 'hebrew' => {
    return number.startsWith('G') ? 'greek' : 'hebrew';
  };

  // Get color classes based on Strong's type
  const getStrongsColorClass = (number: string): string => {
    const type = getStrongsType(number);
    return type === 'greek'
      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
      : 'bg-amber-50 border-amber-300 hover:bg-amber-100';
  };

  const getStrongsTextColor = (number: string): string => {
    const type = getStrongsType(number);
    return type === 'greek' ? 'text-blue-700' : 'text-amber-700';
  };

  // Generate external link for Strong's number
  const getStrongsLink = (number: string): string => {
    // Blue Letter Bible link (most comprehensive)
    return `https://www.blueletterbible.org/lexicon/${number.toLowerCase()}/kjv/wlc/0-1/`;
  };

  // Get source badge styling
  const getSourceBadge = () => {
    if (!scripture.source) return null;

    const badges = {
      'ai-cited': {
        label: 'AI Cited',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        title: 'Directly referenced by the AI counselor'
      },
      'related': {
        label: 'Related',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-300',
        title: 'Contextually related verse'
      },
      'theme': {
        label: 'Theme',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-300',
        title: 'Thematically relevant verse'
      }
    };

    const badge = badges[scripture.source];
    if (!badge) return null;

    return (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
        title={badge.title}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <div className={`border border-blue-200 rounded-lg mb-3 ${
      isNested ? 'ml-4 bg-blue-50/50 p-3' : 'bg-blue-50 p-4'
    }`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 font-semibold text-blue-900">
          <span>
            {scripture.book} {scripture.chapter}:{scripture.verseStart}{' '}
            {scripture.theme && <span className="italic font-normal">({scripture.theme})</span>}{' '}
            ({scripture.translation})
          </span>
          {getSourceBadge()}
        </div>
        {hasStrongs && !isNested && (
          <button
            onClick={() => setShowStrongs(!showStrongs)}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            {showStrongs ? 'Hide' : 'Show'} Strong's
          </button>
        )}
      </div>
      <p className="text-blue-800 italic">"{scripture.text}"</p>

      {/* Related toggle button */}
      {hasRelated && !isNested && (
        <button
          onClick={() => setShowRelated(!showRelated)}
          className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          {showRelated ? 'Hide' : 'Show'} Related ({relatedScriptures.length})
        </button>
      )}

      {hasStrongs && showStrongs && (
        <div className="mt-3 pt-3 border-t border-blue-300">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-2">
            <span>Strong's Concordance:</span>
            <span className="text-[10px] font-normal text-blue-600">
              (Click number for full definition)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
              Greek (NT)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
              Hebrew (OT)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {scripture.strongs?.map((strong, idx) => (
              <a
                key={idx}
                href={getStrongsLink(strong.number)}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  border rounded p-2 text-xs transition-all cursor-pointer
                  ${getStrongsColorClass(strong.number)}
                  ${hoveredStrong === strong.number ? 'shadow-md scale-105' : ''}
                `}
                onMouseEnter={() => setHoveredStrong(strong.number)}
                onMouseLeave={() => setHoveredStrong(null)}
                title={`Click to view full definition for ${strong.number} on Blue Letter Bible`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className={`font-mono font-semibold ${getStrongsTextColor(strong.number)}`}>
                      {strong.number}
                    </div>
                    <div className="text-gray-700 mt-0.5 break-words">
                      {strong.word}
                    </div>
                  </div>
                  <svg
                    className={`w-3 h-3 flex-shrink-0 mt-0.5 ${getStrongsTextColor(strong.number)} opacity-60`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {hasRelated && showRelated && !isNested && (
        <div className="mt-3 pl-4 border-l-2 border-blue-300">
          <h4 className="text-xs font-semibold text-blue-900 mb-2">
            Related Scriptures:
          </h4>
          <div className="space-y-2">
            {relatedScriptures.map((related) => (
              <ScriptureCard
                key={`${related.book}-${related.chapter}-${related.verseStart}`}
                scripture={related}
                isNested={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
