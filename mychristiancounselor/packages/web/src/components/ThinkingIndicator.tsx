'use client';

import { useState, useEffect } from 'react';

const THINKING_SYNONYMS = [
  'Thinking',
  'Pondering',
  'Reflecting',
  'Considering',
  'Contemplating',
  'Deliberating',
  'Cogitating',
  'Musing',
  'Ruminating',
  'Meditating',
];

export function ThinkingIndicator() {
  const [currentWord, setCurrentWord] = useState(THINKING_SYNONYMS[0]);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Randomly select initial word
    const randomIndex = Math.floor(Math.random() * THINKING_SYNONYMS.length);
    setCurrentWord(THINKING_SYNONYMS[randomIndex]);

    // Add a dot every second
    const dotInterval = setInterval(() => {
      setDots((prev) => prev + '.');
    }, 1000);

    // Change word and reset dots every 10 seconds
    const wordInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * THINKING_SYNONYMS.length);
      setCurrentWord(THINKING_SYNONYMS[randomIndex]);
      setDots('');
    }, 10000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(wordInterval);
    };
  }, []);

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="text-gray-600 font-medium">
          {currentWord}{dots}
        </div>
      </div>
    </div>
  );
}
