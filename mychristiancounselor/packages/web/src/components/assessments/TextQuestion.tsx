'use client';

interface TextQuestionProps {
  question: {
    id: string;
    text: string;
    required: boolean;
  };
  value: string | null;
  onChange: (value: string) => void;
}

export function TextQuestion({ question, value, onChange }: TextQuestionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Type your answer here..."
      />
      {value && (
        <div className="text-sm text-gray-500">
          {value.length} characters
        </div>
      )}
    </div>
  );
}
