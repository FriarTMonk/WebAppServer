'use client';

interface ScaleQuestionProps {
  question: {
    id: string;
    text: string;
    scaleMin: number;
    scaleMax: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
    required: boolean;
  };
  value: number | null;
  onChange: (value: number) => void;
}

export function ScaleQuestion({ question, value, onChange }: ScaleQuestionProps) {
  const range = Array.from(
    { length: question.scaleMax - question.scaleMin + 1 },
    (_, i) => question.scaleMin + i
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          {range.map((num) => (
            <button
              key={num}
              onClick={() => onChange(num)}
              className={`w-12 h-12 rounded-full border-2 font-semibold transition-all ${
                value === num
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        {(question.scaleMinLabel || question.scaleMaxLabel) && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>{question.scaleMinLabel || ''}</span>
            <span>{question.scaleMaxLabel || ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
