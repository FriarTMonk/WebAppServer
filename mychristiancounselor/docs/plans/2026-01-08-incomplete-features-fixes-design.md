# Incomplete Features Fixes - Comprehensive Design

**Date**: 2026-01-08
**Status**: Design Complete
**Estimated Total Time**: 11-16 days across 4 phases

## Overview

This design addresses 9 incomplete features discovered in the codebase through systematic analysis of TODOs, disabled buttons, and "coming soon" notices. The fixes are organized into 4 phases prioritized by user impact and technical dependencies.

## Features Being Fixed

1. **Subscription navigation** - Button shows alert instead of navigating
2. **Custom assessment assignment** - Throws "not implemented" error
3. **Task edit modal** - Shows prompt instead of proper form
4. **Workflow rules edit/delete** - Buttons disabled but API exists
5. **Reading list functionality** - Placeholder page with "coming soon"
6. **CSV export for trends** - TODO comment, not implemented
7. **Assessment taking page** - No UI for members to take assessments
8. **Advanced evaluation management** - Dashboard features listed as "coming soon"
9. **Organization book filtering** - Shows all books instead of org-specific

---

## Phase 1: Quick Wins (1-2 days)

**Goal**: Fix broken user flows with minimal code changes

### 1.1 Subscription Button Navigation

**Problem**: UserMenu subscription button shows alert instead of navigating to existing `/settings/subscription` page

**Solution**:
```typescript
// packages/web/src/components/UserMenu.tsx:215-216
// BEFORE:
// TODO: Navigate to subscription page when it's ready
alert('Subscription feature coming soon!');

// AFTER:
setShowSubscriptionModal(false);
router.push('/settings/subscription');
```

**Files Changed**:
- `packages/web/src/components/UserMenu.tsx` (2 lines)

**Testing**: Click "Subscribe Now" → should navigate to subscription page

---

### 1.2 Task Edit Modal

**Problem**: ViewTasksModal shows simple prompt instead of proper edit form

**Solution**: Create EditTaskModal component with full form

**New Component**: `packages/web/src/components/EditTaskModal.tsx`
- Props: `task`, `isOpen`, `onClose`, `onSuccess`
- Fields: title (text), description (textarea), dueDate (date), status (dropdown)
- API: `PATCH /counsel/tasks/:id`

**New DTO**: `packages/api/src/counsel/dto/update-task.dto.ts`
```typescript
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MemberTaskStatus)
  status?: MemberTaskStatus;
}
```

**New Endpoint**: `packages/api/src/counsel/task.controller.ts`
```typescript
@Patch(':id')
async updateTask(
  @Param('id') id: string,
  @Body() dto: UpdateTaskDto,
  @Request() req
) {
  // Verify ownership (member owns task OR counselor assigned it)
  const task = await this.memberTaskService.getTaskById(id);
  const isMember = task.memberId === req.user.id;
  const isCounselor = task.counselorId === req.user.id;

  if (!isMember && !isCounselor) {
    throw new ForbiddenException('Not authorized to edit this task');
  }

  return this.memberTaskService.updateTask(id, dto);
}
```

**Service Method**: `packages/api/src/counsel/member-task.service.ts`
```typescript
async updateTask(id: string, updates: UpdateTaskDto) {
  return this.prisma.memberTask.update({
    where: { id },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  });
}
```

**Files Modified**:
- Create: `packages/web/src/components/EditTaskModal.tsx`
- Create: `packages/api/src/counsel/dto/update-task.dto.ts`
- Update: `packages/web/src/components/ViewTasksModal.tsx` (wire modal)
- Update: `packages/api/src/counsel/task.controller.ts` (add endpoint)
- Update: `packages/api/src/counsel/member-task.service.ts` (add method)

---

### 1.3 Workflow Rules Edit/Delete

**Problem**: Edit/Delete buttons disabled but API endpoints already exist at `PATCH /workflow/rules/:id` and `DELETE /workflow/rules/:id`

**Solution**: Wire existing endpoints to UI and add proper DTOs/authorization

**New DTOs**:

