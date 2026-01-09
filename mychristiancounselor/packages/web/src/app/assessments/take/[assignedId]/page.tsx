'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseErrorMessage } from '@/lib/error-utils';

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold">Assessment Loading...</h1>
        </div>
      </div>
    </div>
  );
}
