# Phase 3 UI Design: Member Tasks, Assessments & Workflow Rules

**Goal:** Add full UI for Phase 3 backend features - member tasks, assessments, and workflow automation.

**Scope:** Counselor dashboard enhancements and member-facing task/assessment views.

**User Experience:** Keep all features in existing dashboards (no separate pages), use modals for detailed interactions.

---

## Design Principles

1. **Dashboard-centric:** All features accessible from existing counselor/member dashboards
2. **Modal-based interactions:** Detailed views open as modals to avoid navigation complexity
3. **Progressive disclosure:** Show summaries by default, expand to details on demand
4. **Consistent patterns:** Follow existing OverrideStatusModal and dashboard patterns
5. **Clear ownership:** Counselors manage/assign, members complete, AI auto-detects

---

## 1. Counselor Dashboard Enhancements

### 1.1 Summary Widgets (Top of Dashboard)

Add three metric cards above the member table:

**Active Tasks Card:**
- Count: "24 Active Tasks"
- Breakdown: "18 Pending • 6 Overdue"
- Click → Filters table to show members with tasks

**Pending Assessments Card:**
- Count: "12 Pending Assessments"
- Breakdown: "8 PHQ-9 • 4 GAD-7"
- Click → Filters table to show members with pending assessments

**Active Rules Card:**
- Count: "3 Active Workflow Rules"
- Breakdown: "1 Platform • 1 Org • 1 My Rules"
- Click → Opens Workflow Rules management modal

### 1.2 Status Column Enhancement

Add badge indicators to the existing Status column showing task/assessment counts:

**Badge Display:**
- Task badge: "2 Tasks" (blue badge if pending, orange if overdue)
- Assessment badge: "1 Assessment" (yellow badge)
- Positioned below wellbeing status badge
- Click badge → Opens relevant modal for that member

**Example:**
```
Status Column:
[High Concern] ← Existing wellbeing status
[2 Tasks] [1 Assessment] ← New badges
```

### 1.3 Expanded Actions Dropdown

Add Phase 3 actions to the existing dropdown (currently has View Profile, Override Status, Refresh Analysis):

**Updated Actions Menu (10 items):**
1. View Profile
2. Override Status
3. Refresh Analysis
4. **Historical Trends** ← New
5. **Assign Task** ← New
6. **View Tasks** ← New
7. **Assign Assessment** ← New
8. **View Assessments** ← New
9. **Workflow Rules** ← New
10. **Send Message** ← New (bonus)

---

## 2. Counselor Modals

### 2.1 Historical Trends Modal

**Trigger:** Actions dropdown → "Historical Trends"

**Purpose:** Show member's wellbeing and assessment trends over time with event timeline.

**Layout:**

**Section 1: Wellbeing Trend Line**
- Line chart showing wellbeing status over time (30/60/90 day selector)
- Y-axis: Status levels (thriving → high_concern)
- X-axis: Dates
- Color-coded: Green (thriving/stable) → Yellow (attention) → Orange (concern) → Red (high_concern)
- Points clickable to show notes from that analysis

**Section 2: Assessment Score Trends**
- Two line charts (PHQ-9 and GAD-7) showing score progression
- Y-axis: Score (0-27 for PHQ-9, 0-21 for GAD-7)
- X-axis: Dates
- Severity zones shaded in background
- Shows score interpretation on hover

**Section 3: Event Timeline**
- Chronological list of significant events:
  - Status changes with reason
  - Tasks assigned/completed
  - Assessments assigned/completed
  - Workflow rules triggered
  - Manual interventions (overrides)
- Each event shows: Date, type icon, description, triggered by
- Filterable by event type

**Footer:** Export button (CSV), Close button

---

### 2.2 Assign Task Modal (Two-Step)

**Trigger:** Actions dropdown → "Assign Task"

**Purpose:** Guided task assignment with template selection.

**Step 1: Select Task Type**

Three large cards to choose from:

1. **Conversation Prompt**
   - Description: "Topics for member to discuss with AI counselor"
   - Icon: Chat bubble
   - Examples: "Coping strategies", "Gratitude practice"

