# Phase 3 UI Build-Out Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build assessment taking page and enhanced reading list page

**Architecture:** Client-side React components with localStorage for draft saving, consuming Phase 2 REST APIs

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS

---

## Task 1: Create Assessment Taking Page Skeleton

**Files:**
- Create: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Create page file with basic structure**

```typescript
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
```

**Step 2: Test the page loads**

Navigate to: `http://localhost:3300/assessments/take/test-id`
Expected: Page displays "Assessment Loading..." text

**Step 3: Commit**

```bash
git add packages/web/src/app/assessments/take/[assignedId]/page.tsx
git commit -m "feat(web): create assessment taking page skeleton"
```

---

## Task 2: Build MultipleChoiceQuestion Component

**Files:**
- Create: `packages/web/src/components/assessments/MultipleChoiceQuestion.tsx`

**Step 1: Create component file**

```typescript
'use client';

interface MultipleChoiceQuestionProps {
  question: {
    id: string;
    text: string;
    options: string[];
    required: boolean;
  };
  value: string | null;
  onChange: (value: string) => void;
}

export function MultipleChoiceQuestion({ question, value, onChange }: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <label
            key={index}
            className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Test component renders**

Add temporary test in page.tsx:
```typescript
import { MultipleChoiceQuestion } from '@/components/assessments/MultipleChoiceQuestion';

// In return statement
<MultipleChoiceQuestion
  question={{
    id: 'test',
    text: 'Test question?',
    options: ['Option A', 'Option B', 'Option C'],
    required: true
  }}
  value={null}
  onChange={(val) => console.log(val)}
/>
```

Expected: Radio buttons display, clicking logs value to console

**Step 3: Remove test code**

Remove the temporary test code from page.tsx

**Step 4: Commit**

```bash
git add packages/web/src/components/assessments/MultipleChoiceQuestion.tsx
git commit -m "feat(web): add MultipleChoiceQuestion component"
```

---

## Task 3: Build ScaleQuestion Component

**Files:**
- Create: `packages/web/src/components/assessments/ScaleQuestion.tsx`

**Step 1: Create component file**

```typescript
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
```

**Step 2: Test component renders**

Add temporary test in page.tsx:
```typescript
import { ScaleQuestion } from '@/components/assessments/ScaleQuestion';

<ScaleQuestion
  question={{
    id: 'test',
    text: 'Rate your experience',
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: 'Poor',
    scaleMaxLabel: 'Excellent',
    required: true
  }}
  value={null}
  onChange={(val) => console.log(val)}
/>
```

Expected: Scale buttons display, clicking logs value to console

**Step 3: Remove test code**

Remove the temporary test code from page.tsx

**Step 4: Commit**

```bash
git add packages/web/src/components/assessments/ScaleQuestion.tsx
git commit -m "feat(web): add ScaleQuestion component"
```

---

## Task 4: Build TextQuestion Component

**Files:**
- Create: `packages/web/src/components/assessments/TextQuestion.tsx`

**Step 1: Create component file**

```typescript
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
```

**Step 2: Test component renders**

Add temporary test in page.tsx:
```typescript
import { TextQuestion } from '@/components/assessments/TextQuestion';

<TextQuestion
  question={{
    id: 'test',
    text: 'Describe your feelings',
    required: true
  }}
  value={null}
  onChange={(val) => console.log(val)}
/>
```

Expected: Textarea displays, typing logs value to console, character count appears

**Step 3: Remove test code**

Remove the temporary test code from page.tsx

**Step 4: Commit**

```bash
git add packages/web/src/components/assessments/TextQuestion.tsx
git commit -m "feat(web): add TextQuestion component"
```

---

## Task 5: Build AssessmentProgress Component

**Files:**
- Create: `packages/web/src/components/assessments/AssessmentProgress.tsx`

**Step 1: Create component file**

```typescript
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
```

**Step 2: Test component renders**

Add temporary test in page.tsx:
```typescript
import { AssessmentProgress } from '@/components/assessments/AssessmentProgress';

<AssessmentProgress
  currentQuestion={2}
  totalQuestions={10}
  answeredCount={3}
