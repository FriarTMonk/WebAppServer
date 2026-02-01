import React from 'react';

interface ScriptureTieInProps {
  verse: string;
  version?: string;
  children: React.ReactNode;
}

export function ScriptureTieIn({ verse, version = 'NIV', children }: ScriptureTieInProps) {
  return (
    <div className="my-8 p-6 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-start mb-4">
        <svg
          className="h-6 w-6 text-purple-600 mr-3 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <div>
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Scripture Connection
          </h3>
          <p className="text-sm text-purple-700 font-medium">
            {verse} ({version})
          </p>
        </div>
      </div>
      <div className="text-gray-800 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
