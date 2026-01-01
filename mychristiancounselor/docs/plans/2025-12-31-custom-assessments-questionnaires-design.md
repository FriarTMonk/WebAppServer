# Custom Assessments & Questionnaires - Design Document

## Overview

Enable counselors to create and assign custom assessments and questionnaires to members. Custom assessments have weighted scoring by category, while questionnaires are unscored information-gathering tools. All custom assessments created within an organization are shared across all counselors in that organization.

## Key Features

- **Two types**: Custom Assessments (scored) and Custom Questionnaires (unscored)
- **Organization-scoped**: Assessments created by any counselor are visible to all counselors in the org
- **Flexible questions**: Multiple choice (single/multi), text (short/long), rating scales, yes/no
- **Weighted scoring**: Questions have weights (default 1.0), assigned to categories
- **Category + Overall scores**: Assessments produce overall percentage score plus category breakdowns
- **Interpretation ranges**: Counselor defines interpretation labels for score ranges

---

## Database Schema

### Enhanced Assessment Model

```prisma
model Assessment {
  id            String               @id @default(uuid())
  name          String
  type          AssessmentType       // Add 'custom_assessment' and 'custom_questionnaire'
  category      String?              // For filtering/organizing
  questions     Json                 // Enhanced structure (see below)
  scoringRules  Json                 // Enhanced for weighted categories
  organizationId String?             // NEW: Scope to organization
  isActive      Boolean              @default(true)
  createdBy     String?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  organization  Organization?        @relation(fields: [organizationId], references: [id])
  createdByUser User?                @relation(fields: [createdBy], references: [id])
  schedules     AssessmentSchedule[]
  assignments   AssignedAssessment[]

  @@index([organizationId])
  @@index([type, organizationId])
}

enum AssessmentType {
  clinical
  custom_assessment     // NEW: Scored custom assessment
  custom_questionnaire  // NEW: Unscored questionnaire
}
```

### Questions JSON Structure

```typescript
interface Question {
  id: string;           // Unique ID for question
  text: string;         // Question text
  type: QuestionType;   // Question type
  required: boolean;    // Is answer required?
  options?: string[];   // For multiple_choice_* and rating_scale
  scale?: {             // For rating_scale only
    min: number;
    max: number;
    labels?: Record<number, string>; // e.g., { 1: "Never", 5: "Always" }
  };
  weight: number;       // Weight for scoring (default 1.0)
  category: string;     // Category name (e.g., "anxiety", "depression")
}

type QuestionType =
  | "multiple_choice_single"
  | "multiple_choice_multi"
  | "text_short"
  | "text_long"
  | "rating_scale"
  | "yes_no";
```

### ScoringRules JSON Structure

For `custom_assessment` type only (not used for `custom_questionnaire`):

```typescript
interface ScoringRules {
  categories: CategoryScoring[];
  overallInterpretations: InterpretationRange[];
}

interface CategoryScoring {
  name: string;         // Category name (must match questions)
  interpretations: InterpretationRange[];
}

interface InterpretationRange {
  maxPercent: number;   // Upper bound of range (0-100)
  label: string;        // e.g., "Low", "Moderate", "High"
  description: string;  // e.g., "Minimal anxiety symptoms"
}

// Example:
{
  categories: [
    {
      name: "anxiety",
      interpretations: [
        { maxPercent: 33, label: "Low", description: "Minimal anxiety symptoms" },
        { maxPercent: 66, label: "Moderate", description: "Some anxiety present" },
        { maxPercent: 100, label: "High", description: "Significant anxiety symptoms" }
      ]
    },
    {
      name: "depression",
      interpretations: [
        { maxPercent: 33, label: "Low", description: "Minimal depressive symptoms" },
        { maxPercent: 66, label: "Moderate", description: "Some depression present" },
        { maxPercent: 100, label: "High", description: "Significant depressive symptoms" }
      ]
    }
  ],
  overallInterpretations: [
    { maxPercent: 33, label: "Low Concern", description: "Overall functioning appears healthy" },
    { maxPercent: 66, label: "Moderate Concern", description: "Some areas need attention" },
    { maxPercent: 100, label: "High Concern", description: "Multiple areas showing significant symptoms" }
  ]
}
```

### Scoring Calculation

**Overall Score:**
```
overall_score_percent = (sum of weighted_answers) / (sum of max_weighted_answers) * 100

Where:
- weighted_answer = answer_value * question_weight
- max_weighted_answer = max_possible_answer_value * question_weight
```

**Category Score:**
```
category_score_percent = (sum of weighted_answers in category) / (sum of max_weighted_answers in category) * 100
```

**Answer Values:**
- Rating scales: Use numeric value (1-5, 1-10, etc.)
- Multiple choice single: Assign values 0, 1, 2... to options
- Multiple choice multi: Sum of selected option values
- Yes/No: Yes=1, No=0
- Text: Not scored (excluded from calculations)

---

## API Endpoints

### New Controller: AssessmentLibraryController

Base path: `/counsel/assessments/library`

