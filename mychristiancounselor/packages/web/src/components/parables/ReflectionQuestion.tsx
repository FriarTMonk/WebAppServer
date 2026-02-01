import React from 'react';

interface ReflectionQuestionProps {
  children: React.ReactNode;
}

export function ReflectionQuestion({ children }: ReflectionQuestionProps) {
  return (
    <div className="my-8 p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-300">
      <div className="flex items-start">
        <svg
          className="h-7 w-7 text-green-600 mr-3 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Reflect on This
          </h3>
          <div className="text-gray-800 italic">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
