'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseErrorMessage } from '@/lib/error-utils';
import MultipleChoiceQuestion from '@/components/assessments/MultipleChoiceQuestion';
import ScaleQuestion from '@/components/assessments/ScaleQuestion';
import TextQuestion from '@/components/assessments/TextQuestion';
import AssessmentProgress from '@/components/assessments/AssessmentProgress';

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
        const data = await assessmentApi.getAssignedAssessmentForm(assignedId);
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
        showToast(parseErrorMessage(error), 'error');
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
      showToast('Please answer all required questions before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await assessmentApi.submitAssignedAssessment(assignedId, responses);
      setResults(result);
      localStorage.removeItem(`assessment_${assignedId}`);
      showToast('Assessment submitted successfully!', 'success');
    } catch (error) {
      showToast(parseErrorMessage(error), 'error');
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
        <AssessmentProgress current={answeredCount} total={totalQuestions} />

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
              question={currentQuestion.text}
              options={currentQuestion.options || []}
              value={responses[currentQuestion.id]}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
              required={currentQuestion.required}
            />
          )}

          {currentQuestion.type === 'scale' && (
            <ScaleQuestion
              question={currentQuestion.text}
              min={currentQuestion.scaleMin || 1}
              max={currentQuestion.scaleMax || 10}
              minLabel={currentQuestion.scaleMinLabel}
              maxLabel={currentQuestion.scaleMaxLabel}
              value={responses[currentQuestion.id]}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
              required={currentQuestion.required}
            />
          )}

          {currentQuestion.type === 'text' && (
            <TextQuestion
              question={currentQuestion.text}
              value={responses[currentQuestion.id] || ''}
              onChange={(value) => handleResponseChange(currentQuestion.id, value)}
              required={currentQuestion.required}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            disabled={true}
            className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
          >
            Previous
          </button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          ) : (
            <button
              disabled={true}
              className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
