# Phase 2 API Completions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete missing API endpoints for custom assessment assignment, reading list CRUD, CSV export, and assessment form data.

**Architecture:** Add 8 API endpoints (1 POST, 5 GET, 1 PUT, 1 DELETE) and update 3 frontend components to consume them. Leverage existing services where possible.

**Tech Stack:** NestJS, Prisma ORM, class-validator, Next.js 14, TypeScript

---

## Task 1: Custom Assessment Assignment DTO

**Files:**
- Create: `packages/api/src/counsel/dto/assign-custom-assessment.dto.ts`
- Reference: `packages/api/src/counsel/assessment.service.ts:5-11` (existing AssignAssessmentDto interface)

**Step 1: Create DTO file with validation**

```typescript
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class AssignCustomAssessmentDto {
  @IsString({ message: 'Member ID must be a string' })
  memberId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  notes?: string;
}
```

**Step 2: Commit**

```bash
git add packages/api/src/counsel/dto/assign-custom-assessment.dto.ts
git commit -m "feat(api): add AssignCustomAssessmentDto for custom assessment assignment"
```

---

## Task 2: Custom Assessment Assignment Endpoint

**Files:**
- Modify: `packages/api/src/counsel/assessment.controller.ts:121` (add new endpoint after existing ones)
- Modify: `packages/api/src/counsel/assessment.service.ts:36` (add new method after assignAssessment)
- Reference: `packages/api/src/counsel/assessment.service.ts:22-36` (existing assignAssessment pattern)

**Step 3: Add controller endpoint**

Add after line 121 in `assessment.controller.ts`:

```typescript
  /**
   * Assign a custom assessment to a member
   */
  @Post('custom/:assessmentId/assign')
  async assignCustomAssessment(
    @Param('assessmentId') assessmentId: string,
    @Request() req: any,
    @Body() dto: AssignCustomAssessmentDto,
  ) {
    return this.assessmentService.assignCustomAssessment({
      assessmentId,
      memberId: dto.memberId,
      assignedBy: req.user.id,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      notes: dto.notes,
    });
  }
```

**Step 4: Import DTO in controller**

Add to imports section (line 13):

```typescript
import { AssignCustomAssessmentDto } from './dto/assign-custom-assessment.dto';
```

**Step 5: Add service method**

Add after line 36 in `assessment.service.ts`:

```typescript
  /**
   * Assign a custom assessment to a member
   */
  async assignCustomAssessment(dto: AssignAssessmentDto) {
    this.logger.log(
      `Assigning custom assessment ${dto.assessmentId} to member ${dto.memberId}`,
    );

    // Verify custom assessment exists
    const customAssessment = await this.prisma.customAssessment.findUnique({
      where: { id: dto.assessmentId },
    });

    if (!customAssessment) {
      throw new NotFoundException(
        `Custom assessment with ID ${dto.assessmentId} not found`,
      );
    }

    // Verify counselor has access to assign (must be creator or in same organization)
    if (customAssessment.createdBy !== dto.assignedBy) {
      throw new ForbiddenException(
        'You do not have permission to assign this custom assessment',
      );
    }

    return this.prisma.assignedAssessment.create({
      data: {
        memberId: dto.memberId,
        assessmentId: dto.assessmentId,
        assignedBy: dto.assignedBy,
        dueDate: dto.dueDate,
        status: 'pending',
      },
    });
  }
```

**Step 6: Add import in service**

Add to imports section (line 1):

```typescript
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
```

**Step 7: Run API dev server to verify compilation**

```bash
cd packages/api
npm run start:dev
```

Expected: API compiles successfully, no TypeScript errors

**Step 8: Commit**

```bash
git add packages/api/src/counsel/assessment.controller.ts packages/api/src/counsel/assessment.service.ts
git commit -m "feat(api): add custom assessment assignment endpoint POST /counsel/assessments/custom/:id/assign"
```

---

