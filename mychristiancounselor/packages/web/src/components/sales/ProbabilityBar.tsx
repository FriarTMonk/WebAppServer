import React from 'react';

interface ProbabilityBarProps {
  probability: number; // 0-100
  className?: string;
}

export function ProbabilityBar({ probability, className = '' }: ProbabilityBarProps) {
  // Clamp probability between 0 and 100
  const value = Math.max(0, Math.min(100, probability));

  // Determine color based on probability
  const getColor = () => {
    if (value >= 75) return { bg: 'bg-green-600', text: 'text-green-700' };
    if (value >= 50) return { bg: 'bg-blue-600', text: 'text-blue-700' };
    if (value >= 25) return { bg: 'bg-yellow-600', text: 'text-yellow-700' };
    return { bg: 'bg-gray-600', text: 'text-gray-700' };
  };

  const colors = getColor();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[60px]">
        <div
          className={`h-full ${colors.bg} transition-all duration-300`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
      <span className={`text-sm font-medium ${colors.text} min-w-[3ch] text-right`}>
        {value}%
      </span>
    </div>
  );
}
