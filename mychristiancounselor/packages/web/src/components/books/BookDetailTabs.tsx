'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface DoctrineCategoryScore {
  category: string;
  score: number;
  notes?: string;
}

interface BookDetailTabsProps {
  book: {
    theologicalSummary?: string;
    scriptureComparisonNotes?: string;
    theologicalStrengths: string[];
    theologicalConcerns: string[];
    doctrineCategoryScores: DoctrineCategoryScore[];
    scoringReasoning?: string;
    endorsementCount: number;
  };
}

type TabId = 'summary' | 'analysis' | 'endorsements';

// Score thresholds for doctrine category scoring
const SCORE_THRESHOLD_HIGH = 85;
const SCORE_THRESHOLD_MEDIUM = 70;

export function BookDetailTabs({ book }: BookDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const tabs = [
    { id: 'summary' as TabId, label: 'Summary' },
    { id: 'analysis' as TabId, label: 'Analysis' },
    { id: 'endorsements' as TabId, label: 'Endorsements' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Tab Headers */}
      <div
        className="flex border-b border-gray-200"
        role="tablist"
        aria-label="Book details"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Summary Tab */}
        <div
          role="tabpanel"
          id="panel-summary"
          aria-labelledby="tab-summary"
          hidden={activeTab !== 'summary'}
        >
          <h3 className="text-lg font-bold mb-4 text-gray-900">
            Theological Summary
          </h3>
          {book.theologicalSummary ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {book.theologicalSummary}
            </p>
          ) : (
            <p className="text-gray-500 italic">
              No theological summary available.
            </p>
          )}

          {book.scriptureComparisonNotes && (
            <>
              <h3 className="text-lg font-bold mt-6 mb-4 text-gray-900">
                Scripture Comparison
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {book.scriptureComparisonNotes}
              </p>
            </>
          )}
        </div>

        {/* Analysis Tab */}
        <div
          role="tabpanel"
          id="panel-analysis"
          aria-labelledby="tab-analysis"
          hidden={activeTab !== 'analysis'}
        >
          {/* Doctrine Scores */}
          <h3 className="text-lg font-bold mb-4 text-gray-900">
            Doctrine Category Scores
          </h3>
          {book.doctrineCategoryScores.length > 0 ? (
            <div className="space-y-4 mb-6">
              {book.doctrineCategoryScores.map((category) => (
                <div key={category.category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {category.category}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {category.score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        category.score >= SCORE_THRESHOLD_HIGH
                          ? 'bg-green-500'
                          : category.score >= SCORE_THRESHOLD_MEDIUM
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      )}
                      style={{ width: `${category.score}%` }}
                      role="progressbar"
                      aria-valuenow={category.score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${category.category} score`}
                    />
                  </div>
                  {category.notes && (
                    <p className="text-xs text-gray-600 mt-1">
                      {category.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic mb-6">
              No doctrine category scores available.
            </p>
          )}

          {/* Strengths */}
          <h3 className="text-lg font-bold mb-4 text-gray-900">
            Theological Strengths
          </h3>
          {book.theologicalStrengths.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 mb-6 text-gray-700">
              {book.theologicalStrengths.map((strength, index) => (
                <li key={`strength-${index}`}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic mb-6">
              No theological strengths available.
            </p>
          )}

          {/* Concerns */}
          <h3 className="text-lg font-bold mb-4 text-gray-900">
            Theological Concerns
          </h3>
          {book.theologicalConcerns.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 mb-6 text-gray-700">
              {book.theologicalConcerns.map((concern, index) => (
                <li key={`concern-${index}`}>{concern}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic mb-6">
              No theological concerns available.
            </p>
          )}

          {/* Scoring Reasoning */}
          {book.scoringReasoning && (
            <>
              <h3 className="text-lg font-bold mb-4 text-gray-900">
                Scoring Reasoning
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {book.scoringReasoning}
              </p>
            </>
          )}
        </div>

        {/* Endorsements Tab */}
        <div
          role="tabpanel"
          id="panel-endorsements"
          aria-labelledby="tab-endorsements"
          hidden={activeTab !== 'endorsements'}
        >
          <h3 className="text-lg font-bold mb-4 text-gray-900">
            Organization Endorsements
          </h3>
          {book.endorsementCount > 0 ? (
            <p className="text-gray-700">
              This book has been recommended by{' '}
              <strong>{book.endorsementCount}</strong> organization
              {book.endorsementCount !== 1 ? 's' : ''}.
            </p>
          ) : (
            <p className="text-gray-500 italic">
              No organization endorsements available.
            </p>
          )}
          {/* TODO Phase 3: Add endorsement details list */}
        </div>
      </div>
    </div>
  );
}