**List custom assessments for organization:**
```typescript
GET /counsel/assessments/library
Query params:
  - type?: "custom_assessment" | "custom_questionnaire"
Response: Assessment[]
```

**Get single assessment:**
```typescript
GET /counsel/assessments/library/:id
Response: Assessment (with full questions and scoringRules)
```

**Create custom assessment:**
```typescript
POST /counsel/assessments/library
Body: {
  name: string;
  type: "custom_assessment" | "custom_questionnaire";
  category?: string;
  questions: Question[];
  scoringRules?: ScoringRules; // Required for custom_assessment
}
Response: Created Assessment
```

**Update custom assessment:**
```typescript
PATCH /counsel/assessments/library/:id
Body: {
  name?: string;
  questions?: Question[];
  scoringRules?: ScoringRules;
  isActive?: boolean;
}
Response: Updated Assessment
Permissions: Only creator can update
```

**Delete custom assessment:**
```typescript
DELETE /counsel/assessments/library/:id
Response: Success
Permissions: Only creator can delete, only if no assignments exist
```

### Enhanced Existing Endpoint

```typescript
POST /counsel/assessments/assign
Body: {
  memberId: string;
  assessmentId: string; // Now supports custom assessments too
  dueDate?: DateTime;
}
Response: AssignedAssessment
```

### Permission Rules

- **VIEW**: Counselors can view all custom assessments in their organization
- **CREATE**: Counselors can create custom assessments (auto-scoped to their org)
- **UPDATE**: Counselors can only update assessments they created
- **DELETE**: Counselors can only delete assessments they created AND that have no assignments
- **ASSIGN**: Counselors can assign any active assessment in their organization

---

## UI Components

### 1. Enhanced AssignAssessmentModal.tsx

**Location**: `packages/web/src/components/AssignAssessmentModal.tsx` (existing, enhance)

**Changes:**
- Add type dropdown: "Clinical" | "Custom"
- When "Clinical" selected: Show clinical assessment list (existing behavior)
- When "Custom" selected:
  - Show list of organization's custom assessments & questionnaires
  - Show two buttons at top: "Create Assessment" | "Create Questionnaire"
  - List displays: name, type badge, created by, date created
  - Search/filter by name
  - Click to select assessment
  - Click create button → opens AssessmentBuilderModal
- Due date picker
- "Assign" button

### 2. New AssessmentBuilderModal.tsx

**Location**: `packages/web/src/components/AssessmentBuilderModal.tsx` (new)

**Props:**
```typescript
interface Props {
  type: "custom_assessment" | "custom_questionnaire";
  onSave: (assessment: Assessment) => void;
  onClose: () => void;
  existingAssessment?: Assessment; // For editing
}
```

**Structure:**
- Multi-step wizard
- **Step 1: Basic Info**
  - Name input
  - Description textarea (optional)
  - Category input (optional, for organizing)
- **Step 2: Questions**
  - List of questions (drag to reorder)
  - "Add Question" button
  - Each question shows QuestionEditor component
  - Delete button per question
- **Step 3: Scoring** (only for custom_assessment, skip for custom_questionnaire)
  - List of categories extracted from questions
  - Per category: Define interpretation ranges
  - Overall: Define interpretation ranges
- Navigation: Back/Next/Save buttons
- Preview mode toggle

### 3. New QuestionEditor.tsx

**Location**: `packages/web/src/components/QuestionEditor.tsx` (new)

**Props:**
```typescript
interface Props {
  question: Question;
  onChange: (question: Question) => void;
  onDelete: () => void;
}
```

**Structure:**
- Question text input
- Type selector dropdown
- **Type-specific options:**
  - Multiple choice: Add/remove options
  - Rating scale: Min/max inputs, label inputs for endpoints
  - Text: Short/long toggle
  - Yes/No: No options needed
- Weight input (number, default 1.0)
- Category input/selector
- Required checkbox

### 4. Enhanced MemberAssessmentsCard.tsx

**Location**: `packages/web/src/components/MemberAssessmentsCard.tsx` (existing)

**Changes:**
- Display custom assessments/questionnaires alongside clinical
- Show type badge
- Click to complete → navigate to completion page

### 5. Assessment Completion Page

**Location**: `packages/web/src/app/assessments/[id]/complete/page.tsx` (enhance existing or new)

**Display:**
- Assessment name and description
- Questions rendered based on type:
  - **multiple_choice_single**: Radio buttons
  - **multiple_choice_multi**: Checkboxes
  - **text_short**: Single-line input
  - **text_long**: Textarea
  - **rating_scale**: Visual scale (buttons or slider) with labels
  - **yes_no**: Two buttons or toggle
- Required indicator
- Submit button (disabled until all required answered)

**After submission:**
- **Custom Assessment**: Show results with overall score, category scores, interpretations
- **Custom Questionnaire**: Simple "Thank you" message

### 6. Enhanced View Assessments Modal

**Location**: `packages/web/src/components/MemberAssessmentsModal.tsx` (or similar)

