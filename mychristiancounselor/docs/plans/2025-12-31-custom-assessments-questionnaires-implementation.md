# Custom Assessments & Questionnaires Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Enable counselors to create custom assessments (scored) and questionnaires (unscored) with flexible question types, weighted category scoring, and organization-wide sharing.

**Architecture:** Extend existing Assessment model with new types and organizationId field. Add new AssessmentLibraryController for CRUD operations. Build multi-step wizard UI for assessment creation. Enhance existing assignment modal to support custom assessments.

**Tech Stack:** NestJS, Prisma, Next.js 16, React, TypeScript, Tailwind CSS

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Add organizationId field to Assessment model**

```prisma
model Assessment {
  id            String               @id @default(uuid())
  name          String
  type          AssessmentType
  category      String?
  questions     Json
  scoringRules  Json
  organizationId String?             // NEW FIELD
  isActive      Boolean              @default(true)
  createdBy     String?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  organization  Organization?        @relation(fields: [organizationId], references: [id])  // NEW RELATION
  createdByUser User?                @relation("AssessmentsCreated", fields: [createdBy], references: [id])
  schedules     AssessmentSchedule[]
  assignments   AssignedAssessment[]

  @@index([type])
  @@index([category])
  @@index([isActive])
  @@index([organizationId])                    // NEW INDEX
  @@index([type, organizationId])              // NEW INDEX
}
```

**Step 2: Update AssessmentType enum**

```prisma
enum AssessmentType {
  clinical
  custom_assessment     // NEW VALUE
  custom_questionnaire  // NEW VALUE
}
```

**Step 3: Add assessments relation to Organization model**

Find the Organization model and add:
```prisma
model Organization {
  // ... existing fields ...
  assessments    Assessment[]  // NEW RELATION
  // ... existing relations ...
}
```

**Step 4: Generate and run migration**

```bash
cd packages/api
npx prisma migrate dev --name add_custom_assessments
```

Expected: Migration created and applied successfully

**Step 5: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(db): add custom assessments schema

- Add organizationId to Assessment model
- Add custom_assessment and custom_questionnaire to AssessmentType enum
- Add indexes for organization-scoped queries"
```

---

## Task 2: Create DTOs for Assessment Library

**Files:**
- Create: `packages/api/src/counsel/dto/create-custom-assessment.dto.ts`
- Create: `packages/api/src/counsel/dto/update-custom-assessment.dto.ts`
- Create: `packages/api/src/counsel/dto/assessment-library-filters.dto.ts`

**Step 1: Create Question interface types**

Create file: `packages/api/src/counsel/dto/create-custom-assessment.dto.ts`

```typescript
import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'multiple_choice_single',
  MULTIPLE_CHOICE_MULTI = 'multiple_choice_multi',
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  RATING_SCALE = 'rating_scale',
  YES_NO = 'yes_no',
}

export class RatingScaleDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(1)
  max: number;

  @IsOptional()
  labels?: Record<number, string>;
}

export class QuestionDto {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RatingScaleDto)
  scale?: RatingScaleDto;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsString()
  @MinLength(1)
  category: string;
}

export class InterpretationRangeDto {
  @IsNumber()
  @Min(0)
  maxPercent: number;

  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @MinLength(1)
  description: string;
}

export class CategoryScoringDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  interpretations: InterpretationRangeDto[];
}

export class ScoringRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryScoringDto)
  categories: CategoryScoringDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterpretationRangeDto)
  overallInterpretations: InterpretationRangeDto[];
}

export class CreateCustomAssessmentDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(['custom_assessment', 'custom_questionnaire'])
  type: 'custom_assessment' | 'custom_questionnaire';

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringRulesDto)
  scoringRules?: ScoringRulesDto;
}
```

**Step 2: Create update DTO**

Create file: `packages/api/src/counsel/dto/update-custom-assessment.dto.ts`

```typescript
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDto, ScoringRulesDto } from './create-custom-assessment.dto';