`packages/api/src/workflow/dto/create-workflow-rule.dto.ts`:
```typescript
export class CreateWorkflowRuleDto {
  @IsString()
  name: string;

  @IsEnum(WorkflowRuleLevel)
  level: WorkflowRuleLevel;

  @IsObject()
  trigger: any; // JSON structure

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsObject()
  actions: any; // JSON structure

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

`packages/api/src/workflow/dto/update-workflow-rule.dto.ts`:
```typescript
export class UpdateWorkflowRuleDto extends PartialType(CreateWorkflowRuleDto) {}
```

**Update Service**: `packages/api/src/workflow/workflow-rule.service.ts`
```typescript
async updateRule(id: string, userId: string, updates: UpdateWorkflowRuleDto) {
  const rule = await this.prisma.workflowRule.findUnique({ where: { id } });

  if (!rule) {
    throw new NotFoundException('Workflow rule not found');
  }

  // Authorization: owner or platform admin
  if (rule.level === 'counselor' && rule.ownerId !== userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true }
    });

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Not authorized to edit this rule');
    }
  }

  return this.prisma.workflowRule.update({
    where: { id },
    data: updates
  });
}

async deleteRule(id: string, userId: string) {
  // Same authorization as updateRule
  const rule = await this.prisma.workflowRule.findUnique({ where: { id } });

  if (!rule) {
    throw new NotFoundException('Workflow rule not found');
  }

  if (rule.level === 'counselor' && rule.ownerId !== userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true }
    });

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Not authorized to delete this rule');
    }
  }

  return this.prisma.workflowRule.delete({ where: { id } });
}
```

**Update Controller**: `packages/api/src/workflow/workflow.controller.ts`
```typescript
@Post()
async createRule(@Body() dto: CreateWorkflowRuleDto, @Request() req) {
  if (dto.level === 'counselor') {
    dto.ownerId = req.user.id;
  }
  return this.ruleService.createRule(dto);
}

@Patch(':id')
async updateRule(
  @Param('id') id: string,
  @Body() updates: UpdateWorkflowRuleDto,
  @Request() req
) {
  return this.ruleService.updateRule(id, req.user.id, updates);
}

@Delete(':id')
async deleteRule(@Param('id') id: string, @Request() req) {
  return this.ruleService.deleteRule(id, req.user.id);
}
```

**New Component**: `packages/web/src/components/EditWorkflowRuleModal.tsx`
- Props: `rule`, `isOpen`, `onClose`, `onSuccess`
- Form mirrors create flow but pre-populated
- API: `PATCH /workflow/rules/:id`

**Update UI**: `packages/web/src/components/WorkflowRulesModal.tsx`
```typescript
const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);

const handleEdit = (rule: WorkflowRule) => {
  setEditingRule(rule);
};

