import React from 'react';

interface ParableStoryProps {
  children: React.ReactNode;
}

export function ParableStory({ children }: ParableStoryProps) {
  return (
    <div className="relative my-8 p-6 bg-gradient-to-r from-amber-100/50 to-orange-100/50 rounded-lg border-l-4 border-amber-600">
      <div className="text-gray-800 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