export class UpdateCustomAssessmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringRulesDto)
  scoringRules?: ScoringRulesDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

**Step 3: Create filters DTO**

Create file: `packages/api/src/counsel/dto/assessment-library-filters.dto.ts`

```typescript
import { IsOptional, IsEnum } from 'class-validator';

export class AssessmentLibraryFiltersDto {
  @IsOptional()
  @IsEnum(['custom_assessment', 'custom_questionnaire'])
  type?: 'custom_assessment' | 'custom_questionnaire';
}
```

**Step 4: Commit**

```bash
git add packages/api/src/counsel/dto/
git commit -m "feat(api): add DTOs for custom assessment library

- Create validation DTOs for questions, scoring rules
- Add create, update, and filter DTOs
- Include comprehensive validation rules"
```

---

## Task 3: Create Assessment Library Service

**Files:**
- Create: `packages/api/src/counsel/assessment-library.service.ts`

**Step 1: Create service with list method**

```typescript
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomAssessmentDto } from './dto/create-custom-assessment.dto';
import { UpdateCustomAssessmentDto } from './dto/update-custom-assessment.dto';
import { AssessmentLibraryFiltersDto } from './dto/assessment-library-filters.dto';

@Injectable()
export class AssessmentLibraryService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, filters: AssessmentLibraryFiltersDto) {
    // Get user's organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, isCounselor: true },
    });

    if (!user || !user.isCounselor) {
      throw new ForbiddenException('Only counselors can access assessment library');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    const where: any = {
      organizationId: user.organizationId,
      type: { in: ['custom_assessment', 'custom_questionnaire'] },
    };

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.assessment.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

**Step 2: Add getById method**

```typescript
async getById(userId: string, assessmentId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, isCounselor: true },
  });

  if (!user || !user.isCounselor) {
    throw new ForbiddenException('Only counselors can access assessment library');
  }

  const assessment = await this.prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!assessment) {
    throw new NotFoundException('Assessment not found');
  }

  if (assessment.organizationId !== user.organizationId) {
    throw new ForbiddenException('Cannot access assessments from other organizations');
  }

  return assessment;
}
```

**Step 3: Add create method with validation**

```typescript
async create(userId: string, dto: CreateCustomAssessmentDto) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, isCounselor: true },
  });

  if (!user || !user.isCounselor) {
    throw new ForbiddenException('Only counselors can create assessments');
  }

  if (!user.organizationId) {
    throw new ForbiddenException('User must belong to an organization');
  }

  // Validate questions
  if (dto.questions.length === 0) {
    throw new BadRequestException('Assessment must have at least one question');
  }

  // Validate multiple choice questions have at least 2 options
  for (const question of dto.questions) {
    if (
      (question.type === 'multiple_choice_single' || question.type === 'multiple_choice_multi') &&
      (!question.options || question.options.length < 2)
    ) {
      throw new BadRequestException(`Question "${question.text}" must have at least 2 options`);
    }

    // Validate rating scales
    if (question.type === 'rating_scale') {
      if (!question.scale || question.scale.min >= question.scale.max) {
        throw new BadRequestException(`Question "${question.text}" has invalid rating scale`);
      }
    }
  }

  // Validate scoring rules for custom_assessment
  if (dto.type === 'custom_assessment') {
    if (!dto.scoringRules || dto.scoringRules.categories.length === 0) {
      throw new BadRequestException('Custom assessments must have scoring rules with at least one category');
    }

    // Extract categories from questions
    const questionCategories = new Set(dto.questions.map((q) => q.category));

    // Validate all question categories have scoring rules
    for (const category of questionCategories) {
      const hasScoring = dto.scoringRules.categories.some((c) => c.name === category);
      if (!hasScoring) {
        throw new BadRequestException(`Category "${category}" is missing scoring interpretations`);
      }
    }

    // Validate interpretation ranges cover 0-100%
    this.validateInterpretationRanges(dto.scoringRules.categories);
    this.validateInterpretationRanges([{ name: 'overall', interpretations: dto.scoringRules.overallInterpretations }]);
  }

  return this.prisma.assessment.create({
    data: {
      name: dto.name,
      type: dto.type,
      category: dto.category,
      questions: dto.questions as any,
      scoringRules: dto.scoringRules as any,
      organizationId: user.organizationId,
      createdBy: userId,
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

private validateInterpretationRanges(categories: Array<{ name: string; interpretations: any[] }>) {
  for (const category of categories) {
    const sorted = [...category.interpretations].sort((a, b) => a.maxPercent - b.maxPercent);

    // Check ranges cover 0-100
    if (sorted[0].maxPercent <= 0) {
      throw new BadRequestException(`Category "${category.name}": First range must have maxPercent > 0`);
    }

    if (sorted[sorted.length - 1].maxPercent !== 100) {
      throw new BadRequestException(`Category "${category.name}": Last range must have maxPercent = 100`);
    }

    // Check no gaps
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].maxPercent <= sorted[i - 1].maxPercent) {
        throw new BadRequestException(`Category "${category.name}": Ranges must be in ascending order without overlaps`);
      }
    }
  }
}
```

**Step 4: Add update method**

```typescript
async update(userId: string, assessmentId: string, dto: UpdateCustomAssessmentDto) {
  const assessment = await this.getById(userId, assessmentId);

  // Only creator can update
  if (assessment.createdBy !== userId) {
    throw new ForbiddenException('Only the creator can update this assessment');
  }

  // Validate questions if provided
  if (dto.questions) {
    if (dto.questions.length === 0) {
      throw new BadRequestException('Assessment must have at least one question');
    }

    // Same validation as create
    for (const question of dto.questions) {
      if (
        (question.type === 'multiple_choice_single' || question.type === 'multiple_choice_multi') &&
        (!question.options || question.options.length < 2)
      ) {
        throw new BadRequestException(`Question "${question.text}" must have at least 2 options`);
      }

      if (question.type === 'rating_scale') {
        if (!question.scale || question.scale.min >= question.scale.max) {
          throw new BadRequestException(`Question "${question.text}" has invalid rating scale`);
        }
      }
    }
  }

  // Validate scoring rules if provided
  if (dto.scoringRules) {
    const questionCategories = dto.questions
      ? new Set(dto.questions.map((q) => q.category))
      : new Set((assessment.questions as any[]).map((q: any) => q.category));

    for (const category of questionCategories) {
      const hasScoring = dto.scoringRules.categories.some((c) => c.name === category);
      if (!hasScoring) {
        throw new BadRequestException(`Category "${category}" is missing scoring interpretations`);
      }
    }

    this.validateInterpretationRanges(dto.scoringRules.categories);
    this.validateInterpretationRanges([{ name: 'overall', interpretations: dto.scoringRules.overallInterpretations }]);
  }

  return this.prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      name: dto.name,
      questions: dto.questions as any,
      scoringRules: dto.scoringRules as any,
      isActive: dto.isActive,
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}
```

**Step 5: Add delete method**

```typescript
async delete(userId: string, assessmentId: string) {
  const assessment = await this.getById(userId, assessmentId);

  // Only creator can delete
  if (assessment.createdBy !== userId) {
    throw new ForbiddenException('Only the creator can delete this assessment');
  }

  // Check for existing assignments
  const assignmentCount = await this.prisma.assignedAssessment.count({
    where: { assessmentId },
  });

  if (assignmentCount > 0) {
    throw new BadRequestException('Cannot delete assessment with existing assignments');
  }

  await this.prisma.assessment.delete({
    where: { id: assessmentId },
  });

  return { success: true };
}
```

**Step 6: Commit**

```bash
git add packages/api/src/counsel/assessment-library.service.ts
git commit -m "feat(api): add assessment library service