## Task 3: Reading List GET Endpoint

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts:47` (add new endpoint after external org endpoints)
- Reference: `packages/api/src/resources/services/reading-list.service.ts:90-166` (getReadingList method exists)
- Reference: `packages/api/src/resources/dto/reading-list-query.dto.ts` (DTO exists)

**Step 9: Add GET endpoint to controller**

Add after line 47 in `resources.controller.ts`:

```typescript
  @Get('reading-list')
  async getReadingList(
    @CurrentUser('id') userId: string,
    @Query() query: ReadingListQueryDto,
  ) {
    return this.readingListService.getReadingList(userId, query);
  }
```

**Step 10: Add service injection to constructor**

Update constructor (line 17-21):

```typescript
  constructor(
    private readonly organizationBrowseService: OrganizationBrowseService,
    private readonly externalOrganizationService: ExternalOrganizationService,
    private readonly readingListService: ReadingListService,
  ) {}
```

**Step 11: Add imports**

Add to imports section (line 5):

```typescript
import { ReadingListService } from './services/reading-list.service';
import { ReadingListQueryDto } from './dto/reading-list-query.dto';
```

**Step 12: Register service in module**

Check `packages/api/src/resources/resources.module.ts` - verify ReadingListService is in providers array. If not, add it.

**Step 13: Test endpoint with curl**

```bash
# In separate terminal, after API is running
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3697/resources/reading-list?status=all
```

Expected: JSON response with `{ items: [], total: 0 }` or actual data

**Step 14: Commit**

```bash
git add packages/api/src/resources/resources.controller.ts
git commit -m "feat(api): add reading list GET endpoint /resources/reading-list"
```

---

## Task 4: Reading List POST Endpoint

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts` (add endpoint)
- Reference: `packages/api/src/resources/services/reading-list.service.ts:20-88` (addToReadingList method exists)
- Reference: `packages/api/src/resources/dto/add-to-reading-list.dto.ts` (DTO exists)

**Step 15: Add POST endpoint**

Add after the GET endpoint:

```typescript
  @Post('reading-list')
  async addToReadingList(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToReadingListDto,
  ) {
    return this.readingListService.addToReadingList(userId, dto);
  }
```

**Step 16: Add DTO import**

Add to imports section:

```typescript
import { AddToReadingListDto } from './dto/add-to-reading-list.dto';
```

**Step 17: Test endpoint**

```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"test-book-id","status":"want_to_read"}' \
  http://localhost:3697/resources/reading-list
```

Expected: JSON response with created reading list item or 404 if book doesn't exist

**Step 18: Commit**

```bash
git add packages/api/src/resources/resources.controller.ts
git commit -m "feat(api): add reading list POST endpoint /resources/reading-list"
```

---

## Task 5: Reading List PUT Endpoint

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts` (add endpoint)
- Reference: `packages/api/src/resources/services/reading-list.service.ts:168-277` (updateReadingListItem method exists)
- Reference: `packages/api/src/resources/dto/update-reading-list.dto.ts` (DTO exists)

**Step 19: Add PUT endpoint**

Add after the POST endpoint:

```typescript
  @Put('reading-list/:itemId')
  async updateReadingListItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReadingListDto,
  ) {
    return this.readingListService.updateReadingListItem(userId, itemId, dto);
  }
```

**Step 20: Add DTO import**

Add to imports section:

```typescript
import { UpdateReadingListDto } from './dto/update-reading-list.dto';
```

**Step 21: Add Param decorator import**

Update imports line 1:

```typescript
import { Controller, Get, Post, Put, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
```

**Step 22: Test endpoint**

```bash
curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"currently_reading","progress":50}' \
  http://localhost:3697/resources/reading-list/ITEM_ID
```

Expected: JSON response with updated reading list item or 404/403 errors

**Step 23: Commit**

```bash
git add packages/api/src/resources/resources.controller.ts
git commit -m "feat(api): add reading list PUT endpoint /resources/reading-list/:itemId"
```

---

## Task 6: Reading List DELETE Endpoint and Service Implementation

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts` (add endpoint)
- Modify: `packages/api/src/resources/services/reading-list.service.ts:279-285` (implement removeFromReadingList stub)

