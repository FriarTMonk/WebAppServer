'use client';

interface QuestionProgressProps {
  currentCount: number;
  maxCount: number;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
}

export default function QuestionProgressIndicator({
  currentCount,
  maxCount,
  subscriptionStatus,
}: QuestionProgressProps) {
  if (maxCount === 0) {
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          ⚡ One-time answer only (no clarifying questions)
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          Sign up for more detailed counseling with clarifying questions
        </p>
      </div>
    );
  }

  const isAtLimit = currentCount >= maxCount;
  const progressPercentage = (currentCount / maxCount) * 100;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-blue-900">
          Clarifying Questions
        </p>
        <p className="text-sm text-blue-700">
          {currentCount} of {maxCount} used
        </p>
      </div>

      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {isAtLimit && subscriptionStatus !== 'active' && (
        <p className="text-xs text-blue-600 mt-2">
          💎 Upgrade to premium for deeper exploration (up to 9 questions)
        </p>
      )}
    </div>
  );
}