- Implement list, getById, create, update, delete methods
- Add organization scoping and permission checks
- Validate questions, scoring rules, and interpretation ranges
- Prevent deletion of assessments with assignments"
```

---

## Task 4: Create Assessment Library Controller

**Files:**
- Create: `packages/api/src/counsel/assessment-library.controller.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`

**Step 1: Create controller**

Create file: `packages/api/src/counsel/assessment-library.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssessmentLibraryService } from './assessment-library.service';
import { CreateCustomAssessmentDto } from './dto/create-custom-assessment.dto';
import { UpdateCustomAssessmentDto } from './dto/update-custom-assessment.dto';
import { AssessmentLibraryFiltersDto } from './dto/assessment-library-filters.dto';

@Controller('counsel/assessments/library')
@UseGuards(JwtAuthGuard)
export class AssessmentLibraryController {
  constructor(private readonly assessmentLibraryService: AssessmentLibraryService) {}

  @Get()
  async list(@Request() req, @Query() filters: AssessmentLibraryFiltersDto) {
    return this.assessmentLibraryService.list(req.user.id, filters);
  }

  @Get(':id')
  async getById(@Request() req, @Param('id') id: string) {
    return this.assessmentLibraryService.getById(req.user.id, id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCustomAssessmentDto) {
    return this.assessmentLibraryService.create(req.user.id, dto);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCustomAssessmentDto) {
    return this.assessmentLibraryService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.assessmentLibraryService.delete(req.user.id, id);
  }
}
```

**Step 2: Register in counsel module**

Modify file: `packages/api/src/counsel/counsel.module.ts`

Add to imports at top:
```typescript
import { AssessmentLibraryController } from './assessment-library.controller';
import { AssessmentLibraryService } from './assessment-library.service';
```

Add to module decorator:
```typescript
@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [
    CounselController,
    AssessmentLibraryController,  // ADD THIS
  ],
  providers: [
    CounselService,
    AssignmentService,
    AssessmentService,
    AssessmentLibraryService,  // ADD THIS
  ],
})
export class CounselModule {}
```

**Step 3: Test endpoints with curl**

```bash
# Start API if not running
npm run start:api