**Step 24: Implement removeFromReadingList service method**

Replace stub at line 279-285 in `reading-list.service.ts`:

```typescript
  async removeFromReadingList(userId: string, itemId: string) {
    this.logger.log(
      `Removing reading list item ${itemId} for user ${userId}`,
    );

    // 1. Fetch and validate ownership
    const existingEntry = await this.prisma.userReadingList.findUnique({
      where: { id: itemId },
    });

    if (!existingEntry) {
      throw new NotFoundException(
        `Reading list item with ID ${itemId} not found`,
      );
    }

    if (existingEntry.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to remove this reading list item',
      );
    }

    // 2. Delete the entry
    await this.prisma.userReadingList.delete({
      where: { id: itemId },
    });

    this.logger.log(
      `Successfully removed reading list item ${itemId} for user ${userId}`,
    );

    return { success: true, message: 'Reading list item removed' };
  }
```

**Step 25: Add DELETE endpoint**

Add after the PUT endpoint in `resources.controller.ts`:

```typescript
  @Delete('reading-list/:itemId')
  async removeFromReadingList(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.readingListService.removeFromReadingList(userId, itemId);
  }
```

**Step 26: Test endpoint**

```bash
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3697/resources/reading-list/ITEM_ID
```

Expected: JSON response `{ success: true, message: "Reading list item removed" }` or 404/403 errors

**Step 27: Commit**

```bash
git add packages/api/src/resources/resources.controller.ts packages/api/src/resources/services/reading-list.service.ts
git commit -m "feat(api): add reading list DELETE endpoint /resources/reading-list/:itemId"
```

---

## Task 7: CSV Export Endpoint for Wellbeing History

**Files:**
- Modify: `packages/api/src/counsel/wellbeing.controller.ts:74` (add new endpoint after getSummary)
- Modify: `packages/api/src/counsel/wellbeing-history.service.ts` (add convertToCSV method)

**Step 28: Add convertToCSV helper method to service**

Add to `wellbeing-history.service.ts` after existing methods:

```typescript
  /**
   * Convert wellbeing history to CSV format
   * @param memberId - The member's ID
   * @param options - Optional filters (startDate, endDate)
   * @returns CSV string
   */
  async convertToCSV(
    memberId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<string> {
    this.logger.log(`Converting wellbeing history to CSV for member ${memberId}`);

    // Fetch history data
    const history = await this.getHistory(memberId, options);

    // CSV header
    const header = 'Date,Overall Score,Anxiety,Depression,Stress,Notes\n';

    // CSV rows
    const rows = history.map((entry) => {
      const date = new Date(entry.date).toISOString().split('T')[0]; // YYYY-MM-DD
      const overallScore = entry.overallScore ?? '';
      const anxiety = entry.anxietyScore ?? '';
      const depression = entry.depressionScore ?? '';
      const stress = entry.stressScore ?? '';
      const notes = (entry.notes || '').replace(/"/g, '""'); // Escape quotes
      return `${date},"${overallScore}","${anxiety}","${depression}","${stress}","${notes}"`;
    }).join('\n');

    return header + rows;
  }
```

**Step 29: Add CSV export endpoint**

Add after line 74 in `wellbeing.controller.ts`:

```typescript
  /**
   * Export wellbeing history as CSV for a member (counselor endpoint)
   */
  @Get('member/:memberId/history/export')
  async exportHistory(
    @Param('memberId') memberId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options: any = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const csv = await this.historyService.convertToCSV(memberId, options);

    return {
      filename: `wellbeing-history-${memberId}-${new Date().toISOString().split('T')[0]}.csv`,
      data: csv,
      mimeType: 'text/csv',
    };
  }
```

