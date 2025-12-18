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
  const remainingQuestions = maxCount - currentCount;
  const progressPercentage = (currentCount / maxCount) * 100;

  // Determine question phase (matches backend logic)
  // Free users (3 questions): Q0=broad, Q1=specific, Q2+=critical
  // Subscribed users (6 questions): Q0=broad, Q1-2=specific, Q3-5=critical
  const specificPhaseEnd = maxCount === 3 ? 1 : 2;
  let phaseMessage: string;
  let phaseColor: string;

  if (isAtLimit) {
    phaseMessage = '🎯 Biblical guidance will now be provided based on the information gathered';
    phaseColor = 'red';
  } else if (currentCount === 0) {
    phaseMessage = '📋 Broad understanding phase - exploring your situation';
    phaseColor = 'blue';
  } else if (currentCount <= specificPhaseEnd) {
    phaseMessage = '🔍 Specific details phase - drilling into key aspects';
    phaseColor = 'blue';
  } else {
    phaseMessage = '⚠️ Critical questions only - preparing final Biblical counsel';
    phaseColor = 'orange';
  }

  return (
    <div
      className={`mb-4 p-3 rounded-md ${
        phaseColor === 'red'
          ? 'bg-red-50 border border-red-200'
          : phaseColor === 'orange'
          ? 'bg-orange-50 border border-orange-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <p
          className={`text-sm font-medium ${
            phaseColor === 'red'
              ? 'text-red-900'
              : phaseColor === 'orange'
              ? 'text-orange-900'
              : 'text-blue-900'
          }`}
        >
          Clarifying Questions
        </p>
        <p
          className={`text-sm ${
            phaseColor === 'red'
              ? 'text-red-700'
              : phaseColor === 'orange'
              ? 'text-orange-700'
              : 'text-blue-700'
          }`}
        >
          {currentCount} of {maxCount} used
        </p>
      </div>

      <div
        className={`w-full rounded-full h-2 ${
          phaseColor === 'red'
            ? 'bg-red-200'
            : phaseColor === 'orange'
            ? 'bg-orange-200'
            : 'bg-blue-200'
        }`}
      >
        <div
          className={`h-2 rounded-full transition-all ${
            phaseColor === 'red'
              ? 'bg-red-500'
              : phaseColor === 'orange'
              ? 'bg-orange-500'
              : 'bg-blue-600'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <p
        className={`text-xs mt-2 ${
          phaseColor === 'red'
            ? 'text-red-700'
            : phaseColor === 'orange'
            ? 'text-orange-700'
            : 'text-blue-700'
        }`}
      >
        {phaseMessage}
      </p>

      {!isAtLimit && remainingQuestions <= 2 && (
        <p
          className={`text-xs mt-1 font-medium ${
            phaseColor === 'orange' ? 'text-orange-800' : 'text-blue-800'
          }`}
        >
          {remainingQuestions === 1
            ? '⏰ Last question available - Biblical counsel coming next'
            : `⏰ ${remainingQuestions} questions remaining before final answer`}
        </p>
      )}

      {isAtLimit && subscriptionStatus !== 'active' && (
        <p className="text-xs text-red-600 mt-1">
          💎 Upgrade to premium for deeper exploration (up to 6 questions)
        </p>
      )}
    </div>
  );
}