const handleDelete = async (ruleId: string) => {
  if (!confirm('Are you sure you want to delete this rule?')) return;

  await fetch(`${apiUrl}/workflow/rules/${ruleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  showToast('Rule deleted successfully', 'success');
  fetchRules();
};

// Replace disabled buttons (lines 225-240)
<button onClick={() => handleEdit(rule)}>Edit</button>
<button onClick={() => handleDelete(rule.id)}>Delete</button>
```

**Files Modified**:
- Create: `packages/web/src/components/EditWorkflowRuleModal.tsx`
- Create: `packages/api/src/workflow/dto/create-workflow-rule.dto.ts`
- Create: `packages/api/src/workflow/dto/update-workflow-rule.dto.ts`
- Update: `packages/web/src/components/WorkflowRulesModal.tsx`
- Update: `packages/api/src/workflow/workflow.controller.ts`
- Update: `packages/api/src/workflow/workflow-rule.service.ts`

---

## Phase 2: API Completions (2-3 days)

**Goal**: Add missing backend endpoints that UI is trying to call

### 2.1 Custom Assessment Assignment

**Problem**: AssignAssessmentModal throws error "Custom assessment assignment endpoint not yet implemented"

**Current**: Standard assessments (PHQ-9, GAD-7) can be assigned, but not custom ones

**Solution**: Add custom assessment assignment endpoint

**New DTO**: `packages/api/src/counsel/dto/assign-custom-assessment.dto.ts`
```typescript
export class AssignCustomAssessmentDto {
  @IsString()
  memberId: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
```

**New Endpoint**: `packages/api/src/counsel/assessment.controller.ts`
```typescript
@Post('custom/:assessmentId/assign')
async assignCustomAssessment(
  @Param('assessmentId') assessmentId: string,
  @Body() dto: AssignCustomAssessmentDto,
  @Request() req
) {
  return this.assessmentService.assignCustomAssessment(
    assessmentId,
    dto.memberId,
    req.user.id,
    dto.dueDate
  );
}
```

**Service Method**: `packages/api/src/counsel/assessment.service.ts`
```typescript
async assignCustomAssessment(
  assessmentId: string,
  memberId: string,
  assignedBy: string,
  dueDate?: string
) {
  // Verify assessment exists and is active
  const assessment = await this.prisma.assessment.findUnique({
    where: { id: assessmentId, type: 'custom', isActive: true }
  });

  if (!assessment) {
    throw new NotFoundException('Custom assessment not found');
  }

  // Create assignment
  return this.prisma.assignedAssessment.create({
    data: {
      assessmentId,
      memberId,
      assignedBy,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    },
    include: {
      assessment: true,
      member: { select: { firstName: true, lastName: true, email: true } }
    }
  });
}
```

**UI Update**: `packages/web/src/components/AssignAssessmentModal.tsx:142-144`
```typescript
// BEFORE:
throw new Error('Custom assessment assignment endpoint not yet implemented');

// AFTER:
const response = await fetch(
  `${apiUrl}/counsel/assessments/custom/${selectedCustomId}/assign`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ memberId, dueDate })
  }
);
```

**Files Modified**:
- Create: `packages/api/src/counsel/dto/assign-custom-assessment.dto.ts`
- Update: `packages/api/src/counsel/assessment.controller.ts`
- Update: `packages/api/src/counsel/assessment.service.ts`
- Update: `packages/web/src/components/AssignAssessmentModal.tsx`

---

### 2.2 Reading List CRUD Endpoints

**Problem**: ReadingListService exists but ResourcesController doesn't expose endpoints

**Current**: UserReadingList model in DB, service methods exist, no HTTP endpoints

**Solution**: Add 4 CRUD endpoints to ResourcesController

**New Endpoints**: `packages/api/src/resources/resources.controller.ts`
```typescript
@Get('reading-list')
async getReadingList(
  @CurrentUser('id') userId: string,
  @Query() query: ReadingListQueryDto
): Promise<ReadingListResponseDto> {
  return this.readingListService.getUserReadingList(userId, query);
}

@Post('reading-list')
async addToReadingList(
  @CurrentUser('id') userId: string,
  @Body() dto: AddToReadingListDto
) {
  return this.readingListService.addToReadingList(userId, dto);
}

@Put('reading-list/:bookId')
async updateReadingListItem(
  @CurrentUser('id') userId: string,
  @Param('bookId') bookId: string,
  @Body() dto: UpdateReadingListDto
) {
  return this.readingListService.updateReadingListItem(userId, bookId, dto);
}

@Delete('reading-list/:bookId')
async removeFromReadingList(
  @CurrentUser('id') userId: string,
  @Param('bookId') bookId: string
) {
  return this.readingListService.removeFromReadingList(userId, bookId);
}
```

**Service Updates**: `packages/api/src/resources/services/reading-list.service.ts`
```typescript
async getUserReadingList(userId: string, query: ReadingListQueryDto) {
  const { status, sortBy = 'addedAt', sortOrder = 'desc' } = query;

  return this.prisma.userReadingList.findMany({
    where: {
      userId,
      ...(status && { status })
    },
    include: {
      book: {
        include: {
          submittedBy: { select: { firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { [sortBy]: sortOrder }
  });
}

async addToReadingList(userId: string, dto: AddToReadingListDto) {
  return this.prisma.userReadingList.create({
    data: {
      userId,
      bookId: dto.bookId,
      status: dto.status || 'want_to_read',
      personalNotes: dto.personalNotes
    },
    include: { book: true }
  });
}

async updateReadingListItem(userId: string, bookId: string, dto: UpdateReadingListDto) {
  return this.prisma.userReadingList.update({
    where: { userId_bookId: { userId, bookId } },
    data: {
      ...dto,
      ...(dto.status === 'reading' && !dto.dateStarted && { dateStarted: new Date() }),
      ...(dto.status === 'finished' && !dto.dateFinished && { dateFinished: new Date() })
    }
  });
}

async removeFromReadingList(userId: string, bookId: string) {
  return this.prisma.userReadingList.delete({
    where: { userId_bookId: { userId, bookId } }
  });
}
```

**Files Modified**:
- Update: `packages/api/src/resources/resources.controller.ts` (add 4 endpoints)
- Update: `packages/api/src/resources/services/reading-list.service.ts` (ensure methods exist)
- Update: `packages/api/src/resources/resources.module.ts` (inject ReadingListService)

---

### 2.3 CSV Export for Historical Trends

**Problem**: HistoricalTrendsModal has TODO comment at line 201, no implementation

**Solution**: Add export endpoint and download button

**New Endpoint**: `packages/api/src/counsel/wellbeing.controller.ts`
```typescript
@Get('member/:memberId/history/export')
async exportHistory(
  @Param('memberId') memberId: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Res() res: Response
) {
  const history = await this.wellbeingService.getHistory(
    memberId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  );

  const csv = this.convertToCSV(history);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition',
    `attachment; filename=wellbeing-history-${memberId}.csv`);
  res.send(csv);
}

private convertToCSV(history: any[]): string {
  const headers = ['Date', 'Mood', 'Anxiety', 'Sleep Quality', 'Notes', 'Recorded By'];
  const rows = history.map(h => [
    new Date(h.recordedAt).toLocaleDateString(),
    h.mood || '',
    h.anxiety || '',
    h.sleepQuality || '',
    h.notes?.replace(/,/g, ';') || '',
    h.recordedByType
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
```

**UI Update**: `packages/web/src/components/HistoricalTrendsModal.tsx:201`
```typescript
const handleExportCSV = async () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
  const token = localStorage.getItem('accessToken');

  const url = new URL(`${apiUrl}/counsel/wellbeing/member/${memberId}/history/export`);
  if (startDate) url.searchParams.append('startDate', startDate.toISOString());
  if (endDate) url.searchParams.append('endDate', endDate.toISOString());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `wellbeing-history-${memberId}.csv`;
  a.click();
};

// Replace TODO (line 201) with:
<button
  onClick={handleExportCSV}
  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
>
  <svg>...</svg> Export CSV
</button>
```

**Files Modified**:
- Update: `packages/api/src/counsel/wellbeing.controller.ts` (add endpoint + helper)
- Update: `packages/web/src/components/HistoricalTrendsModal.tsx` (add button + handler)

---

### 2.4 Assessment Form Data Endpoint

**Problem**: MyAssessmentsModal has TODO at line 66 - no UI for members to take assessments

**Current**: Submit endpoint exists but no way to get questions

**Solution**: Add endpoint to fetch assessment form with questions

**New Endpoint**: `packages/api/src/counsel/assessment.controller.ts`
```typescript
@Get('assigned/:assignedId/form')
async getAssessmentForm(
  @Param('assignedId') assignedId: string,
  @Request() req: any
) {
  const assignment = await this.prisma.assignedAssessment.findUnique({
    where: { id: assignedId },
    include: {
      assessment: { select: { id: true, name: true, type: true, questions: true } },
      responses: true
    }
  });

  if (!assignment) {
    throw new NotFoundException('Assignment not found');
  }

  // Verify ownership
  if (assignment.memberId !== req.user.id) {
    throw new ForbiddenException('Not your assessment');
  }

  return {
    assignment: {
      id: assignment.id,
      dueDate: assignment.dueDate,
      status: assignment.status
    },
    assessment: assignment.assessment,
    responses: assignment.responses?.answers || []
  };
}
```

**Files Modified**:
- Update: `packages/api/src/counsel/assessment.controller.ts` (add endpoint)

---

## Phase 3: UI Build-Out (3-4 days)

**Goal**: Create missing pages and enhance existing UIs

### 3.1 Assessment Taking Page

**Problem**: Members can't take assigned assessments - no page exists

**Solution**: Create full assessment form page

**New Page**: `packages/web/src/app/assessments/take/[assignedId]/page.tsx`

**Features**:
- Fetch form data via `GET /counsel/assessments/assigned/:id/form`
- Display questions (wizard or long form)
- Support question types: multiple choice, scale, text
- Save progress to localStorage
- Submit via `POST /counsel/assessments/assigned/:id/submit`
- Show results/score after submission
- Prevent re-submission if completed

**Structure**:
```typescript
export default function TakeAssessmentPage({ params }) {
  const { assignedId } = use(params);
  const [assessment, setAssessment] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  // Sections:
  // 1. Header: Assessment name, due date, progress bar
  // 2. Question display: Render based on type
  // 3. Navigation: Previous/Next/Submit buttons
  // 4. Results: Score and interpretation (after submit)
}
```

**Question Components**:
- `packages/web/src/components/assessments/MultipleChoiceQuestion.tsx`
- `packages/web/src/components/assessments/ScaleQuestion.tsx`
- `packages/web/src/components/assessments/TextQuestion.tsx`
- `packages/web/src/components/assessments/AssessmentProgress.tsx`

**Navigation Update**: `packages/web/src/components/MyAssessmentsModal.tsx:66`
```typescript
// BEFORE: TODO comment
// AFTER:
const handleTakeAssessment = (assignedId: string) => {
  router.push(`/assessments/take/${assignedId}`);
  onClose();
};

<button onClick={() => handleTakeAssessment(assessment.id)}>
  Take Assessment
</button>
```

**Files Created**:
- `packages/web/src/app/assessments/take/[assignedId]/page.tsx`
- `packages/web/src/components/assessments/MultipleChoiceQuestion.tsx`
- `packages/web/src/components/assessments/ScaleQuestion.tsx`
- `packages/web/src/components/assessments/TextQuestion.tsx`
- `packages/web/src/components/assessments/AssessmentProgress.tsx`

**Files Modified**:
- `packages/web/src/components/MyAssessmentsModal.tsx`

---

### 3.2 Enhanced Reading List Page

**Problem**: Reading list shows "Coming Soon" placeholder (line 212-215)

**Solution**: Build full reading list with progress tracking

**Update Page**: `packages/web/src/app/resources/reading-list/page.tsx`

**Features**:
- Fetch via `GET /resources/reading-list`
- Filter by status: Want to Read / Reading / Finished
- Display: cover, title, author, status badge, progress %, rating
- Actions: Update status, add notes, update progress, remove
- Stats: Total books, finished this year, reading streak
- Add books via search

**Layout**:
```typescript
export default function ReadingListPage() {
  const [filter, setFilter] = useState<'all' | 'want_to_read' | 'reading' | 'finished'>('all');
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({ total: 0, finishedThisYear: 0 });

  // Sections:
  // 1. Stats Cards: Total, finished this year, currently reading
  // 2. Filter Tabs: All / Want to Read / Reading / Finished
  // 3. Book Grid: Cards with actions
  // 4. Empty State: "Add books to start tracking"
}
```

**New Components**:
- `packages/web/src/components/reading-list/ReadingListCard.tsx` - Individual book card with progress/notes
- `packages/web/src/components/reading-list/AddToReadingListButton.tsx` - Reusable add button

**Update BookCard**: `packages/web/src/components/BookCard.tsx:57`
```typescript
// BEFORE: TODO comment
// AFTER:
<AddToReadingListButton bookId={book.id} />
```

**Remove Notice**: Delete lines 212-215 in `reading-list/page.tsx`

**Files Modified**:
- Update: `packages/web/src/app/resources/reading-list/page.tsx` (replace placeholder)
- Create: `packages/web/src/components/reading-list/ReadingListCard.tsx`
- Create: `packages/web/src/components/reading-list/AddToReadingListButton.tsx`
- Update: `packages/web/src/components/BookCard.tsx` (add button)

---

## Phase 4: Advanced Features (5-7 days)

**Goal**: Build sophisticated admin tools and AI features

### 4.1 Advanced Evaluation Management Dashboard

**Problem**: Admin page shows "Coming Soon" notice for 5 features (lines 155-183)

**Solution**: Build comprehensive evaluation management system

#### 4.1.1 Framework Updates

**Database Addition**: `packages/api/prisma/schema.prisma`
```prisma
model EvaluationFramework {
  id              String    @id @default(uuid())
  version         String    @unique
  criteria        Json      // Evaluation criteria with weights
  categoryWeights Json      // Category weights
  thresholds      Json      // Visibility tier thresholds
  isActive        Boolean   @default(false)
  createdBy       String
  createdAt       DateTime  @default(now())
  activatedAt     DateTime?

  @@index([isActive])
  @@index([version])
}
```

**New Component**: `packages/web/src/components/admin/EvaluationFrameworkEditor.tsx`
- Add/remove criteria
- Adjust weights (must sum to 1.0)
- Preview changes
- Save as new version
- Activate version

**New Endpoints**: `packages/api/src/admin/evaluation-framework.controller.ts`
```typescript
@Get('evaluation/frameworks')
async getFrameworks() { ... }

@Get('evaluation/frameworks/active')
async getActiveFramework() { ... }

@Post('evaluation/frameworks')
async createFramework(@Body() dto: CreateFrameworkDto) { ... }

@Patch('evaluation/frameworks/:id/activate')
async activateFramework(@Param('id') id: string) { ... }
```

---

#### 4.1.2 Global Re-evaluation

**New Component**: `packages/web/src/components/admin/GlobalReEvaluationPanel.tsx`
- Select scope: all books / pending / aligned
- Show estimated cost and time
- Confirm with breakdown
- Trigger bulk job
- Link to queue monitoring

**New Endpoint**: `packages/api/src/admin/evaluation.controller.ts`
```typescript
@Post('evaluation/re-evaluate')
async triggerGlobalReEvaluation(@Body() dto: ReEvaluationDto, @Request() req) {
  const books = await this.getBooksByScope(dto.scope);

  for (const book of books) {
    await this.evaluationQueue.add('evaluate-book', {
      bookId: book.id,
      frameworkId: dto.frameworkId,
      triggeredBy: req.user.id,
      isReEvaluation: true
    });
  }

  return {
    bookCount: books.length,
    estimatedCost: books.length * 0.15
  };
}
```

---

#### 4.1.3 Queue Monitoring

**New Component**: `packages/web/src/components/admin/EvaluationQueueMonitor.tsx`
- Real-time job status (5s polling)
- Filter by status
- Retry failed jobs
- View error details
- Pause/resume queue

**New Endpoints**: `packages/api/src/admin/evaluation-queue.controller.ts`
```typescript
@Get('evaluation/queue/jobs')
async getQueueJobs(@Query('status') status?: string) { ... }

@Post('evaluation/queue/jobs/:jobId/retry')
async retryJob(@Param('jobId') jobId: string) { ... }

@Delete('evaluation/queue/jobs/:jobId')
async removeJob(@Param('jobId') jobId: string) { ... }

@Post('evaluation/queue/pause')
async pauseQueue() { ... }

@Post('evaluation/queue/resume')
async resumeQueue() { ... }
```

---

#### 4.1.4 Cost Tracking

**Database Addition**: `packages/api/prisma/schema.prisma`
```prisma
model EvaluationCostLog {
  id               String   @id @default(uuid())
  bookId           String
  frameworkVersion String
  inputTokens      Int
  outputTokens     Int
  totalCost        Float
  modelUsed        String
  evaluatedAt      DateTime @default(now())
  book             Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([bookId])
  @@index([evaluatedAt])
  @@index([frameworkVersion])
}
```

**New Component**: `packages/web/src/components/admin/EvaluationCostAnalytics.tsx`
- Total cost to date
- Cost this month
- Cost per book average
- Most expensive books
- Cost by framework version
- Cost trend chart
- Token usage breakdown

**New Endpoint**: `packages/api/src/admin/evaluation-analytics.controller.ts`
```typescript
@Get('evaluation/analytics/costs')
async getCostAnalytics(
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('frameworkVersion') frameworkVersion?: string
) {
  // Return aggregated cost data
}
```

**Update Evaluation Service**: Track costs after each evaluation
```typescript
// packages/api/src/resources/services/book-evaluation.service.ts
async evaluateBook(bookId: string, frameworkId: string) {
  // ... evaluation logic ...

  await this.prisma.evaluationCostLog.create({
    data: {
      bookId,
      frameworkVersion: framework.version,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalCost: this.calculateCost(response.usage),
      modelUsed: 'claude-sonnet-4-5'
    }
  });
}
```

---

#### 4.1.5 Threshold Management

**New Component**: `packages/web/src/components/admin/ThresholdManager.tsx`
- Adjust threshold sliders for each tier
- Live preview: show book redistribution
- Bar chart visualization
- Save thresholds
- Re-classify existing books option

**New Endpoints**: `packages/api/src/admin/evaluation.controller.ts`
```typescript
@Post('evaluation/thresholds/preview')
async previewThresholds(@Body() dto: ThresholdsDto) {
  // Calculate new distribution without saving
}

@Patch('evaluation/thresholds/apply')
async applyThresholds(
  @Body() dto: ThresholdsDto & { reclassifyExisting: boolean }
) {
  // Update framework and optionally reclassify books
}
```

---

### 4.2 Organization-Specific Book Filtering

**Problem**: Org admin page shows note "Organization-specific filtering coming soon" (line 163)

**Current**: Shows all books regardless of organization

**Solution**: Filter books by organization settings

**Database Update**: `packages/api/prisma/schema.prisma`
```prisma
model Organization {
  // ... existing fields ...

  allowedVisibilityTiers String[]  @default(["highly_aligned", "aligned"])
  customBookIds          String[]  @default([])
}
```

**Service Update**: `packages/api/src/resources/services/book.service.ts`
```typescript
async getBooksForOrganization(userId: string, organizationId: string) {
  // Verify membership
  const membership = await this.prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } }
  });

  if (!membership) {
    throw new ForbiddenException('Not a member');
  }

  // Get org settings
  const org = await this.prisma.organization.findUnique({
    where: { id: organizationId },
    select: { allowedVisibilityTiers: true, customBookIds: true }
  });

  // Query books
  return this.prisma.book.findMany({
    where: {
      OR: [
        { visibilityTier: { in: org.allowedVisibilityTiers } },
        { id: { in: org.customBookIds } },
        { submittedBy: { organizationMemberships: { some: { organizationId } } } }
      ]
    }
  });
}
```

**New Endpoint**: `packages/api/src/org-admin/books.controller.ts`
```typescript
@Get('books')
async getOrganizationBooks(
  @Request() req,
  @Query('organizationId') organizationId: string
) {
  return this.bookService.getBooksForOrganization(req.user.id, organizationId);
}
```

**New Settings Page**: `packages/web/src/app/org-admin/settings/book-access/page.tsx`
- Checkboxes for each visibility tier
- Search/add specific books
- Preview book count

**Update Org Books Page**: `packages/web/src/app/org-admin/resources/books/page.tsx:163`
```typescript
// BEFORE: Note about coming soon
// AFTER: Remove note, use filtered endpoint
useEffect(() => {
  const fetchBooks = async () => {
    const response = await fetch(
      `${apiUrl}/org-admin/books?organizationId=${currentOrgId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setBooks(await response.json());
  };
  fetchBooks();
}, [currentOrgId]);
```

**Migration**: `npx prisma migrate dev --name add_org_book_filtering`

---

### 4.3 AI-Powered Reading Recommendations

**Problem**: Reading list mentions "AI-powered recommendations" in "Coming Soon" (line 215)

**Solution**: Generate personalized recommendations based on reading history

**New Service**: `packages/api/src/resources/services/reading-recommendations.service.ts`
```typescript
async generateRecommendations(userId: string, limit: number = 5) {
  // 1. Get user's reading history
  const readingList = await this.prisma.userReadingList.findMany({
    where: { userId },
    include: { book: true }
  });

  // 2. Extract patterns
  const highRated = readingList.filter(r =>
    r.status === 'finished' && r.personalRating >= 4
  );
  const likedCategories = [...new Set(highRated.map(r => r.book.category))];
  const likedAuthors = [...new Set(highRated.map(r => r.book.author))];

  // 3. Find similar books not in list
  const candidates = await this.prisma.book.findMany({
    where: {
      AND: [
        { id: { notIn: readingList.map(r => r.bookId) } },
        {
          OR: [
            { category: { in: likedCategories } },
            { author: { in: likedAuthors } }
          ]
        },
        { visibilityTier: { in: ['highly_aligned', 'aligned'] } },
        { evaluationStatus: 'completed' }
      ]
    }
  });

  // 4. Score candidates
  const scored = candidates.map(book => ({
    book,
    score: this.calculateScore(book, highRated)
  }));

  // 5. AI ranking (optional)
  const ranked = await this.rankWithAI(userId, scored);

  return ranked.slice(0, limit);
}