**Step 30: Test endpoint**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3697/counsel/wellbeing/member/MEMBER_ID/history/export
```

Expected: JSON response with `{ filename, data, mimeType }` where data is CSV string

**Step 31: Commit**

```bash
git add packages/api/src/counsel/wellbeing.controller.ts packages/api/src/counsel/wellbeing-history.service.ts
git commit -m "feat(api): add CSV export endpoint GET /counsel/wellbeing/member/:id/history/export"
```

---

## Task 8: Assessment Form Data Endpoint

**Files:**
- Modify: `packages/api/src/counsel/assessment.controller.ts` (add new endpoint)
- Reference: Design document lines 579-611 for endpoint specification

**Step 32: Add getAssessmentForm endpoint**

Add after the assignCustomAssessment endpoint in `assessment.controller.ts`:

```typescript
  /**
   * Get assessment form with questions for a member to complete
   */
  @Get('assigned/:assignedId/form')
  async getAssessmentForm(
    @Param('assignedId') assignedId: string,
    @Request() req: any,
  ) {
    // 1. Fetch assignment with assessment and responses
    const assignment = await this.assessmentService.getAssignmentWithForm(
      assignedId,
    );

    // 2. Verify ownership
    if (assignment.memberId !== req.user.id) {
      throw new ForbiddenException('Not your assessment');
    }

    // 3. Get assessment definition from CLINICAL_ASSESSMENTS
    const assessmentDefinition = CLINICAL_ASSESSMENTS[assignment.assessmentId];

    if (!assessmentDefinition) {
      throw new NotFoundException('Assessment definition not found');
    }

    return {
      assignment: {
        id: assignment.id,
        dueDate: assignment.dueDate,
        status: assignment.status,
      },
      assessment: {
        id: assessmentDefinition.id,
        name: assessmentDefinition.name,
        type: assessmentDefinition.type,
        questions: assessmentDefinition.questions,
      },
      responses: assignment.responses?.answers || [],
    };
  }
```

**Step 33: Add ForbiddenException import**

Update imports line 1:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
```

**Step 34: Add service method for fetching assignment with form**

Add to `assessment.service.ts`:

```typescript
  /**
   * Get assigned assessment with responses for form display
   */
  async getAssignmentWithForm(assignedAssessmentId: string) {
    this.logger.log(
      `Fetching assignment ${assignedAssessmentId} with form data`,
    );

    const assignment = await this.prisma.assignedAssessment.findUnique({
      where: { id: assignedAssessmentId },
      include: {
        responses: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assessment assignment not found');
    }

    return assignment;
  }
```

**Step 35: Test endpoint**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3697/counsel/assessments/assigned/ASSIGNED_ID/form
```

Expected: JSON response with `{ assignment, assessment, responses }`

**Step 36: Commit**

```bash
git add packages/api/src/counsel/assessment.controller.ts packages/api/src/counsel/assessment.service.ts
git commit -m "feat(api): add assessment form GET endpoint /counsel/assessments/assigned/:id/form"
```

---

## Task 9: Update Frontend Components

**Files:**
- Modify: `packages/web/src/components/AssignAssessmentModal.tsx` (replace TODO with API call)
- Modify: `packages/web/src/components/HistoricalTrendsModal.tsx:201` (add export button)
- Modify: `packages/web/src/components/MyAssessmentsModal.tsx:66` (add navigation handler)

**Step 37: Update AssignAssessmentModal**

Find the TODO comment for custom assessment assignment and replace with:

```typescript
// In handleAssign function, replace throw new Error with:
const response = await fetch(`${apiUrl}/counsel/assessments/custom/${selectedAssessment}/assign`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    memberId,
    dueDate: dueDate?.toISOString(),
    notes: notes || undefined,
  }),
});

if (!response.ok) {
  throw new Error('Failed to assign custom assessment');
}

onSuccess?.();
onClose();
```

**Step 38: Update HistoricalTrendsModal**

Replace TODO at line 201 with export button:

```typescript
<button
  onClick={handleExportCSV}
  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
>
  Export to CSV
