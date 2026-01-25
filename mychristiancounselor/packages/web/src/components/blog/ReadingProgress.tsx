'use client';

import { useEffect, useState } from 'react';

interface ReadingProgressProps {
  category?: string;
}

export default function ReadingProgress({ category = 'Mental Health' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const article = document.querySelector('article');
      if (!article) return;

      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrolled = window.scrollY - articleTop;
      const total = articleHeight - windowHeight;
      const percentage = Math.min(Math.max((scrolled / total) * 100, 0), 100);

      setProgress(percentage);
    };

    // Throttle with requestAnimationFrame
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    updateProgress(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Category color mapping
  const getGradient = () => {
    switch (category) {
      case 'Mental Health':
        return 'from-teal-500 to-teal-700';
      case 'Relationships':
        return 'from-rose-400 to-rose-600';
      case 'Faith & Spirituality':
        return 'from-amber-400 to-amber-600';
      case 'Parenting':
        return 'from-lime-500 to-lime-700';
      case 'Recovery':
      case 'Addiction':
        return 'from-purple-500 to-purple-700';
      default:
        return 'from-teal-500 to-teal-700';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-1 md:h-0.5 bg-gray-200 z-50">
      <div
        className={`h-full bg-gradient-to-r ${getGradient()} transition-all duration-150 ease-out`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
