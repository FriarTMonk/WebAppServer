'use client';

interface AlignmentScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function AlignmentScoreBadge({ score, size = 'medium' }: AlignmentScoreBadgeProps) {
  // Determine tier and styling
  const getStyles = () => {
    if (score >= 90) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        icon: '✓',
        label: 'Globally Aligned',
      };
    } else if (score >= 70) {
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
    <div className={`inline-flex items-center gap-2 ${bgColor} ${textColor} ${borderColor} border rounded-lg ${container}`}>
      <span className={scoreClass}>{score}%</span>
      <span className="font-medium">
        {icon} {label}
      </span>
    </div>
  );
}