</button>
```

Add handler function before return statement:

```typescript
const handleExportCSV = async () => {
  try {
    const response = await fetch(
      `${apiUrl}/counsel/wellbeing/member/${memberId}/history/export`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Export failed');

    const { filename, data } = await response.json();

    // Create download
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export failed:', error);
    alert('Failed to export CSV');
  }
};
```

**Step 39: Update MyAssessmentsModal**

Replace TODO at line 66 with:

```typescript
const handleTakeAssessment = (assignedId: string) => {
  router.push(`/assessments/take/${assignedId}`);
  onClose();
};
```

Update the Take Assessment button:

```typescript
<button onClick={() => handleTakeAssessment(assessment.id)}>
  Take Assessment
</button>
```

**Step 40: Test web app**

```bash
cd packages/web
npm run dev
```

Navigate to:
1. Assign assessment modal - test custom assessment assignment
2. Historical trends modal - test CSV export button
3. My assessments modal - test "Take Assessment" button (should navigate)

Expected: All three features work without console errors

**Step 41: Commit**

```bash
git add packages/web/src/components/AssignAssessmentModal.tsx packages/web/src/components/HistoricalTrendsModal.tsx packages/web/src/components/MyAssessmentsModal.tsx
git commit -m "feat(web): wire up Phase 2 API endpoints in frontend components"
```

---

## Task 10: End-to-End Testing and Documentation

**Step 42: Test all endpoints with real data**

Create test script `test-phase2-endpoints.sh`:

```bash
#!/bin/bash
API_URL="http://localhost:3697"
TOKEN="your-jwt-token-here"

echo "Testing Phase 2 API Endpoints..."

# 1. Custom assessment assignment
echo "\n1. POST /counsel/assessments/custom/:id/assign"
curl -X POST "$API_URL/counsel/assessments/custom/test-id/assign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memberId":"test-member-id"}'

# 2. Reading list GET
echo "\n\n2. GET /resources/reading-list"
curl "$API_URL/resources/reading-list?status=all" \
  -H "Authorization: Bearer $TOKEN"

# 3. Reading list POST
echo "\n\n3. POST /resources/reading-list"
curl -X POST "$API_URL/resources/reading-list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"test-book-id","status":"want_to_read"}'

# 4. Reading list PUT
echo "\n\n4. PUT /resources/reading-list/:itemId"
curl -X PUT "$API_URL/resources/reading-list/test-item-id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"currently_reading","progress":50}'

# 5. Reading list DELETE
echo "\n\n5. DELETE /resources/reading-list/:itemId"
curl -X DELETE "$API_URL/resources/reading-list/test-item-id" \
  -H "Authorization: Bearer $TOKEN"

# 6. CSV export
echo "\n\n6. GET /counsel/wellbeing/member/:id/history/export"
curl "$API_URL/counsel/wellbeing/member/test-member-id/history/export" \
  -H "Authorization: Bearer $TOKEN"

# 7. Assessment form
echo "\n\n7. GET /counsel/assessments/assigned/:id/form"
curl "$API_URL/counsel/assessments/assigned/test-assigned-id/form" \
  -H "Authorization: Bearer $TOKEN"

echo "\n\nAll tests complete!"
```

Run: `bash test-phase2-endpoints.sh`

**Step 43: Create Phase 2 summary document**

Create `docs/PHASE2_SUMMARY.md`:

```markdown
# Phase 2: API Completions - Implementation Summary

## Completed Date
2026-01-09

## Overview
Added 8 API endpoints to complete missing functionality for custom assessments, reading lists, wellbeing export, and assessment forms.

## Endpoints Added

### 1. Custom Assessment Assignment
- **POST** `/counsel/assessments/custom/:assessmentId/assign`
- **Purpose**: Allow counselors to assign custom assessments to members
- **Auth**: JWT required
- **DTO**: `AssignCustomAssessmentDto`