**Changes:**
- Include custom assessments/questionnaires in list
- When viewing completed custom assessment:
  - Overall score percentage + interpretation
  - Category breakdown (each category's % + interpretation)
  - Individual question responses
- When viewing completed custom questionnaire:
  - No scores (since unscored)
  - Just question responses
  - Completion timestamp

---

## User Flows

### Flow 1: Create and Assign Custom Questionnaire

```
1. Counselor clicks member menu → "Assign Assessment"
2. AssignAssessmentModal opens
3. Selects "Custom" from type dropdown
4. Sees list of existing custom assessments/questionnaires
5. Clicks "Create Questionnaire" button
6. AssessmentBuilderModal opens
   a. Step 1: Enters "Weekly Check-In"
   b. Step 2: Adds 3 questions:
      - "How are you feeling this week?" (text_long, weight 1.0, category "general")
      - "Rate your stress level" (rating_scale 1-10, weight 1.0, category "stress")
      - "Any prayer requests?" (text_long, weight 1.0, category "spiritual")
   c. Clicks "Save" (no Step 3 since it's questionnaire)
7. Returns to AssignAssessmentModal with "Weekly Check-In" selected
8. Sets due date to next Friday
9. Clicks "Assign"
10. Member receives notification
```

### Flow 2: Create and Assign Custom Assessment

```
1. Counselor clicks member menu → "Assign Assessment"
2. AssignAssessmentModal opens
3. Selects "Custom" from type dropdown
4. Clicks "Create Assessment" button
5. AssessmentBuilderModal opens
   a. Step 1: Enters "Anxiety & Depression Check"
   b. Step 2: Adds 6 questions:
      - 3 anxiety questions (category "anxiety", various weights)
      - 3 depression questions (category "depression", various weights)
   c. Step 3: Scoring
      - Anxiety category: Low 0-33%, Moderate 34-66%, High 67-100%
      - Depression category: Low 0-33%, Moderate 34-66%, High 67-100%
      - Overall: Low 0-40%, Moderate 41-70%, High 71-100%
   d. Clicks "Save"
6. Returns to AssignAssessmentModal with new assessment selected
7. Sets due date, clicks "Assign"
8. Member receives notification
```

### Flow 3: Member Completes Custom Assessment

```
1. Member sees "Anxiety & Depression Check" in assessments card
2. Clicks to complete
3. Completion page loads with all questions
4. Member answers each question
5. Clicks "Submit"
6. Results page shows:
   - Overall Score: 58% - "Moderate Concern"
   - Anxiety: 72% - "High"
   - Depression: 44% - "Moderate"
   - Individual responses listed
7. Counselor can now view these results in member's assessment history
```

---

## Validation Rules

### Creating Assessments

- Name required (min 3 chars)
- Must have at least 1 question
- Each question must have:
  - Non-empty text
  - Valid type
  - For multiple_choice: At least 2 options
  - For rating_scale: Valid min/max (min < max), min >= 0
  - Weight must be positive number
  - Category must be non-empty string
- Custom assessments must define:
  - At least 1 category in scoringRules
  - Interpretation ranges for each category used in questions
  - Overall interpretation ranges
  - Ranges must cover 0-100% without gaps

### Assigning Assessments

- Cannot assign inactive assessments
- Cannot assign if member already has pending assignment of same assessment
- Due date must be in the future (optional field)

### Completing Assessments

- All required questions must be answered
- Answer formats must match question types:
  - Multiple choice: Must select valid option(s)
  - Rating scale: Must be number within min/max range
  - Text: No format validation
  - Yes/No: Must be boolean
- Cannot submit incomplete responses

---

## Error Handling

### Creation Errors

- **Validation failures**: Show inline errors on form fields
- **API errors**: Show toast notification with error message
- **Network errors**: Show retry option

### Assignment Errors

- **Permission denied**: Show toast "You don't have permission to assign this assessment"
- **Already assigned**: Show toast "Member already has this assessment pending"
- **API errors**: Show toast notification with error message

### Completion Errors

- **Required field missing**: Highlight missing fields, disable submit
- **Invalid format**: Show inline error on question
- **API errors**: Show error modal with retry option
- **Network timeout**: Save draft locally, retry on reconnect

---

## Technical Considerations

### Performance

- **Question rendering**: Use React.memo for QuestionEditor to prevent unnecessary re-renders
- **Large assessments**: Consider pagination for 20+ questions
- **Scoring calculation**: Perform client-side for instant feedback, validate server-side

### Data Migration

- No migration needed for existing assessments
- New fields (`organizationId`, new enum values) are additive
- Existing `Assessment` records remain clinical type

### Backward Compatibility

- Existing assessment assignment/completion flows unchanged
- Clinical assessments continue to work as-is
- New features additive only

---

## Future Enhancements (Out of Scope)

- Conditional logic (skip questions based on previous answers)
- File upload question type
- Assessment templates/library
- Copy assessment across organizations
- Assessment versioning
- Analytics/reports on assessment results
- Bulk assignment
- Recurring assessments
- Assessment preview for members before starting
