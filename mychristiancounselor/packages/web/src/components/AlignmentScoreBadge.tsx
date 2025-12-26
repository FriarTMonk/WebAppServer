'use client';

import clsx from 'clsx';
import { ALIGNMENT_SCORE_THRESHOLDS } from '@mychristiancounselor/shared';

interface AlignmentScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function AlignmentScoreBadge({ score, size = 'medium' }: AlignmentScoreBadgeProps) {
  // Clamp score to valid range (0-100) for safety
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine tier and styling
  const getStyles = () => {
    if (clampedScore >= ALIGNMENT_SCORE_THRESHOLDS.GLOBALLY_ALIGNED) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        icon: '✓',
        label: 'Globally Aligned',
      };
    } else if (clampedScore >= ALIGNMENT_SCORE_THRESHOLDS.CONCEPTUALLY_ALIGNED) {
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300',
        icon: '⚠',
        label: 'Conceptually Aligned',
      };
    } else {
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        icon: '✗',
        label: 'Not Aligned',
      };
    }
  };

  const { bgColor, textColor, borderColor, icon, label } = getStyles();

  // Size classes
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-xs',
      score: 'text-sm font-bold',
    },
    medium: {
      container: 'px-3 py-1.5 text-sm',
      score: 'text-base font-bold',
    },
    large: {
      container: 'px-4 py-2 text-base',
      score: 'text-2xl font-bold',
    },
  };

  const { container, score: scoreClass } = sizeClasses[size];

  return (
    <div className={clsx('inline-flex items-center gap-2 border rounded-lg', bgColor, textColor, borderColor, container)}>
      <span className={scoreClass}>{clampedScore}%</span>
      <span className="font-medium">
        {icon} {label}
      </span>
    </div>
  );
}
