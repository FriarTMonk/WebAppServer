'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseErrorMessage } from '@/lib/error-utils';
import { MultipleChoiceQuestion } from '@/components/assessments/MultipleChoiceQuestion';
import { ScaleQuestion } from '@/components/assessments/ScaleQuestion';
import { TextQuestion } from '@/components/assessments/TextQuestion';
import { AssessmentProgress } from '@/components/assessments/AssessmentProgress';

interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required: boolean;
}

interface AssessmentFormData {
  id: string;
  assessmentName: string;
  assignedAt: string;
  dueDate: string | null;
  status: 'pending' | 'completed';
  completedAt: string | null;
  score: number | null;
  interpretation: string | null;
  questions: AssessmentQuestion[];
}

export default function TakeAssessmentPage({ params }: { params: Promise<{ assignedId: string }> }) {
  const { assignedId } = use(params);
  const router = useRouter();
  const [assessment, setAssessment] = useState<AssessmentFormData | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ score: number; interpretation: string } | null>(null);

  // Fetch assessment data on mount
  useEffect(() => {
    async function fetchAssessment() {
      try {
        const response = await assessmentApi.getAssignedAssessmentForm(assignedId);
        if (!response.ok) {
          throw new Error('Failed to fetch assessment');
        }
        const data = await response.json();
        setAssessment(data);

        // If assessment is already completed, show results
        if (data.status === 'completed' && data.score !== null && data.interpretation !== null) {
          setResults({ score: data.score, interpretation: data.interpretation });
        }

        // Load saved responses from localStorage
        const savedResponses = localStorage.getItem(`assessment_${assignedId}`);
        if (savedResponses) {
          setResponses(JSON.parse(savedResponses));
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to load assessment', 'error');
        router.push('/counsel');
      } finally {
        setLoading(false);
      }
    }

    fetchAssessment();
  }, [assignedId, router]);

  // Save responses to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`assessment_${assignedId}`, JSON.stringify(responses));
    }
  }, [responses, assignedId]);

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    // Validate all required questions are answered
    const unansweredRequired = assessment.questions.filter(
      (q) => q.required && !responses[q.id]
    );

    if (unansweredRequired.length > 0) {
      showToast(`Please answer all required questions (${unansweredRequired.length} remaining)`, 'error');
      // Jump to first unanswered required question
      const firstUnansweredIndex = assessment.questions.findIndex(
        q => q.id === unansweredRequired[0].id
      );
      setCurrentQuestionIndex(firstUnansweredIndex);
      return;
    }

    setSubmitting(true);
    try {
      const response = await assessmentApi.submitAssignedAssessment(assignedId, { responses });
      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response, 'Failed to submit assessment');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setResults({
        score: result.score,
        interpretation: result.interpretation,
      });

      // Clear localStorage draft
      localStorage.removeItem(`assessment_${assignedId}`);

      showToast('Assessment submitted successfully!', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  // If assessment is completed, show results
  if (results) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.assessmentName}</h1>
            <p className="text-gray-600 mb-6">Assessment Completed</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Your Score</h2>
              <p className="text-4xl font-bold text-blue-600 mb-4">{results.score}</p>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Interpretation</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{results.interpretation}</p>
            </div>

            <button
              onClick={() => router.push('/counsel')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Counsel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const totalQuestions = assessment.questions.length;
  const answeredCount = Object.keys(responses).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar */}
        <AssessmentProgress
          currentQuestion={currentQuestionIndex}
          totalQuestions={totalQuestions}
          answeredCount={answeredCount}
        />

        {/* Draft Saved Indicator */}
        {Object.keys(responses).length > 0 && (
          <div className="flex items-center justify-center text-sm text-gray-500">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Draft saved automatically
          </div>
        )}

        {/* Assessment Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.assessmentName}</h1>
          <p className="text-gray-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
          {assessment.dueDate && (
            <p className="text-sm text-gray-500 mt-2">
              Due: {new Date(assessment.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Current Question */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {currentQuestion.type === 'multiple_choice' && (
            <MultipleChoiceQuestion
              question={{
                id: currentQuestion.id,
                text: currentQuestion.text,
                options: currentQuestion.options || [],
                required: currentQuestion.required
              }}
              value={responses[currentQuestion.id]}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
            />
          )}

          {currentQuestion.type === 'scale' && (
            <ScaleQuestion
              question={{
                id: currentQuestion.id,
                text: currentQuestion.text,
                scaleMin: currentQuestion.scaleMin || 1,
                scaleMax: currentQuestion.scaleMax || 10,
                scaleMinLabel: currentQuestion.scaleMinLabel,
                scaleMaxLabel: currentQuestion.scaleMaxLabel,
                required: currentQuestion.required
              }}
              value={responses[currentQuestion.id]}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
            />
          )}

          {currentQuestion.type === 'text' && (
            <TextQuestion
              question={{
                id: currentQuestion.id,
                text: currentQuestion.text,
                required: currentQuestion.required
              }}
              value={responses[currentQuestion.id] || ''}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between border-t pt-4">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentQuestionIndex < assessment.questions.length - 1 ? (
            <button
              onClick={() => {
                // Check if current question is required and answered
                if (currentQuestion.required && !responses[currentQuestion.id]) {
                  showToast('Please answer this required question', 'error');
                  return;
                }
                setCurrentQuestionIndex(currentQuestionIndex + 1);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