private async rankWithAI(userId: string, candidates: any[]) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, completedTours: true }
  });

  const prompt = `
    User: ${user.firstName}, interests: ${user.completedTours.join(', ')}

    Candidates:
    ${candidates.map(c => `- ${c.book.title} by ${c.book.author} (score: ${c.score})`).join('\n')}

    Rank from most to least recommended. Return JSON: ["id1", "id2", ...]
  `;

  const response = await this.bedrockService.jsonCompletion('haiku', [
    { role: 'user', content: prompt }
  ]);

  return response.map(id => candidates.find(c => c.book.id === id).book);
}
```

**New Endpoint**: `packages/api/src/resources/resources.controller.ts`
```typescript
@Get('reading-list/recommendations')
async getRecommendations(
  @CurrentUser('id') userId: string,
  @Query('limit') limit?: number
) {
  return this.readingRecommendationsService.generateRecommendations(
    userId,
    parseInt(limit) || 5
  );
}
```

**New Component**: `packages/web/src/components/reading-list/RecommendedBooks.tsx`
- Fetch recommendations
- Display in grid
- "Add to Reading List" buttons

**Update Reading List Page**: `packages/web/src/app/resources/reading-list/page.tsx:215`
```typescript
// BEFORE: Coming Soon notice
// AFTER:
<RecommendedBooks />
```

---

## Summary

### Total Scope

**Endpoints**: 24 new/modified
- Phase 1: 1
- Phase 2: 8
- Phase 3: 0 (UI only)
- Phase 4: 15

**Pages**: 2 new
- `/assessments/take/[assignedId]`
- `/org-admin/settings/book-access`

**Components**: 20+
- Edit modals (2)
- Assessment components (5)
- Reading list components (3)
- Evaluation management (5)
- Recommendations (1)

**Database Migrations**: 2
- EvaluationFramework + EvaluationCostLog
- Organization fields (allowedVisibilityTiers, customBookIds)

### Phase Timeline

| Phase | Days | Risk | Dependencies |
|-------|------|------|--------------|
| Phase 1: Quick Wins | 1-2 | Low | None |
| Phase 2: API Completions | 2-3 | Low | None |
| Phase 3: UI Build-Out | 3-4 | Low | Phase 2 complete |
| Phase 4: Advanced Features | 5-7 | Medium | Phase 2 complete |

**Total**: 11-16 days

### Shippability

- **After Phase 1**: Ship quick fixes
- **After Phase 2**: Ship complete CRUD operations
- **After Phase 3**: Ship full user-facing features
- **After Phase 4**: Ship advanced admin tools

---

## Next Steps

1. Review and approve design
2. Create implementation plan (use `superpowers:writing-plans`)
3. Set up isolated workspace (use `superpowers:using-git-worktrees`)
4. Execute phase-by-phase
5. Test thoroughly after each phase
6. Deploy incrementally
