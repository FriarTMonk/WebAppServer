'use client';

interface AssessmentProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
}

export function AssessmentProgress({
  currentQuestion,
  totalQuestions,
  answeredCount
}: AssessmentProgressProps) {
  const progressPercentage = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Question {currentQuestion + 1} of {totalQuestions}</span>
        <span>{answeredCount} answered</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