2. **Offline Task**
   - Description: "Activities for member to complete outside conversations"
   - Icon: Checklist
   - Examples: "Journal daily", "Practice breathing exercises"

3. **Guided Conversation**
   - Description: "Structured conversation flow with specific prompts"
   - Icon: Path/flow icon
   - Examples: "CBT thought challenge", "Goal setting session"

**Step 2: Select Template & Configure**

After type selection, show:

**Template Selector:**
- Dropdown with 10 predefined templates (filtered by selected type)
- Custom option: "Create custom task"
- Template preview shows description

**Configuration Fields:**
- Title (pre-filled from template, editable)
- Description (pre-filled from template, editable)
- Due date (optional, date picker)
- Priority (Low/Medium/High radio buttons)
- Notes (optional, counselor-only notes)

**Footer:** Back button, Cancel button, "Assign Task" button

---

### 2.3 View Tasks Modal

**Trigger:** Actions dropdown → "View Tasks"

**Purpose:** See all tasks assigned to this member.

**Layout:**

**Task List** (grouped by status):
- Pending (expanded by default)
- Overdue (highlighted in orange)
- Completed (collapsed, expandable)

**Each Task Card Shows:**
- Title and description
- Type badge (Conversation Prompt/Offline Task/Guided Conversation)
- Assigned date, due date
- Priority indicator
- Completion status (for completed tasks: date, auto/manual)
- Counselor notes (if any)

**Actions Per Task:**
- Edit button (title, description, due date)
- Delete button (confirmation dialog)
- Send Reminder button (triggers notification)

**Footer:** "Assign New Task" button, Close button

**Important:** Counselors CANNOT mark tasks complete:
- Offline tasks: Member marks complete via their dashboard
- Conversation prompts: AI auto-detects when topic discussed
- Guided conversations: AI auto-completes when conversation happens

---

### 2.4 Assign Assessment Modal (Simple)

**Trigger:** Actions dropdown → "Assign Assessment"

**Purpose:** Quick assessment assignment.

**Layout:**

**Assessment Selection:**
- Radio buttons:
  - PHQ-9 (Depression Screening)
  - GAD-7 (Anxiety Screening)
- Brief description under each option

**Configuration:**
- Due date (optional, date picker)
- Note to member (optional, textarea - e.g., "Please complete before our next session")

**Footer:** Cancel button, "Assign Assessment" button

---

### 2.5 View Assessments Modal

**Trigger:** Actions dropdown → "View Assessments"

**Purpose:** Review member's assessment history with scores.

**Layout:**

**Assessment Cards** (one per type):

**Card Structure:**
- Header: "PHQ-9 (Depression)" or "GAD-7 (Anxiety)"
- Latest score (prominent): "Score: 15" with severity badge ("Moderate Depression")
- Status badge: "Pending" (yellow) or "Completed" (green)
- Assigned date, completion date (if completed)
- "View History" button (expands timeline)

**History Expansion:**
- Timeline of previous assessments (max 5 recent)
- Each entry: Date, score, severity level
- Trend arrow (↑ increased, ↓ decreased from previous)
- "View All in Historical Trends" link

**Empty State:** "No assessments assigned yet" with "Assign Assessment" button

**Footer:** "Assign New Assessment" button, "View Historical Trends" link, Close button

---

### 2.6 Workflow Rules Modal

**Trigger:** Actions dropdown → "Workflow Rules"

**Purpose:** View and manage automation rules for this member.

**Layout:**

**Section 1: Applied Rules**

Shows rules that apply to this member, grouped by level:

**Platform Rules** (read-only):
- Example: "High Depression Alert"
- Trigger: Status → High Concern
- Last triggered: March 22, 2025
- Cannot disable platform rules

**Organization Rules** (read-only):
- Example: "Weekly Check-in Reminder"
- Trigger: 7 days inactivity
- Last triggered: March 18, 2025

**My Rules** (editable):
- Example: "Custom Follow-up"
- Trigger: Task overdue by 2 days
- Toggle: ON/OFF (counselor can enable/disable)
- Edit/Delete buttons

**Section 2: Recent Activity**