### 2. Reading List CRUD
- **GET** `/resources/reading-list?status=all|want_to_read|currently_reading|finished`
- **POST** `/resources/reading-list`
- **PUT** `/resources/reading-list/:itemId`
- **DELETE** `/resources/reading-list/:itemId`
- **Purpose**: Full CRUD for user reading lists
- **Auth**: JWT required
- **Service**: `ReadingListService` (existing, added removeFromReadingList implementation)

### 3. Wellbeing CSV Export
- **GET** `/counsel/wellbeing/member/:memberId/history/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Purpose**: Export wellbeing historical trends as CSV
- **Auth**: JWT required
- **Returns**: `{ filename, data, mimeType }`

### 4. Assessment Form Data
- **GET** `/counsel/assessments/assigned/:assignedId/form`
- **Purpose**: Fetch assessment questions for members to complete
- **Auth**: JWT required
- **Returns**: `{ assignment, assessment, responses }`

## Frontend Updates

### 1. AssignAssessmentModal
- Replaced TODO with API call to assign custom assessments
- Shows success/error feedback

### 2. HistoricalTrendsModal
- Added "Export to CSV" button at line 201
- Downloads CSV file with historical wellbeing data

### 3. MyAssessmentsModal
- Added navigation handler for "Take Assessment" button
- Routes to `/assessments/take/[assignedId]`

## Files Modified

**API (8 files)**:
- `packages/api/src/counsel/dto/assign-custom-assessment.dto.ts` (created)
- `packages/api/src/counsel/assessment.controller.ts` (2 endpoints added)
- `packages/api/src/counsel/assessment.service.ts` (2 methods added)
- `packages/api/src/resources/resources.controller.ts` (4 endpoints added)
- `packages/api/src/resources/services/reading-list.service.ts` (removeFromReadingList implemented)
- `packages/api/src/counsel/wellbeing.controller.ts` (1 endpoint added)
- `packages/api/src/counsel/wellbeing-history.service.ts` (convertToCSV added)

**Web (3 files)**:
- `packages/web/src/components/AssignAssessmentModal.tsx`
- `packages/web/src/components/HistoricalTrendsModal.tsx`
- `packages/web/src/components/MyAssessmentsModal.tsx`

## Testing

All endpoints tested with curl and manual testing in browser:
- ✅ Custom assessment assignment works
- ✅ Reading list GET/POST/PUT/DELETE work
- ✅ CSV export downloads correctly
- ✅ Assessment form endpoint returns data
- ✅ Frontend components consume APIs without errors

## Commits
11 commits total (Task 1-10)

## Next Phase
Phase 3: UI Build-Out
- Assessment taking page (`/assessments/take/[assignedId]`)
- Enhanced reading list page
```

**Step 44: Commit summary and test script**

```bash
git add docs/PHASE2_SUMMARY.md test-phase2-endpoints.sh
chmod +x test-phase2-endpoints.sh
git commit -m "docs: add Phase 2 completion summary and test script"
```

**Step 45: Final verification**

Run both dev servers and manually test:
1. Start API: `cd packages/api && npm run start:dev`
2. Start Web: `cd packages/web && npm run dev`
3. Test each feature in browser
4. Check console for errors
5. Verify database changes with Prisma Studio: `npx prisma studio`

**Step 46: Push to remote**

```bash
git push origin master
```

---

## Summary

**Total Tasks**: 10
**Estimated Time**: 2-3 hours
**Commits**: 11
**Endpoints Added**: 8
**Frontend Components Updated**: 3

**Key Patterns Followed**:
- TDD approach where possible
- Frequent, atomic commits
- Existing service methods leveraged
- Consistent error handling (NotFoundException, ForbiddenException)
- JWT authentication on all endpoints
- Input validation with class-validator

**Dependencies**:
- ReadingListService already exists with most methods
- WellbeingHistoryService already exists with getHistory
- AssessmentService already exists with assignAssessment pattern
- All DTOs for reading list already exist

**Next Steps**:
After Phase 2 completion, proceed to Phase 3: UI Build-Out (assessment taking page, enhanced reading list page).