# Test list (should return empty array initially)
curl -X GET http://localhost:3697/counsel/assessments/library \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: []
```

**Step 4: Commit**

```bash
git add packages/api/src/counsel/
git commit -m "feat(api): add assessment library controller

- Create REST endpoints for custom assessment CRUD
- Register controller and service in counsel module
- Add JWT authentication guard"
```

---

## Task 5: Add Frontend API Methods

**Files:**
- Modify: `packages/web/src/lib/api.ts`

**Step 1: Add assessment library API object**

Add after existing `assessmentsApi` object (around line 400):

```typescript
assessmentLibraryApi: {
  list: (type?: 'custom_assessment' | 'custom_questionnaire') => {
    const params = type ? `?type=${type}` : '';
    return apiGet(`/counsel/assessments/library${params}`);
  },
  getById: (id: string) => apiGet(`/counsel/assessments/library/${id}`),
  create: (data: {
    name: string;
    type: 'custom_assessment' | 'custom_questionnaire';
    category?: string;
    questions: any[];
    scoringRules?: any;
  }) => apiPost('/counsel/assessments/library', data),
  update: (id: string, data: {
    name?: string;
    questions?: any[];
    scoringRules?: any;
    isActive?: boolean;
  }) => apiPatch(`/counsel/assessments/library/${id}`, data),
  delete: (id: string) => apiDelete(`/counsel/assessments/library/${id}`),
},
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): add assessment library API methods

- Add list, getById, create, update, delete methods
- Support type filtering for list endpoint"
```

---

## Task 6: Create Question Types and Interfaces

**Files:**
- Create: `packages/web/src/types/assessment.ts`

**Step 1: Create types file**

```typescript
export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = 'multiple_choice_single',
  MULTIPLE_CHOICE_MULTI = 'multiple_choice_multi',
  TEXT_SHORT = 'text_short',
  TEXT_LONG = 'text_long',
  RATING_SCALE = 'rating_scale',
  YES_NO = 'yes_no',
}