Timeline of recent rule triggers for this member:
- Date, rule name, trigger reason, action taken
- Last 5 events shown, expandable
- Example: "March 22, 2025 - 'High Depression Alert' triggered → Assigned PHQ-9 assessment"

**Section 3: Create Custom Rule**

"+ Create Custom Rule" button opens inline form:

**Form Fields:**
- Trigger: Dropdown (Status Change, Assessment Score, Task Overdue, Inactivity)
- Conditions: Dynamic based on trigger
  - Status Change: "When status becomes..." (dropdown: high_concern, needs_attention, etc.)
  - Assessment Score: "When PHQ-9 score ≥..." (number input)
  - Task Overdue: "When task overdue by X days" (number input)
  - Inactivity: "When inactive for X days" (number input)
- Actions: Checkboxes (Assign Task, Assign Assessment, Send Notification)
- Apply to: Radio buttons (This Member Only, All My Members, Specific Organization)

**Footer:** Close button

---

## 3. Member Dashboard Enhancements

### 3.1 Summary Cards (Above Notes Panel)

Two clickable summary cards displayed side-by-side, positioned above the notes panel:

**Tasks Card:**
- Icon: Checklist icon
- Count: "2 Pending Tasks" (or "1 Overdue Task" in red if any overdue)
- Color-coded badge: Blue (pending), Orange (overdue)
- Click anywhere → Opens Tasks Modal

**Assessments Card:**
- Icon: Clipboard icon
- Count: "1 Pending Assessment"
- Color-coded badge: Yellow (pending)
- Click anywhere → Opens Assessments Modal

**Optional Banner** (only if urgent):
- Red banner above cards: "You have overdue tasks"
- Clicks through to Tasks Modal

---

### 3.2 My Tasks Modal

**Trigger:** Click Tasks Card

**Purpose:** View and manage assigned tasks.

**Layout:**

**Task List** (grouped by status):

**Pending Section** (top):
- Count: "Pending (2)"
- Each task card shows:
  - Title and description
  - Type badge: "Conversation Topic" | "Offline Task" | "Guided Conversation"
  - Assigned date, due date (if set)
  - Action button based on type:
    - Offline Task: "Mark Complete" button
    - Conversation Topic: "Start Conversation" link (routes to /counsel)
    - Guided Conversation: "Start Conversation" link (routes to /counsel)

**Overdue Section** (highlighted):
- Red border, urgent styling
- Same card structure as Pending

**Completed Section** (collapsed by default):
- Expandable: "Completed (3) [Expand ▼]"
- Shows completion date
- No action buttons

**Empty State:** "No tasks assigned" (friendly message)

**Footer:** Close button

---

### 3.3 My Assessments Modal

**Trigger:** Click Assessments Card

**Purpose:** View and complete assigned assessments.

**Layout:**

**Pending Assessments** (top):
- Count: "Pending (1)"
- Each assessment card shows:
  - Name: "PHQ-9 (Depression)" or "GAD-7 (Anxiety)"
  - Description: Brief purpose of assessment
  - Due date (if set)
  - "Take Assessment" button → Opens assessment form

**Completed Assessments** (below):
- Each assessment shows:
  - Name
  - Completion date
  - Score and severity level: "Score: 8 (Mild Anxiety)"
- No action buttons (read-only)

**Empty State:** "No assessments assigned"

**Footer:** Close button

---

## 4. Task Completion Semantics

**Critical distinction - who can mark tasks complete:**

### Counselor View (View Tasks Modal):
- **CANNOT** mark tasks complete
- Can only: View, Edit, Delete, Send Reminder
- Completion happens through member action or AI detection

### Member View (My Tasks Modal):
- **Offline Tasks:** Member clicks "Mark Complete" button
- **Conversation Prompts:** AI auto-detects when topic discussed in conversation
- **Guided Conversations:** AI auto-completes when conversation happens

### Backend (TaskCompletionDetectionService):
- Runs after each conversation
- Detects if pending conversation tasks were addressed
- Auto-marks tasks as complete with `completedAt` timestamp
- Completion method tracked: "auto" (AI detected) vs "manual" (member marked)

---

## 5. API Endpoints Used

