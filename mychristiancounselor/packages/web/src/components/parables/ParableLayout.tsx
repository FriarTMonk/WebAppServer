import React from 'react';

interface ParableLayoutProps {
  children: React.ReactNode;
}

export function ParableLayout({ children }: ParableLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <article className="bg-white rounded-lg shadow-lg p-8 md:p-12">
        <div className="prose prose-lg max-w-none">
          {children}
        </div>
      </article>
    </div>
  );
}
