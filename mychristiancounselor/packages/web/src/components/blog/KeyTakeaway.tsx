'use client';

import { useState, useId } from 'react';

interface KeyTakeawayProps {
  title?: string;
  children: React.ReactNode;
}

export default function KeyTakeaway({
  title = 'Key Takeaways',
  children
}: KeyTakeawayProps) {
  const id = useId();
  const contentId = `keytakeaway-${id}`;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-8 md:my-12 bg-teal-50 border-l-4 border-teal-500 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 md:py-3 flex items-center justify-between hover:bg-teal-100 focus:outline-none focus:ring-4 focus:ring-teal-300 focus:ring-inset transition-colors min-h-[44px]"
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`Toggle ${title}`}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-bold text-teal-900">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-teal-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={contentId}
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 text-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}