export interface RatingScale {
  min: number;
  max: number;
  labels?: Record<number, string>;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  scale?: RatingScale;
  weight: number;
  category: string;
}

export interface InterpretationRange {
  maxPercent: number;
  label: string;
  description: string;
}

export interface CategoryScoring {
  name: string;
  interpretations: InterpretationRange[];
}

export interface ScoringRules {
  categories: CategoryScoring[];
  overallInterpretations: InterpretationRange[];
}

export interface CustomAssessment {
  id: string;
  name: string;
  type: 'custom_assessment' | 'custom_questionnaire';
  category?: string;
  questions: Question[];
  scoringRules?: ScoringRules;
  organizationId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}
```

**Step 2: Commit**

```bash
git add packages/web/src/types/assessment.ts
git commit -m "feat(web): add custom assessment types and interfaces

- Define QuestionType enum
- Add Question, ScoringRules, CustomAssessment interfaces
- Support all question types and scoring structures"
```

---

## Task 7: Create QuestionEditor Component

**Files:**
- Create: `packages/web/src/components/QuestionEditor.tsx`

**Step 1: Create component with basic structure**

```tsx
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
```

**Step 2: Commit**

```bash
git add packages/web/src/components/QuestionEditor.tsx
git commit -m "feat(web): add QuestionEditor component

- Support all question types with type-specific options
- Multiple choice with add/remove options
- Rating scale with min/max and labels
- Weight and category inputs
- Required checkbox"
```

---

## Task 8: Create AssessmentBuilderModal Component (Part 1: Structure)

**Files:**
- Create: `packages/web/src/components/AssessmentBuilderModal.tsx`

**Step 1: Create modal with step navigation**

```tsx
'use client';

