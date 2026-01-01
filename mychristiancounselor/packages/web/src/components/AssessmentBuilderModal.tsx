'use client';

import { useState, useEffect } from 'react';
import { CustomAssessment, Question, QuestionType, ScoringRules, CategoryScoring } from '@/types/assessment';
import QuestionEditor from './QuestionEditor';

interface AssessmentBuilderModalProps {
  type: 'custom_assessment' | 'custom_questionnaire';
  onSave: (assessment: Partial<CustomAssessment>) => void;
  onClose: () => void;
  existingAssessment?: CustomAssessment;
}

export default function AssessmentBuilderModal({
  type,
  onSave,
  onClose,
  existingAssessment,
}: AssessmentBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState(existingAssessment?.name || '');
  const [category, setCategory] = useState(existingAssessment?.category || '');
  const [questions, setQuestions] = useState<Question[]>(existingAssessment?.questions || []);
  const [scoringRules, setScoringRules] = useState<ScoringRules | undefined>(
    existingAssessment?.scoringRules
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (name.trim().length < 3) {
        newErrors.name = 'Name must be at least 3 characters';
      }
    } else if (step === 2) {
      if (questions.length === 0) {
        newErrors.questions = 'At least one question is required';
      } else {
        const invalidQuestions = questions.filter(
          (q) => !q.text.trim() || !q.category.trim()
        );
        if (invalidQuestions.length > 0) {
          newErrors.questions = 'All questions must have text and category';
        }
      }
    } else if (step === 3 && type === 'custom_assessment') {
      if (!scoringRules || scoringRules.categories.length === 0) {
        newErrors.scoring = 'Scoring rules are required for assessments';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2 && type === 'custom_assessment' && !scoringRules) {
        // Auto-generate scoring rules based on question categories
        initializeScoringRules();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  // Navigate to previous step
  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  // Initialize scoring rules based on question categories
  const initializeScoringRules = () => {
    const categories = Array.from(new Set(questions.map((q) => q.category)));
    const categoryScoring: CategoryScoring[] = categories.map((cat) => ({
      name: cat,
      interpretations: [
        { maxPercent: 25, label: 'Low', description: `Low ${cat} level` },
        { maxPercent: 50, label: 'Mild', description: `Mild ${cat} level` },
        { maxPercent: 75, label: 'Moderate', description: `Moderate ${cat} level` },
        { maxPercent: 100, label: 'Severe', description: `Severe ${cat} level` },
      ],
    }));

    setScoringRules({
      categories: categoryScoring,
      overallInterpretations: [
        { maxPercent: 25, label: 'Low', description: 'Low overall score' },
        { maxPercent: 50, label: 'Mild', description: 'Mild overall score' },
        { maxPercent: 75, label: 'Moderate', description: 'Moderate overall score' },
        { maxPercent: 100, label: 'Severe', description: 'Severe overall score' },
      ],
    });
  };

  // Add new question
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: '',
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      required: true,
      weight: 1,
      category: category || 'general',
    };
    setQuestions([...questions, newQuestion]);
  };

  // Update question
  const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Save assessment
  const handleSave = () => {
    const finalStep = type === 'custom_assessment' ? 3 : 2;
    if (validateStep(finalStep)) {
      const assessment: Partial<CustomAssessment> = {
        name: name.trim(),
        type,
        category: category.trim() || undefined,
        questions,
        scoringRules: type === 'custom_assessment' ? scoringRules : undefined,
      };
      onSave(assessment);
    }
  };

  const totalSteps = type === 'custom_assessment' ? 3 : 2;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold">
            {existingAssessment ? 'Edit' : 'Create'}{' '}
            {type === 'custom_assessment' ? 'Assessment' : 'Questionnaire'}
          </h2>

          {/* Step Indicators */}
          <div className="flex items-center mt-4 space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-12 h-1 ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <Step1BasicInfo
              name={name}
              setName={setName}
              category={category}
              setCategory={setCategory}
              errors={errors}
            />
          )}

          {currentStep === 2 && (
            <Step2Questions
              questions={questions}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              errors={errors}
            />
          )}

          {currentStep === 3 && type === 'custom_assessment' && (
            <Step3Scoring scoringRules={scoringRules} errors={errors} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Basic Info
function Step1BasicInfo({
  name,
  setName,
  category,
  setCategory,
  errors,
}: {
  name: string;
  setName: (name: string) => void;
  category: string;
  setCategory: (category: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Custom Anxiety Assessment"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category (Optional)
        </label>
        <input
          type="text"
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., anxiety, depression, general"
        />
        <p className="text-gray-600 text-sm mt-1">
          This will be used as the default category for new questions.
        </p>
      </div>
    </div>
  );
}

// Step 2: Questions
function Step2Questions({
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  errors,
}: {
  questions: Question[];
  onAddQuestion: () => void;
  onUpdateQuestion: (index: number, question: Question) => void;
  onDeleteQuestion: (index: number) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Questions</h3>
        <button
          type="button"
          onClick={onAddQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Question
        </button>
      </div>

      {errors.questions && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {errors.questions}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No questions yet. Click &quot;Add Question&quot; to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Question {index + 1}</span>
              </div>
              <QuestionEditor
                question={question}
                onChange={(updated) => onUpdateQuestion(index, updated)}
                onDelete={() => onDeleteQuestion(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 3: Scoring (for assessments only)
function Step3Scoring({
  scoringRules,
  errors,
}: {
  scoringRules?: ScoringRules;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Scoring Rules</h3>

      {errors.scoring && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {errors.scoring}
        </div>
      )}

      {scoringRules ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              Scoring rules have been automatically generated based on your question categories.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Category Scoring</h4>
            <div className="space-y-2">
              {scoringRules.categories.map((cat, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {cat.interpretations.length} interpretation ranges defined
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Overall Interpretations</h4>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs text-gray-600">
                {scoringRules.overallInterpretations.length} interpretation ranges defined
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              Note: You can edit these scoring rules after creation using the assessment management interface.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Scoring rules will be generated based on your questions.
        </div>
      )}
    </div>
  );
}