### Counselor Endpoints:
- `GET /counsel/tasks/templates` - Get task templates
- `POST /counsel/tasks` - Create task for member
- `GET /counsel/tasks/member/:memberId` - Get member's tasks
- `PATCH /counsel/tasks/:id` - Edit task
- `DELETE /counsel/tasks/:id` - Delete task
- `POST /counsel/tasks/:id/remind` - Send reminder
- `POST /counsel/assessments/assign` - Assign assessment
- `GET /counsel/assessments/member/:memberId` - Get member's assessments
- `GET /counsel/workflow-rules` - Get applicable rules
- `POST /counsel/workflow-rules` - Create custom rule
- `PATCH /counsel/workflow-rules/:id` - Edit rule
- `GET /counsel/members/:id/history` - Get wellbeing history
- `GET /counsel/members/:id/assessment-history` - Get assessment history

### Member Endpoints:
- `GET /counsel/tasks/my-tasks` - Get my assigned tasks
- `POST /counsel/tasks/:id/complete` - Mark offline task complete
- `GET /counsel/assessments/my-assessments` - Get my assessments
- `POST /counsel/assessments/:id/submit` - Submit assessment responses

---

## 6. Component Structure

### New Components to Create:

**Counselor Components:**
- `HistoricalTrendsModal.tsx` - Wellbeing/assessment trends + event timeline
- `AssignTaskModal.tsx` - Two-step task assignment
- `ViewTasksModal.tsx` - Task list for member
- `AssignAssessmentModal.tsx` - Simple assessment assignment
- `ViewAssessmentsModal.tsx` - Assessment history
- `WorkflowRulesModal.tsx` - Rule management
- `DashboardSummaryWidgets.tsx` - Three metric cards at top
- `StatusColumnBadges.tsx` - Task/assessment badges in status column

**Member Components:**
- `MemberTasksCard.tsx` - Summary card (clickable)
- `MemberAssessmentsCard.tsx` - Summary card (clickable)
- `MyTasksModal.tsx` - Task list with completion
- `MyAssessmentsModal.tsx` - Assessment list with "Take" action

**Shared Components:**
- `TaskCard.tsx` - Reusable task display
- `AssessmentCard.tsx` - Reusable assessment display
- `TrendLineChart.tsx` - Wellbeing/assessment trend visualization
- `EventTimeline.tsx` - Event history display

---

## 7. File Modifications

### Existing Files to Modify:

**`packages/web/src/components/CounselorDashboard.tsx`:**
- Add summary widgets at top
- Add status column badges
- Expand actions dropdown with 6 new actions
- Add modal state management for new modals
- Integrate new modal components

**`packages/web/src/app/home/page.tsx` (Member Dashboard):**
- Add task/assessment summary cards above notes panel
- Add modal state management
- Integrate MyTasksModal and MyAssessmentsModal

**`packages/web/src/lib/api-helpers.ts`:**
- Add type definitions for tasks, assessments, workflow rules
- Add API helper functions for new endpoints

---

## 8. Design Patterns to Follow

### Modal Pattern (from OverrideStatusModal.tsx):
```typescript
interface ModalProps {
  memberName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void; // Triggers parent refresh
}

export default function Modal({ memberName, memberId, onClose, onSuccess }: ModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiPost('/endpoint', data);
      if (!response.ok) throw new Error('Failed');
      onSuccess(); // Refresh parent data
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {/* Modal content */}
      </div>
    </div>
  );
}
```

### Dashboard Integration Pattern:
- State management: `useState` for modal visibility and selected member
- Data fetching: Custom hooks like `useCounselorMembers`
- Actions dropdown: Nested menu items with click handlers
- Refresh pattern: `refetch()` function passed to modals via `onSuccess`

---

## 9. Next Steps

1. **Implementation Planning:** Create detailed task-by-task implementation plan
2. **Component Development:** Build components following existing patterns
3. **API Integration:** Wire up backend endpoints
4. **Testing:** Manual testing of all flows
5. **Refinement:** Polish UI/UX based on testing

**Estimated Implementation Time:** 2-3 hours for full Phase 3 UI
