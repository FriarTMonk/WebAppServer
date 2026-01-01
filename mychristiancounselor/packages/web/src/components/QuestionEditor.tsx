'use client';

import { useState } from 'react';
import { Question, QuestionType } from '@/types/assessment';
import { Trash2 } from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  onChange: (question: Question) => void;
  onDelete: () => void;
}

export default function QuestionEditor({ question, onChange, onDelete }: QuestionEditorProps) {
  const handleFieldChange = (field: keyof Question, value: any) => {
    onChange({ ...question, [field]: value });
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Question</h4>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
          title="Delete question"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text *
        </label>
        <textarea
          value={question.text}
          onChange={(e) => handleFieldChange('text', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          required
        />
      </div>

      {/* Question Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type *
        </label>
        <select
          value={question.type}
          onChange={(e) => handleFieldChange('type', e.target.value as QuestionType)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={QuestionType.MULTIPLE_CHOICE_SINGLE}>Multiple Choice (Single)</option>
          <option value={QuestionType.MULTIPLE_CHOICE_MULTI}>Multiple Choice (Multi)</option>
          <option value={QuestionType.TEXT_SHORT}>Short Text</option>
          <option value={QuestionType.TEXT_LONG}>Long Text</option>
          <option value={QuestionType.RATING_SCALE}>Rating Scale</option>
          <option value={QuestionType.YES_NO}>Yes/No</option>
        </select>
      </div>

      {/* Type-Specific Options */}
      {(question.type === QuestionType.MULTIPLE_CHOICE_SINGLE ||
        question.type === QuestionType.MULTIPLE_CHOICE_MULTI) && (
        <MultipleChoiceOptions question={question} onChange={onChange} />
      )}

      {question.type === QuestionType.RATING_SCALE && (
        <RatingScaleOptions question={question} onChange={onChange} />
      )}

      {/* Weight */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Weight
        </label>
        <input
          type="number"
          value={question.weight}
          onChange={(e) => handleFieldChange('weight', parseFloat(e.target.value) || 0)}
          min="0"
          step="0.1"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <input
          type="text"
          value={question.category}
          onChange={(e) => handleFieldChange('category', e.target.value)}
          placeholder="e.g., anxiety, depression, general"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Required Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`required-${question.id}`}
          checked={question.required}
          onChange={(e) => handleFieldChange('required', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor={`required-${question.id}`} className="ml-2 text-sm text-gray-700">
          Required
        </label>
      </div>
    </div>
  );
}

// Sub-component for multiple choice options
function MultipleChoiceOptions({
  question,
  onChange,
}: {
  question: Question;
  onChange: (question: Question) => void;
}) {
  const options = question.options || [];

  const addOption = () => {
    onChange({
      ...question,
      options: [...options, ''],
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange({ ...question, options: newOptions });
  };

  const deleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange({ ...question, options: newOptions });
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => deleteOption(index)}
              className="px-3 py-2 text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
      >
        + Add Option
      </button>
    </div>
  );
}

// Sub-component for rating scale options
function RatingScaleOptions({
  question,
  onChange,
}: {
  question: Question;
  onChange: (question: Question) => void;
}) {
  const scale = question.scale || { min: 1, max: 5, labels: {} };

  const updateScale = (field: 'min' | 'max', value: number) => {
    onChange({
      ...question,
      scale: { ...scale, [field]: value },
    });
  };

  const updateLabel = (value: number, label: string) => {
    const labels = { ...scale.labels };
    if (label.trim() === '') {
      delete labels[value];
    } else {
      labels[value] = label;
    }
    onChange({
      ...question,
      scale: { ...scale, labels },
    });
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Rating Scale *</label>
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Minimum</label>
          <input
            type="number"
            value={scale.min}
            onChange={(e) => updateScale('min', parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Maximum</label>
          <input
            type="number"
            value={scale.max}
            onChange={(e) => updateScale('max', parseInt(e.target.value) || 1)}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-xs text-gray-600">Labels (optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="text"
              value={scale.labels?.[scale.min] || ''}
              onChange={(e) => updateLabel(scale.min, e.target.value)}
              placeholder={`Label for ${scale.min}`}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <input
              type="text"
              value={scale.labels?.[scale.max] || ''}
              onChange={(e) => updateLabel(scale.max, e.target.value)}
              placeholder={`Label for ${scale.max}`}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