import { useState } from 'react';
import { CustomAssessment, Question, ScoringRules, QuestionType, CategoryScoring, InterpretationRange } from '@/types/assessment';
import QuestionEditor from './QuestionEditor';
import { X } from 'lucide-react';

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
  const [questions, setQuestions] = useState<Question[]>(
    existingAssessment?.questions || []
  );
  const [scoringRules, setScoringRules] = useState<ScoringRules | undefined>(
    existingAssessment?.scoringRules
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = type === 'custom_assessment' ? 3 : 2;

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name || name.length < 3) {
        newErrors.name = 'Name must be at least 3 characters';
      }
    }

    if (step === 2) {
      if (questions.length === 0) {
        newErrors.questions = 'Add at least one question';
      }

      // Validate each question
      questions.forEach((q, index) => {
        if (!q.text) {
          newErrors[`question_${index}_text`] = 'Question text required';
        }
        if (!q.category) {
          newErrors[`question_${index}_category`] = 'Category required';
        }
        if (
          (q.type === QuestionType.MULTIPLE_CHOICE_SINGLE ||
            q.type === QuestionType.MULTIPLE_CHOICE_MULTI) &&
          (!q.options || q.options.length < 2)
        ) {
          newErrors[`question_${index}_options`] = 'At least 2 options required';
        }
        if (
          q.type === QuestionType.RATING_SCALE &&
          (!q.scale || q.scale.min >= q.scale.max)
        ) {
          newErrors[`question_${index}_scale`] = 'Invalid rating scale';
        }
      });
    }

    if (step === 3 && type === 'custom_assessment') {
      if (!scoringRules || scoringRules.categories.length === 0) {
        newErrors.scoring = 'Define scoring rules for all categories';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (validateStep(currentStep)) {
      onSave({
        name,
        type,
        category: category || undefined,
        questions,
        scoringRules: type === 'custom_assessment' ? scoringRules : undefined,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {existingAssessment ? 'Edit' : 'Create'}{' '}
              {type === 'custom_assessment' ? 'Custom Assessment' : 'Custom Questionnaire'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-700">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Questions'}
                  {step === 3 && 'Scoring'}
                </div>
                {step < totalSteps && <div className="flex-1 h-1 bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
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
              setQuestions={setQuestions}
              errors={errors}
            />
          )}

          {currentStep === 3 && type === 'custom_assessment' && (
            <Step3Scoring
              questions={questions}
              scoringRules={scoringRules}
              setScoringRules={setScoringRules}
              errors={errors}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
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

// Step 1 Component
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Weekly Check-In"
          required
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category (optional)
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="For organizing (e.g., Mental Health, Spiritual Growth)"
        />
        <p className="text-xs text-gray-500 mt-1">
          This is different from question categories used for scoring
        </p>
      </div>
    </div>
  );
}

// Step 2 Component
function Step2Questions({
  questions,
  setQuestions,
  errors,
}: {
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  errors: Record<string, string>;
}) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text: '',
      type: QuestionType.TEXT_SHORT,
      required: true,
      weight: 1.0,
      category: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updated: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updated;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Questions</h3>
        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + Add Question
        </button>
      </div>

      {errors.questions && (
        <p className="text-sm text-red-600">{errors.questions}</p>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No questions yet. Click "Add Question" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              onChange={(updated) => updateQuestion(index, updated)}
              onDelete={() => deleteQuestion(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Step 3 Component (Scoring) - Placeholder for now
function Step3Scoring({
  questions,
  scoringRules,
  setScoringRules,
  errors,
}: {
  questions: Question[];
  scoringRules?: ScoringRules;
  setScoringRules: (rules: ScoringRules) => void;
  errors: Record<string, string>;
}) {
  // Extract unique categories from questions
  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean)));

  // Initialize scoring rules if not present
  if (!scoringRules && categories.length > 0) {
    const initialRules: ScoringRules = {
      categories: categories.map((cat) => ({
        name: cat,
        interpretations: [
          { maxPercent: 33, label: 'Low', description: `Low ${cat}` },
          { maxPercent: 66, label: 'Moderate', description: `Moderate ${cat}` },
          { maxPercent: 100, label: 'High', description: `High ${cat}` },
        ],
      })),
      overallInterpretations: [
        { maxPercent: 33, label: 'Low Concern', description: 'Overall functioning appears healthy' },
        { maxPercent: 66, label: 'Moderate Concern', description: 'Some areas need attention' },
        { maxPercent: 100, label: 'High Concern', description: 'Multiple areas showing significant symptoms' },
      ],
    };
    setScoringRules(initialRules);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Scoring Rules</h3>
        <p className="text-sm text-gray-600">
          Define interpretation ranges for each category and overall score.
          Scores are calculated as weighted percentages (0-100%).
        </p>
      </div>

      {errors.scoring && (
        <p className="text-sm text-red-600">{errors.scoring}</p>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Add questions with categories in Step 2 to define scoring rules.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-700">
            Categories found: <strong>{categories.join(', ')}</strong>
          </p>
          <p className="text-sm text-blue-600">
            Default interpretation ranges have been set. You can customize them as needed.
          </p>
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✓ Scoring rules initialized with default ranges for all categories
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/AssessmentBuilderModal.tsx
git commit -m "feat(web): add AssessmentBuilderModal with 3-step wizard

- Step 1: Basic info (name, category)
- Step 2: Questions with QuestionEditor
- Step 3: Scoring rules (placeholder)
- Step navigation and validation
- Support both assessments and questionnaires"
```

---

## Task 9: Enhance AssignAssessmentModal

**Files:**
- Modify: `packages/web/src/components/AssignAssessmentModal.tsx` (if exists) or Create new

**Step 1: Check if AssignAssessmentModal exists**

```bash
find packages/web -name "AssignAssessmentModal.tsx" -o -name "*AssignAssessment*.tsx"
```

**Step 2: If modal doesn't exist, create simplified version**

Since we may not have this modal yet, create a basic version that integrates with AssessmentBuilderModal:

Create file: `packages/web/src/components/AssignAssessmentModal.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { CustomAssessment } from '@/types/assessment';
import AssessmentBuilderModal from './AssessmentBuilderModal';

interface AssignAssessmentModalProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignAssessmentModal({
  memberId,
  memberName,
  onClose,
  onSuccess,
}: AssignAssessmentModalProps) {
  const [assessmentType, setAssessmentType] = useState<'clinical' | 'custom'>('clinical');
  const [customAssessments, setCustomAssessments] = useState<CustomAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<'custom_assessment' | 'custom_questionnaire'>('custom_questionnaire');

  useEffect(() => {
    if (assessmentType === 'custom') {
      loadCustomAssessments();
    }
  }, [assessmentType]);

  const loadCustomAssessments = async () => {
    try {
      setLoading(true);
      const response = await api.assessmentLibraryApi.list();
      if (response.ok) {
        const data = await response.json();
        setCustomAssessments(data);
      } else {
        setError('Failed to load custom assessments');
      }
    } catch (err) {
      setError('Failed to load custom assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssessmentId) {
      setError('Please select an assessment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.assessmentsApi.assign({
        memberId,
        assessmentId: selectedAssessmentId,
        dueDate: dueDate || undefined,
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to assign assessment');
      }
    } catch (err) {
      setError('Failed to assign assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async (assessment: Partial<CustomAssessment>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.assessmentLibraryApi.create(assessment as any);

      if (response.ok) {
        const created = await response.json();
        setShowBuilder(false);
        await loadCustomAssessments();
        setSelectedAssessmentId(created.id);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create assessment');
      }
    } catch (err) {
      setError('Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assign Assessment to {memberName}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Assessment Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setAssessmentType('clinical')}
                  className={`px-4 py-2 rounded border ${
                    assessmentType === 'clinical'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Clinical
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentType('custom')}
                  className={`px-4 py-2 rounded border ${
                    assessmentType === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Clinical Assessments (Placeholder) */}
            {assessmentType === 'clinical' && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">Clinical assessments coming soon</p>
              </div>
            )}

            {/* Custom Assessments */}
            {assessmentType === 'custom' && (
              <div>
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderType('custom_assessment');
                      setShowBuilder(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Create Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderType('custom_questionnaire');
                      setShowBuilder(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Create Questionnaire
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading...</p>
                  </div>
                ) : customAssessments.length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600">
                      No custom assessments yet. Click "Create Assessment" or "Create Questionnaire" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customAssessments.map((assessment) => (
                      <button
                        key={assessment.id}
                        type="button"
                        onClick={() => setSelectedAssessmentId(assessment.id)}
                        className={`w-full text-left p-4 border rounded hover:bg-gray-50 ${
                          selectedAssessmentId === assessment.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{assessment.name}</h3>
                            <p className="text-sm text-gray-600">
                              {assessment.questions.length} questions
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              assessment.type === 'custom_assessment'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {assessment.type === 'custom_assessment' ? 'Assessment' : 'Questionnaire'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Due Date */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!selectedAssessmentId || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>

      {showBuilder && (
        <AssessmentBuilderModal
          type={builderType}
          onSave={handleCreateAssessment}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </>
  );
}
```

**Step 3: Commit**

```bash
git add packages/web/src/components/AssignAssessmentModal.tsx
git commit -m "feat(web): add AssignAssessmentModal with custom assessment support

- Toggle between Clinical and Custom types
- Show custom assessments list with create buttons
- Integrate AssessmentBuilderModal
- Support due date selection
- Assign selected assessment to member"
```

---

## Task 10: Integrate into Counselor Dashboard

**Files:**
- Modify: `packages/web/src/components/CounselorDashboard.tsx`

**Step 1: Add "Assign Assessment" menu item**

Find the member actions menu (around line 450) and add new menu item:

```tsx
{/* Existing menu items */}
<button onClick={() => openObservations(member)}>
  Observations
</button>

{/* ADD THIS */}
<button
  onClick={() => {
    setSelectedMember(member);
    setShowAssignAssessment(true);
    setIsMenuOpen(false);
  }}
  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
>
  Assign Assessment
</button>
```

**Step 2: Add state and modal**

Add state near other state declarations:

```tsx
const [showAssignAssessment, setShowAssignAssessment] = useState(false);
```

Add modal before closing tag:

```tsx
{showAssignAssessment && selectedMember && (
  <AssignAssessmentModal
    memberId={selectedMember.id}
    memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
    onClose={() => {
      setShowAssignAssessment(false);
      setSelectedMember(null);
    }}
    onSuccess={() => {
      // Optionally refresh data
      fetchMembers();
    }}
  />
)}
```

**Step 3: Add import**

Add to imports at top:

```tsx
import AssignAssessmentModal from './AssignAssessmentModal';
```

**Step 4: Test manually**

```bash
# Ensure API and web are running
# Login as counselor
# Open member menu
# Click "Assign Assessment"
# Should see modal open
```

**Step 5: Commit**

```bash
git add packages/web/src/components/CounselorDashboard.tsx
git commit -m "feat(web): integrate assessment assignment into counselor dashboard

- Add 'Assign Assessment' menu item to member actions
- Open AssignAssessmentModal on click
- Refresh data after successful assignment"
```

---

## Task 11: Final Testing and Cleanup

**Files:**
- Various

**Step 1: Create a test custom questionnaire**

```bash
# Using API client or Postman
# POST to http://localhost:3697/counsel/assessments/library
# Body:
{
  "name": "Weekly Check-In",
  "type": "custom_questionnaire",
  "questions": [
    {
      "id": "q1",
      "text": "How are you feeling this week?",
      "type": "text_long",
      "required": true,
      "weight": 1.0,
      "category": "general"
    },
    {
      "id": "q2",
      "text": "Rate your stress level",
      "type": "rating_scale",
      "required": true,
      "scale": { "min": 1, "max": 10, "labels": { "1": "Very Low", "10": "Very High" } },
      "weight": 1.5,
      "category": "stress"
    }
  ]
}
```

**Step 2: Test full flow in UI**

1. Login as counselor
2. Open member menu → "Assign Assessment"
3. Switch to "Custom" type
4. Verify test questionnaire appears
5. Select it and assign with due date
6. Verify assignment succeeds

**Step 3: Clean rebuild to ensure no stale code**

```bash
npx nx reset
rm -rf dist packages/web/.next
npx nx build api
npx nx build web
```

**Step 4: Restart servers**

```bash
# Kill existing
pkill -f "nest start"
pkill -f "next dev"

# Start fresh
npm run start:api &
npm run start:web &
```

**Step 5: Final manual testing checklist**

- [ ] Can create custom questionnaire via UI
- [ ] Can create custom assessment via UI
- [ ] Created assessments appear in list
- [ ] Can assign custom assessment to member
- [ ] Assignment appears in member's assessments
- [ ] Can view assessment details
- [ ] Validation errors show correctly
- [ ] Organization scoping works (only see own org's assessments)

**Step 6: Commit**

```bash
git add .
git commit -m "feat: complete custom assessments and questionnaires feature

Full implementation including:
- Backend: Schema, DTOs, service, controller
- Frontend: Question editor, builder modal, assignment modal
- Integration: Counselor dashboard menu item
- All validation and permission checks
- Organization-scoped sharing"
```

---

## Summary

This plan implements the complete Custom Assessments & Questionnaires feature with:

1. **Database Schema** - Enhanced Assessment model with organizationId and new types
2. **Backend API** - Full CRUD for custom assessments with validation
3. **Frontend Components** - QuestionEditor, AssessmentBuilderModal, AssignAssessmentModal
4. **Integration** - Connected to counselor dashboard
5. **Testing** - Manual testing checklist

The implementation follows these principles:
- **TDD where applicable** - Service methods validated before use
- **DRY** - Reusable components (QuestionEditor)
- **YAGNI** - Only implemented required features, left advanced features for later
- **Incremental commits** - Each task produces a working, committable change
- **Validation at every layer** - DTO validation, service validation, UI validation

Total estimated time: 4-6 hours for experienced developer following this plan step-by-step.