/>
```

Expected: Progress bar shows 30% filled, displays "Question 3 of 10" and "3 answered"

**Step 3: Remove test code**

Remove the temporary test code from page.tsx

**Step 4: Commit**

```bash
git add packages/web/src/components/assessments/AssessmentProgress.tsx
git commit -m "feat(web): add AssessmentProgress component"
```

---

## Task 6: Implement Assessment Fetching and State Management

**Files:**
- Modify: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Add data fetching logic**

Replace the return statement section with complete implementation:

```typescript
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseErrorMessage } from '@/lib/error-utils';
import { AssessmentProgress } from '@/components/assessments/AssessmentProgress';
import { MultipleChoiceQuestion } from '@/components/assessments/MultipleChoiceQuestion';
import { ScaleQuestion } from '@/components/assessments/ScaleQuestion';
import { TextQuestion } from '@/components/assessments/TextQuestion';

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

  // Fetch assessment on mount
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await assessmentApi.getAssignedAssessmentForm(assignedId);
        if (!response.ok) {
          const errorMessage = await parseErrorMessage(response, 'Failed to load assessment');
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setAssessment(data);

        // Load saved responses from localStorage
        const savedKey = `assessment_draft_${assignedId}`;
        const savedData = localStorage.getItem(savedKey);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setResponses(parsed.responses || {});
            setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
          } catch (e) {
            console.error('Failed to parse saved assessment data:', e);
          }
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to load assessment', 'error');
        router.push('/counsel');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assignedId, router]);

  // Save to localStorage whenever responses change
  useEffect(() => {
    if (assessment && Object.keys(responses).length > 0) {
      const savedKey = `assessment_draft_${assignedId}`;
      localStorage.setItem(savedKey, JSON.stringify({
        responses,
        currentQuestionIndex,
        savedAt: new Date().toISOString(),
      }));
    }
  }, [responses, currentQuestionIndex, assignedId, assessment]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  // Show results if assessment is completed
  if (assessment.status === 'completed' || results) {
    const displayScore = results?.score ?? assessment.score;
    const displayInterpretation = results?.interpretation ?? assessment.interpretation;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">{assessment.assessmentName}</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h2 className="text-xl font-semibold text-green-900">Assessment Completed</h2>
              </div>
              {displayScore !== null && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Your Score</div>
                  <div className="text-3xl font-bold text-gray-900">{displayScore}</div>
                </div>
              )}
              {displayInterpretation && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Interpretation</div>
                  <div className="text-gray-700 whitespace-pre-wrap">{displayInterpretation}</div>
                </div>
              )}
              <button
                onClick={() => router.push('/counsel')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const answeredCount = Object.keys(responses).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{assessment.assessmentName}</h1>
            {assessment.dueDate && (
              <p className="text-sm text-gray-600 mt-1">
                Due: {new Date(assessment.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <AssessmentProgress
            currentQuestion={currentQuestionIndex}
            totalQuestions={assessment.questions.length}
            answeredCount={answeredCount}
          />

          {/* Current Question */}
          <div className="py-4">
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <MultipleChoiceQuestion
                question={currentQuestion}
                value={responses[currentQuestion.id] || null}
                onChange={(value) => setResponses({ ...responses, [currentQuestion.id]: value })}
              />
            )}
            {currentQuestion.type === 'scale' && (
              <ScaleQuestion
                question={currentQuestion}
                value={responses[currentQuestion.id] || null}
                onChange={(value) => setResponses({ ...responses, [currentQuestion.id]: value })}
              />
            )}
            {currentQuestion.type === 'text' && (
              <TextQuestion
                question={currentQuestion}
                value={responses[currentQuestion.id] || null}
                onChange={(value) => setResponses({ ...responses, [currentQuestion.id]: value })}
              />
            )}
          </div>

          {/* Navigation Buttons - Placeholder for next task */}
          <div className="flex justify-between border-t pt-4">
            <button
              disabled
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test assessment fetching**

1. Run: `npm run dev` in packages/web
2. Navigate to: `http://localhost:3300/assessments/take/[valid-assessment-id]`
3. Expected: Assessment loads, displays first question with proper component based on type

**Step 3: Commit**

```bash
git add packages/web/src/app/assessments/take/[assignedId]/page.tsx
git commit -m "feat(web): add assessment fetching and state management"
```

---

## Task 7: Add Question Navigation (Previous/Next)

**Files:**
- Modify: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Add navigation handlers**

Find the navigation buttons section (near the end of the return statement) and replace with:

```typescript
// Navigation Buttons
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
      disabled={submitting}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
    >
      {submitting ? 'Submitting...' : 'Submit Assessment'}
    </button>
  )}
</div>
```

**Step 2: Test navigation**

1. Navigate through questions using Previous/Next buttons
2. Try advancing without answering required question - should show toast error
3. Answer required question and advance - should work
4. On last question, "Submit Assessment" button should appear

Expected: Navigation works, validation works, submit button appears on last question

**Step 3: Commit**

```bash
git add packages/web/src/app/assessments/take/[assignedId]/page.tsx
git commit -m "feat(web): add assessment question navigation"
```

---

## Task 8: Implement localStorage Draft Saving

**Files:**
- Modify: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Add draft saved indicator**

Add after the progress bar component:

```typescript
{/* Progress Bar */}
<AssessmentProgress
  currentQuestion={currentQuestionIndex}
  totalQuestions={assessment.questions.length}
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
```

**Step 2: Test draft saving**

1. Start assessment, answer a few questions
2. Close browser tab
3. Reopen same assessment URL
4. Expected: Returns to same question with all previous answers preserved, shows "Draft saved automatically"

**Step 3: Commit**

```bash
git add packages/web/src/app/assessments/take/[assignedId]/page.tsx
git commit -m "feat(web): add draft saved indicator for assessments"
```

---

## Task 9: Add Submit Functionality with Results Display

**Files:**
- Modify: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Step 1: Add submit handler**

Add this function before the return statement:

```typescript
const handleSubmit = async () => {
  // Validate all required questions are answered
  const unansweredRequired = assessment.questions.filter(
    q => q.required && !responses[q.id]
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
    const savedKey = `assessment_draft_${assignedId}`;
    localStorage.removeItem(savedKey);

    showToast('Assessment submitted successfully!', 'success');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Failed to submit assessment', 'error');
  } finally {
    setSubmitting(false);
  }
};
```

**Step 2: Connect submit handler to button**

Find the Submit Assessment button and update its onClick:

```typescript
<button
  onClick={handleSubmit}
  disabled={submitting}
  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
>
  {submitting ? 'Submitting...' : 'Submit Assessment'}
</button>
```

**Step 3: Test submission**

1. Complete all required questions in an assessment
2. Click "Submit Assessment"
3. Expected: Submits successfully, shows results screen with score and interpretation
4. LocalStorage draft should be cleared
5. Try skipping required questions - should show error and jump to first unanswered

**Step 4: Commit**

```bash
git add packages/web/src/app/assessments/take/[assignedId]/page.tsx
git commit -m "feat(web): add assessment submission with validation"
```

---

## Task 10: Enhance Reading List Page with API Integration

**Files:**
- Modify: `packages/web/src/app/resources/reading-list/page.tsx`

**Step 1: Replace placeholder data with API fetch**

Find the hardcoded empty array (line ~111) and replace with API integration:

```typescript
const [readingListItems, setReadingListItems] = useState<ReadingListItem[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchReadingList = async () => {
    try {
      const response = await fetch('/api/resources/reading-list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reading list');
      }

      const data = await response.json();
      setReadingListItems(data);
    } catch (error) {
      console.error('Error fetching reading list:', error);
      showToast('Failed to load reading list', 'error');
    } finally {
      setLoading(false);
    }
  };

  fetchReadingList();
}, []);
```

**Step 2: Add loading state to UI**

Replace the tab content section with loading handling:

```typescript
{loading ? (
  <div className="text-center py-12">
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>
  </div>
) : filteredItems.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-gray-500">No books in this list yet.</p>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {filteredItems.map((item) => (
      <div key={item.id} className="border rounded-lg p-4">
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-sm text-gray-600">{item.author}</p>
      </div>
    ))}
  </div>
)}
```

**Step 3: Test API integration**

1. Navigate to reading list page
2. Expected: Shows loading animation, then fetches and displays reading list items
3. Try with empty list - should show "No books in this list yet"

**Step 4: Commit**

```bash
git add packages/web/src/app/resources/reading-list/page.tsx
git commit -m "feat(web): integrate reading list with API"
```

---

## Task 11: Create ReadingListCard Component

**Files:**
- Create: `packages/web/src/components/reading-list/ReadingListCard.tsx`

**Step 1: Create component file**

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { showToast } from '../Toast';

interface ReadingListCardProps {
  item: {
    id: string;
    bookId: string;
    title: string;
    author: string;
    coverImageUrl?: string;
    status: 'want_to_read' | 'currently_reading' | 'finished';
    notes?: string;
    progress?: number;
    finishedAt?: string;
  };
  onUpdate: (itemId: string, updates: any) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export function ReadingListCard({ item, onUpdate, onRemove }: ReadingListCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [progress, setProgress] = useState(item.progress || 0);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await onUpdate(item.id, { status: newStatus });
      showToast('Status updated', 'success');
    } catch (error) {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setUpdating(true);
    try {
      await onUpdate(item.id, { notes });
      showToast('Notes saved', 'success');
      setShowNotes(false);
    } catch (error) {
      showToast('Failed to save notes', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleProgressUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdate(item.id, { progress });
      showToast('Progress updated', 'success');
    } catch (error) {
      showToast('Failed to update progress', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex space-x-3">
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt={item.title}
            width={80}
            height={120}
            className="rounded object-cover"
          />
        ) : (
          <div className="w-20 h-30 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400 text-xs">No cover</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.author}</p>
          {item.finishedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Finished: {new Date(item.finishedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Status Dropdown */}
      <select
        value={item.status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={updating}
        className="w-full px-3 py-2 border rounded text-sm"
      >
        <option value="want_to_read">Want to Read</option>
        <option value="currently_reading">Currently Reading</option>
        <option value="finished">Finished</option>
      </select>

      {/* Progress Bar (only for currently reading) */}
      {item.status === 'currently_reading' && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={handleProgressUpdate}
              onTouchEnd={handleProgressUpdate}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-12">{progress}%</span>
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showNotes ? 'Hide Notes' : 'Add Notes'}
        </button>
        {showNotes && (
          <div className="mt-2 space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your notes about this book..."
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={handleSaveNotes}
              disabled={updating}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save Notes
            </button>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => {
          if (confirm('Remove this book from your reading list?')) {
            onRemove(item.id);
          }
        }}
        className="text-sm text-red-600 hover:text-red-700"
      >
        Remove from List
      </button>
    </div>
  );
}
```

**Step 2: Update reading list page to use ReadingListCard**

In `packages/web/src/app/resources/reading-list/page.tsx`, add handlers and update grid:

```typescript
const handleUpdateItem = async (itemId: string, updates: any) => {
  const response = await fetch(`/api/resources/reading-list/${itemId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) throw new Error('Update failed');

  // Refresh list
  setReadingListItems(items =>
    items.map(item => item.id === itemId ? { ...item, ...updates } : item)
  );
};

const handleRemoveItem = async (itemId: string) => {
  const response = await fetch(`/api/resources/reading-list/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) throw new Error('Remove failed');

  setReadingListItems(items => items.filter(item => item.id !== itemId));
  showToast('Book removed from reading list', 'success');
};

// In grid rendering:
import { ReadingListCard } from '@/components/reading-list/ReadingListCard';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredItems.map((item) => (
    <ReadingListCard
      key={item.id}
      item={item}
      onUpdate={handleUpdateItem}
      onRemove={handleRemoveItem}
    />
  ))}
</div>
```

**Step 3: Test ReadingListCard**

1. View reading list with items
2. Change status - should update
3. Update progress bar - should save on release
4. Add notes and save - should persist
5. Remove item - should confirm and remove

Expected: All CRUD operations work, UI updates immediately

**Step 4: Commit**

```bash
git add packages/web/src/components/reading-list/ReadingListCard.tsx packages/web/src/app/resources/reading-list/page.tsx
git commit -m "feat(web): add ReadingListCard with CRUD operations"
```

---

## Task 12: Create AddToReadingListButton Component

**Files:**
- Create: `packages/web/src/components/reading-list/AddToReadingListButton.tsx`

**Step 1: Create component file**

```typescript
'use client';

import { useState } from 'react';
import { showToast } from '../Toast';

interface AddToReadingListButtonProps {
  bookId: string;
  bookTitle: string;
  size?: 'sm' | 'md' | 'lg';
  onAdded?: () => void;
}

export function AddToReadingListButton({
  bookId,
  bookTitle,
  size = 'md',
  onAdded
}: AddToReadingListButtonProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const response = await fetch('/api/resources/reading-list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          status: 'want_to_read',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add to reading list');
      }

      setAdded(true);
      showToast(`"${bookTitle}" added to reading list`, 'success');
      if (onAdded) onAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add to reading list';
      showToast(message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (added) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} bg-green-600 text-white rounded cursor-not-allowed flex items-center space-x-1`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Added</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className={`${sizeClasses[size]} bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span>{adding ? 'Adding...' : 'Add to List'}</span>
    </button>
  );
}
```

**Step 2: Test component standalone**

Create temporary test in reading list page:
```typescript
import { AddToReadingListButton } from '@/components/reading-list/AddToReadingListButton';

<AddToReadingListButton
  bookId="test-book-id"
  bookTitle="Test Book"
  size="md"
/>
```

Expected: Button displays, clicking adds book to reading list, shows success state

**Step 3: Remove test code**

**Step 4: Commit**

```bash
git add packages/web/src/components/reading-list/AddToReadingListButton.tsx
git commit -m "feat(web): add AddToReadingListButton component"
```

---

## Task 13: Update BookCard with Add Button

**Files:**
- Modify: `packages/web/src/components/BookCard.tsx`

**Step 1: Add AddToReadingListButton to BookCard**

Find line 57 (or near the Actions section) and add the button:

```typescript
import { AddToReadingListButton } from './reading-list/AddToReadingListButton';

// In the card actions section (around line 57):
<div className="flex items-center space-x-2">
  <AddToReadingListButton
    bookId={book.id}
    bookTitle={book.title}
    size="sm"
  />
  <button
    onClick={onClick}
    className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
  >
    View Details
  </button>
</div>
```

**Step 2: Test BookCard integration**

1. Navigate to books page
2. Each book card should show "Add to List" button
3. Click button - should add to reading list
4. Button changes to "Added" state

Expected: Books can be added to reading list from browse page

**Step 3: Commit**

```bash
git add packages/web/src/components/BookCard.tsx
git commit -m "feat(web): add reading list button to BookCard"
```

---

## Task 14: Remove "Coming Soon" Notice and Add Stats

**Files:**
- Modify: `packages/web/src/app/resources/reading-list/page.tsx`

**Step 1: Remove "Coming Soon" notice**

Find and delete lines 212-217 (the "Coming Soon" notice and explanation text).

**Step 2: Add stats cards above tabs**

Add this section after the header and before the tabs:

```typescript
{/* Stats Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="text-2xl font-bold text-blue-900">
      {readingListItems.length}
    </div>
    <div className="text-sm text-blue-700">Total Books</div>
  </div>
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="text-2xl font-bold text-green-900">
      {readingListItems.filter(item =>
        item.status === 'finished' &&
        item.finishedAt &&
        new Date(item.finishedAt).getFullYear() === new Date().getFullYear()
      ).length}
    </div>
    <div className="text-sm text-green-700">Finished This Year</div>
  </div>
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
    <div className="text-2xl font-bold text-purple-900">
      {readingListItems.filter(item => item.status === 'currently_reading').length}
    </div>
    <div className="text-sm text-purple-700">Currently Reading</div>
  </div>
</div>
```

**Step 3: Test complete reading list page**

1. Navigate to reading list
2. Should see stats cards with counts
3. No "Coming Soon" notice
4. All CRUD operations work
5. Filters work correctly

Expected: Full reading list functionality with no placeholder content

**Step 4: Run full test suite**

```bash
cd packages/web
npm run build
npm run dev
```

Visit all Phase 3 pages:
- `/assessments/take/[id]` - Assessment taking works end-to-end
- `/resources/reading-list` - Reading list fully functional

**Step 5: Commit**

```bash
git add packages/web/src/app/resources/reading-list/page.tsx
git commit -m "feat(web): complete reading list page with stats"
```

---

## Implementation Complete

**What was built:**

### Assessment Taking Page
- Dynamic route at `/assessments/take/[assignedId]`
- 4 reusable question components (MultipleChoice, Scale, Text, Progress)
- Wizard navigation with validation
- localStorage draft saving
- Results display after submission
- Prevents re-submission of completed assessments

### Enhanced Reading List Page
- Full API integration with Phase 2 endpoints
- Stats cards (total, finished this year, currently reading)
- Interactive ReadingListCard with status updates, progress tracking, and notes
- AddToReadingListButton component for easy book additions
- Integrated into BookCard for seamless UX
- Removed all "Coming Soon" placeholders

**Files created:** 9
**Files modified:** 3
**Total commits:** 14

**Testing:**
- Test all assessment question types
- Test assessment navigation and validation
- Test localStorage draft persistence
- Test assessment submission and results
- Test reading list CRUD operations
- Test add to reading list from books page
- Test reading list filters and stats

**Next steps:**
- Continue with remaining incomplete features from the design document
- Address any UX feedback from user testing
- Performance optimization if needed
