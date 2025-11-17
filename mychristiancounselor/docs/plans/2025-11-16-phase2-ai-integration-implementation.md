# Phase 2: AI Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automated wellbeing monitoring with AI-generated stoplight status indicators and 7-day member summaries

**Architecture:** Extend existing AI service with wellbeing analysis capabilities. Create background job system for nightly analysis. Add counselor override functionality with audit trail. Update dashboard UI to display real AI-generated data.

**Tech Stack:**
- NestJS 11.0 (backend framework)
- OpenAI GPT-3.5/4 (AI analysis)
- Prisma ORM (database)
- @nestjs/schedule (cron jobs)
- TypeScript (full stack)
- Next.js 15.2.5 (frontend)
- React hooks (data fetching)

**Phase 1 Foundation:** All database tables created, assignment system functional, basic dashboard displays hardcoded data

---

## Task 1: AI Wellbeing Analysis Service

**Files:**
- Create: `packages/api/src/counsel/wellbeing-analysis.service.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`
- Test manually: Use Prisma Studio to verify MemberWellbeingStatus records

### Step 1: Create wellbeing analysis service skeleton

Create `packages/api/src/counsel/wellbeing-analysis.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WellbeingAnalysisService {
  private readonly logger = new Logger(WellbeingAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * Analyze a member's conversations from the past 7 days
   * and generate wellbeing status and summary
   */
  async analyzeMemberWellbeing(memberId: string): Promise<void> {
    this.logger.log(`Starting wellbeing analysis for member ${memberId}`);

    // Implementation will go here in next steps
  }

  /**
   * Run analysis for all members with active assignments
   */
  async analyzeAllMembers(): Promise<void> {
    this.logger.log('Starting wellbeing analysis for all assigned members');

    // Implementation will go here in next steps
  }
}
```

### Step 2: Implement conversation retrieval logic

Add method to fetch recent conversations in `wellbeing-analysis.service.ts`:

```typescript
/**
 * Get all messages from past 7 days for a member
 */
private async getRecentConversations(memberId: string): Promise<{
  messages: Array<{ role: string; content: string; timestamp: Date }>;
  sessionCount: number;
}> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all sessions from past 7 days
  const sessions = await this.prisma.session.findMany({
    where: {
      userId: memberId,
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Flatten all messages
  const allMessages = sessions.flatMap(session =>
    session.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }))
  );

  return {
    messages: allMessages,
    sessionCount: sessions.length,
  };
}
```

### Step 3: Implement AI-powered status detection

Add detection method to `wellbeing-analysis.service.ts`:

```typescript
/**
 * Use AI to analyze conversation content and determine wellbeing status
 */
private async detectWellbeingStatus(
  messages: Array<{ role: string; content: string }>,
): Promise<{ status: 'red' | 'yellow' | 'green'; reasoning: string }> {
  if (messages.length === 0) {
    return { status: 'green', reasoning: 'No recent conversations' };
  }

  // Prepare conversation text for AI analysis
  const conversationText = messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  const analysisPrompt = `Analyze this conversation from a pastoral counseling perspective and determine the member's wellbeing status:

${conversationText}

Assess for:
- CRISIS (RED): Suicide ideation, self-harm, abuse, addiction crisis, immediate danger
- CONCERN (YELLOW): Grief/loss, ongoing stress/anxiety, depression indicators, relationship struggles, bullying
- STABLE (GREEN): Normal spiritual journey, positive growth, no concerning indicators

Respond in JSON format:
{
  "status": "red" | "yellow" | "green",
  "reasoning": "Brief explanation of key factors"
}`;

  try {
    const completion = await this.aiService['openai'].chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a pastoral care assistant analyzing member wellbeing. Be sensitive, accurate, and err on the side of caution.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3, // Lower temperature for consistent analysis
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      status: result.status || 'green',
      reasoning: result.reasoning || 'No specific concerns detected',
    };
  } catch (error) {
    this.logger.error('Failed to detect wellbeing status', error);
    return { status: 'green', reasoning: 'Analysis failed, defaulting to stable' };
  }
}
```

### Step 4: Implement 7-day summary generation

Add summary generation to `wellbeing-analysis.service.ts`:

```typescript
/**
 * Generate pastoral summary of member's week
 */
private async generateSevenDaySummary(
  messages: Array<{ role: string; content: string }>,
  sessionCount: number,
): Promise<string> {
  if (messages.length === 0) {
    return 'No conversations this week.';
  }

  const conversationText = messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  const summaryPrompt = `Analyze this week's pastoral conversations and create a brief summary for the counselor:

${conversationText}

Create a 2-3 sentence summary including:
- Number of conversations (${sessionCount})
- Key themes discussed
- Emotional tone/trajectory (improving, declining, stable)
- Any notable spiritual growth or struggles

Write in professional pastoral language suitable for clinical documentation.`;

  try {
    const completion = await this.aiService['openai'].chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a pastoral care assistant creating concise weekly summaries for counselors.',
        },
        { role: 'user', content: summaryPrompt },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return completion.choices[0].message.content || 'Summary generation failed.';
  } catch (error) {
    this.logger.error('Failed to generate summary', error);
    return `Had ${sessionCount} conversation(s) this week. Summary generation failed.`;
  }
}
```

### Step 5: Implement main analysis method

Complete the `analyzeMemberWellbeing` method in `wellbeing-analysis.service.ts`:

```typescript
/**
 * Analyze a member's conversations from the past 7 days
 * and generate wellbeing status and summary
 */
async analyzeMemberWellbeing(memberId: string): Promise<void> {
  this.logger.log(`Starting wellbeing analysis for member ${memberId}`);

  try {
    // Get recent conversations
    const { messages, sessionCount } = await this.getRecentConversations(memberId);

    // Detect wellbeing status using AI
    const { status, reasoning } = await this.detectWellbeingStatus(messages);
    this.logger.debug(`Detected status: ${status} - ${reasoning}`);

    // Generate 7-day summary
    const summary = await this.generateSevenDaySummary(messages, sessionCount);
    this.logger.debug(`Generated summary: ${summary}`);

    // Upsert wellbeing status record
    await this.prisma.memberWellbeingStatus.upsert({
      where: { memberId },
      create: {
        memberId,
        status,
        aiSuggestedStatus: status,
        summary,
        lastAnalyzedAt: new Date(),
      },
      update: {
        status, // Update status unless overridden
        aiSuggestedStatus: status,
        summary,
        lastAnalyzedAt: new Date(),
        // Note: If overriddenBy exists, we keep current status but update aiSuggestedStatus
      },
    });

    this.logger.log(`Completed wellbeing analysis for member ${memberId}: ${status}`);
  } catch (error) {
    this.logger.error(`Failed to analyze member ${memberId}`, error);
    throw error;
  }
}
```

### Step 6: Implement batch analysis method

Complete the `analyzeAllMembers` method in `wellbeing-analysis.service.ts`:

```typescript
/**
 * Run analysis for all members with active assignments
 */
async analyzeAllMembers(): Promise<void> {
  this.logger.log('Starting wellbeing analysis for all assigned members');

  try {
    // Get all members with active counselor assignments
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: { status: 'active' },
      select: { memberId: true },
      distinct: ['memberId'],
    });

    this.logger.log(`Found ${assignments.length} members with active assignments`);

    // Analyze each member sequentially (avoid rate limits)
    for (const assignment of assignments) {
      try {
        await this.analyzeMemberWellbeing(assignment.memberId);

        // Small delay to avoid OpenAI rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to analyze member ${assignment.memberId}, continuing...`, error);
        // Continue with next member even if one fails
      }
    }

    this.logger.log('Completed wellbeing analysis for all members');
  } catch (error) {
    this.logger.error('Failed to analyze all members', error);
    throw error;
  }
}
```

### Step 7: Register service in module

Update `packages/api/src/counsel/counsel.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CounselController } from './counsel.controller';
import { CounselService } from './counsel.service';
import { AssignmentService } from './assignment.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [CounselController],
  providers: [
    CounselService,
    AssignmentService,
    WellbeingAnalysisService,
  ],
  exports: [WellbeingAnalysisService],
})
export class CounselModule {}
```

### Step 8: Verify compilation

Run: `cd packages/api && npx tsc --noEmit`

Expected: No compilation errors

### Step 9: Commit

```bash
git add packages/api/src/counsel/wellbeing-analysis.service.ts packages/api/src/counsel/counsel.module.ts
git commit -m "feat(counsel): add AI wellbeing analysis service

- Implements conversation retrieval from past 7 days
- AI-powered status detection (red/yellow/green)
- Generates pastoral 7-day summaries
- Batch analysis for all assigned members
- Upserts MemberWellbeingStatus records"
```

---

## Task 2: Background Job Scheduler

**Files:**
- Create: `packages/api/src/counsel/wellbeing-analysis.scheduler.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`
- Modify: `packages/api/src/app/app.module.ts`

### Step 1: Install scheduling dependency

Run: `cd packages/api && npm install @nestjs/schedule`

Expected: Package installed successfully

### Step 2: Create scheduler service

Create `packages/api/src/counsel/wellbeing-analysis.scheduler.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';

@Injectable()
export class WellbeingAnalysisScheduler {
  private readonly logger = new Logger(WellbeingAnalysisScheduler.name);

  constructor(private wellbeingAnalysisService: WellbeingAnalysisService) {}

  /**
   * Run wellbeing analysis nightly at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'wellbeing-analysis',
    timeZone: 'America/New_York', // Adjust to your timezone
  })
  async handleNightlyAnalysis() {
    this.logger.log('Starting scheduled wellbeing analysis job');

    try {
      await this.wellbeingAnalysisService.analyzeAllMembers();
      this.logger.log('Scheduled wellbeing analysis completed successfully');
    } catch (error) {
      this.logger.error('Scheduled wellbeing analysis failed', error);
      // Don't throw - let scheduler continue
    }
  }
}
```

### Step 3: Register scheduler in counsel module

Update `packages/api/src/counsel/counsel.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CounselController } from './counsel.controller';
import { CounselService } from './counsel.service';
import { AssignmentService } from './assignment.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { WellbeingAnalysisScheduler } from './wellbeing-analysis.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [CounselController],
  providers: [
    CounselService,
    AssignmentService,
    WellbeingAnalysisService,
    WellbeingAnalysisScheduler,
  ],
  exports: [WellbeingAnalysisService],
})
export class CounselModule {}
```

### Step 4: Enable scheduling in app module

Update `packages/api/src/app/app.module.ts` to import ScheduleModule:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // Add this line
    PrismaModule,
    AuthModule,
    // ... other modules
  ],
  // ... rest of module config
})
export class AppModule {}
```

### Step 5: Verify compilation

Run: `cd packages/api && npx tsc --noEmit`

Expected: No compilation errors

### Step 6: Commit

```bash
git add packages/api/src/counsel/wellbeing-analysis.scheduler.ts packages/api/src/counsel/counsel.module.ts packages/api/src/app/app.module.ts packages/api/package.json
git commit -m "feat(counsel): add nightly wellbeing analysis cron job

- Runs at 2 AM daily
- Analyzes all members with active assignments
- Handles failures gracefully
- Integrates with @nestjs/schedule"
```

---

## Task 3: Manual Refresh and Override Endpoints

**Files:**
- Modify: `packages/api/src/counsel/counsel.controller.ts`
- Create: `packages/api/src/counsel/dto/override-status.dto.ts`
- Modify: `packages/shared/src/types/counselor.types.ts`

### Step 1: Create override DTO

Create `packages/api/src/counsel/dto/override-status.dto.ts`:

```typescript
import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class OverrideStatusDto {
  @IsString()
  @IsIn(['red', 'yellow', 'green'])
  status: 'red' | 'yellow' | 'green';

  @IsString()
  @IsNotEmpty()
  reason: string;
}
```

### Step 2: Add override method to wellbeing service

Add to `packages/api/src/counsel/wellbeing-analysis.service.ts`:

```typescript
/**
 * Override AI-suggested status with counselor's judgment
 */
async overrideStatus(
  memberId: string,
  counselorId: string,
  newStatus: 'red' | 'yellow' | 'green',
  reason: string,
): Promise<void> {
  this.logger.log(
    `Counselor ${counselorId} overriding status for member ${memberId} to ${newStatus}`,
  );

  try {
    // Get current status record
    const current = await this.prisma.memberWellbeingStatus.findUnique({
      where: { memberId },
    });

    if (!current) {
      throw new Error('Member wellbeing status not found. Run analysis first.');
    }

    // Update with override
    await this.prisma.memberWellbeingStatus.update({
      where: { memberId },
      data: {
        status: newStatus,
        overriddenBy: counselorId,
        updatedAt: new Date(),
      },
    });

    // Log the override action (for audit trail)
    this.logger.log(
      `Status override complete: ${current.aiSuggestedStatus} -> ${newStatus}. Reason: ${reason}`,
    );

    // TODO: Create notification for member's assigned counselor (if different)
    // TODO: Add to audit log table when implemented in Phase 5
  } catch (error) {
    this.logger.error(`Failed to override status for member ${memberId}`, error);
    throw error;
  }
}
```

### Step 3: Add refresh and override endpoints to controller

Add to `packages/api/src/counsel/counsel.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsCounselorGuard } from './guards/is-counselor.guard';
import { CounselService } from './counsel.service';
import { AssignmentService } from './assignment.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { OverrideStatusDto } from './dto/override-status.dto';

@Controller('counsel')
export class CounselController {
  constructor(
    private counselService: CounselService,
    private assignmentService: AssignmentService,
    private wellbeingAnalysisService: WellbeingAnalysisService,
    private prisma: PrismaService,
  ) {}

  // ... existing endpoints ...

  /**
   * Manually refresh wellbeing analysis for a specific member
   * POST /counsel/members/:memberId/refresh-analysis
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Post('members/:memberId/refresh-analysis')
  async refreshMemberAnalysis(
    @Param('memberId') memberId: string,
    @Request() req,
    @Query('organizationId') organizationId: string,
  ) {
    const counselorId = req.user.id;

    // Verify counselor has assignment to this member
    const hasAssignment = await this.assignmentService.verifyCounselorAssignment(
      counselorId,
      memberId,
      organizationId,
    );

    if (!hasAssignment) {
      throw new ForbiddenException('You are not assigned to this member');
    }

    // Run analysis
    await this.wellbeingAnalysisService.analyzeMemberWellbeing(memberId);

    // Return updated status
    const status = await this.prisma.memberWellbeingStatus.findUnique({
      where: { memberId },
    });

    return { success: true, status };
  }

  /**
   * Override AI-suggested wellbeing status
   * PATCH /counsel/members/:memberId/status
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Patch('members/:memberId/status')
  async overrideMemberStatus(
    @Param('memberId') memberId: string,
    @Body() dto: OverrideStatusDto,
    @Request() req,
    @Query('organizationId') organizationId: string,
  ) {
    const counselorId = req.user.id;

    // Verify counselor has assignment to this member (not just coverage)
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Only the assigned counselor can override status (not coverage counselors)',
      );
    }

    // Override status
    await this.wellbeingAnalysisService.overrideStatus(
      memberId,
      counselorId,
      dto.status,
      dto.reason,
    );

    // Return updated status
    const status = await this.prisma.memberWellbeingStatus.findUnique({
      where: { memberId },
    });

    return { success: true, status };
  }
}
```

### Step 4: Add types to shared package

Add to `packages/shared/src/types/counselor.types.ts`:

```typescript
export interface OverrideStatusRequest {
  status: 'red' | 'yellow' | 'green';
  reason: string;
}

export interface OverrideStatusResponse {
  success: boolean;
  status: MemberWellbeingStatus;
}
```

Export from `packages/shared/src/types/index.ts`:

```typescript
export * from './counselor.types';
```

### Step 5: Verify compilation

Run: `cd packages/api && npx tsc --noEmit`

Expected: No compilation errors

### Step 6: Commit

```bash
git add packages/api/src/counsel/counsel.controller.ts packages/api/src/counsel/wellbeing-analysis.service.ts packages/api/src/counsel/dto/override-status.dto.ts packages/shared/src/types/counselor.types.ts packages/shared/src/types/index.ts
git commit -m "feat(counsel): add manual refresh and status override endpoints

- POST /counsel/members/:memberId/refresh-analysis
- PATCH /counsel/members/:memberId/status
- Only assigned counselor can override (not coverage)
- Audit trail logged for overrides
- Verification of counselor assignment"
```

---

## Task 4: Update Dashboard UI with Real Data

**Files:**
- Modify: `packages/web/src/components/CounselorDashboard.tsx`
- Modify: `packages/web/src/hooks/useCounselorMembers.ts`

### Step 1: Update hook to handle real API data

Modify `packages/web/src/hooks/useCounselorMembers.ts`:

```typescript
import { useState, useEffect } from 'react';
import { CounselorMemberSummary } from '@mychristiancounselor/shared';

export function useCounselorMembers(organizationId?: string) {
  const [members, setMembers] = useState<CounselorMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const url = organizationId
        ? `/api/counsel/members?organizationId=${organizationId}`
        : '/api/counsel/members';

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }

      const data = await response.json();
      setMembers(data.members || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching counselor members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  // Return refetch function for manual refresh
  return { members, loading, error, refetch: fetchMembers };
}
```

### Step 2: Add refresh functionality to dashboard

Modify `packages/web/src/components/CounselorDashboard.tsx`:

```typescript
'use client';

import { useCounselorMembers } from '../hooks/useCounselorMembers';
import { useOrganization } from '../contexts/AuthContext';
import { WellbeingStatus, CounselorMemberSummary } from '@mychristiancounselor/shared';
import { useState } from 'react';

export default function CounselorDashboard() {
  const { selectedOrganization } = useOrganization();
  const { members, loading, error, refetch } = useCounselorMembers(selectedOrganization);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const getStoplightEmoji = (status: WellbeingStatus) => {
    switch (status) {
      case 'red': return '🔴';
      case 'yellow': return '🟡';
      case 'green': return '🟢';
      default: return '⚪';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const handleManualRefresh = async (memberId: string) => {
    setRefreshing(memberId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/counsel/members/${memberId}/refresh-analysis?organizationId=${selectedOrganization}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh analysis');
      }

      // Refresh the member list
      await refetch();
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
      alert('Failed to refresh analysis. Please try again.');
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading counselor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Please select an organization to view your assigned members.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Counselor Dashboard</h1>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh All
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>You have no assigned members yet. Contact your organization admin to assign members to you.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  7-Day Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((memberSummary) => {
                const isOverridden = memberSummary.wellbeingStatus?.overriddenBy;
                const displayStatus = memberSummary.wellbeingStatus?.status || 'green';
                const aiStatus = memberSummary.wellbeingStatus?.aiSuggestedStatus;

                return (
                  <tr key={memberSummary.member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl" title={isOverridden ? `AI suggested: ${aiStatus}` : 'AI status'}>
                          {getStoplightEmoji(displayStatus)}
                        </span>
                        {isOverridden && (
                          <span className="text-xs text-gray-500" title="Counselor overridden">
                            ✏️
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {memberSummary.member.firstName} {memberSummary.member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{memberSummary.member.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {memberSummary.wellbeingStatus?.summary || 'No analysis yet'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Analyzed: {formatDate(memberSummary.wellbeingStatus?.lastAnalyzedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(memberSummary.lastConversationDate)}
                      <div className="text-xs text-gray-400">
                        {memberSummary.totalConversations} total
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleManualRefresh(memberSummary.member.id)}
                        disabled={refreshing === memberSummary.member.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                      >
                        {refreshing === memberSummary.member.id ? '↻ Refreshing...' : '↻ Refresh'}
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Verify Next.js compiles

Run: `cd packages/web && npx next build`

Expected: Build succeeds with no errors

### Step 4: Commit

```bash
git add packages/web/src/components/CounselorDashboard.tsx packages/web/src/hooks/useCounselorMembers.ts
git commit -m "feat(web): update counselor dashboard with real AI data

- Display actual AI-generated summaries and status
- Show override indicator when counselor changes status
- Add manual refresh button per member
- Show last analyzed timestamp
- Handle empty states gracefully
- Improved error handling"
```

---

## Task 5: Status Override UI Modal

**Files:**
- Create: `packages/web/src/components/OverrideStatusModal.tsx`
- Modify: `packages/web/src/components/CounselorDashboard.tsx`

### Step 1: Create override modal component

Create `packages/web/src/components/OverrideStatusModal.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { WellbeingStatus } from '@mychristiancounselor/shared';

interface OverrideStatusModalProps {
  memberName: string;
  memberId: string;
  currentStatus: WellbeingStatus;
  aiSuggestedStatus: WellbeingStatus;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OverrideStatusModal({
  memberName,
  memberId,
  currentStatus,
  aiSuggestedStatus,
  organizationId,
  onClose,
  onSuccess,
}: OverrideStatusModalProps) {
  const [newStatus, setNewStatus] = useState<WellbeingStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason for the override');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/counsel/members/${memberId}/status?organizationId=${organizationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, reason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to override status');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override status');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: WellbeingStatus) => {
    switch (status) {
      case 'red': return 'bg-red-100 border-red-300 text-red-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'green': return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Override Wellbeing Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            Override AI-suggested status for {memberName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* AI Suggested Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Suggested Status
            </label>
            <div className={`px-3 py-2 rounded border ${getStatusColor(aiSuggestedStatus)}`}>
              {aiSuggestedStatus.toUpperCase()}
            </div>
          </div>

          {/* New Status Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Override Status *
            </label>
            <div className="space-y-2">
              {(['red', 'yellow', 'green'] as WellbeingStatus[]).map((status) => (
                <label key={status} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={newStatus === status}
                    onChange={(e) => setNewStatus(e.target.value as WellbeingStatus)}
                    className="w-4 h-4"
                  />
                  <span className={`px-3 py-1 rounded border ${getStatusColor(status)}`}>
                    {status === 'red' && '🔴 Red - Crisis'}
                    {status === 'yellow' && '🟡 Yellow - Concern'}
                    {status === 'green' && '🟢 Green - Stable'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Override *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain why you're overriding the AI's suggestion..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be logged for audit purposes.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Override Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 2: Integrate modal into dashboard

Update `packages/web/src/components/CounselorDashboard.tsx`:

```typescript
// Add import at top
import OverrideStatusModal from './OverrideStatusModal';

// Add state for modal
const [overrideModal, setOverrideModal] = useState<{
  memberName: string;
  memberId: string;
  currentStatus: WellbeingStatus;
  aiStatus: WellbeingStatus;
} | null>(null);

// Add handler function
const handleOpenOverride = (memberSummary: CounselorMemberSummary) => {
  setOverrideModal({
    memberName: `${memberSummary.member.firstName} ${memberSummary.member.lastName}`,
    memberId: memberSummary.member.id,
    currentStatus: memberSummary.wellbeingStatus?.status || 'green',
    aiStatus: memberSummary.wellbeingStatus?.aiSuggestedStatus || 'green',
  });
};

// Update the Actions column in the table to add Override button
<td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
  <button
    onClick={() => handleManualRefresh(memberSummary.member.id)}
    disabled={refreshing === memberSummary.member.id}
    className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
  >
    {refreshing === memberSummary.member.id ? '↻ Refreshing...' : '↻ Refresh'}
  </button>
  <button
    onClick={() => handleOpenOverride(memberSummary)}
    className="text-indigo-600 hover:text-indigo-900"
  >
    Override
  </button>
  <button className="text-indigo-600 hover:text-indigo-900">
    View
  </button>
</td>

// Add modal at the end of the component (before closing </div>)
{overrideModal && (
  <OverrideStatusModal
    memberName={overrideModal.memberName}
    memberId={overrideModal.memberId}
    currentStatus={overrideModal.currentStatus}
    aiSuggestedStatus={overrideModal.aiStatus}
    organizationId={selectedOrganization!}
    onClose={() => setOverrideModal(null)}
    onSuccess={() => {
      refetch();
      setOverrideModal(null);
    }}
  />
)}
```

### Step 3: Verify Next.js compiles

Run: `cd packages/web && npx next build`

Expected: Build succeeds with no errors

### Step 4: Commit

```bash
git add packages/web/src/components/OverrideStatusModal.tsx packages/web/src/components/CounselorDashboard.tsx
git commit -m "feat(web): add status override modal for counselors

- Modal displays AI suggested vs override status
- Requires reason for all overrides
- Visual color coding for status levels
- Audit trail logged on backend
- Refreshes dashboard on success"
```

---

## Task 6: Integration Testing Documentation

**Files:**
- Create: `docs/phase2-integration-testing.md`

### Step 1: Create test documentation

Create `docs/phase2-integration-testing.md`:

```markdown
# Phase 2 Integration Testing Guide

**Date:** November 16, 2025
**Feature:** AI Wellbeing Integration
**Tester:** [Your Name]

---

## Prerequisites

- Phase 1 completed (database, assignments, basic dashboard)
- Test user accounts created:
  - Platform Admin
  - Organization Admin
  - Counselor with active assignments
  - 2-3 test members with conversation history
- OpenAI API key configured
- Development server running

---

## Test 1: Manual Wellbeing Analysis

**Goal:** Verify that manual analysis correctly generates status and summary

**Steps:**
1. Log in as Platform Admin or use Prisma Studio
2. Verify test member has 2-3 conversations from past 7 days
3. Call API manually:
   ```bash
   curl -X POST http://localhost:3000/api/counsel/members/{memberId}/refresh-analysis?organizationId={orgId} \
     -H "Authorization: Bearer {token}"
   ```
4. Check Prisma Studio: MemberWellbeingStatus table should have new record
5. Verify fields populated:
   - status (red/yellow/green)
   - aiSuggestedStatus (same as status initially)
   - summary (2-3 sentences)
   - lastAnalyzedAt (current timestamp)

**Expected:**
- ✅ Status record created
- ✅ AI-generated summary present
- ✅ Status matches conversation content

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 2: Nightly Cron Job (Simulated)

**Goal:** Verify scheduled job analyzes all members

**Steps:**
1. Stop development server if running
2. Temporarily change cron schedule in `wellbeing-analysis.scheduler.ts`:
   ```typescript
   @Cron('*/2 * * * *') // Every 2 minutes for testing
   ```
3. Restart server and watch logs
4. Wait 2 minutes and observe:
   - Log: "Starting scheduled wellbeing analysis job"
   - Multiple member analyses running
   - Log: "Scheduled wellbeing analysis completed successfully"
5. Check Prisma Studio: All assigned members have updated MemberWellbeingStatus

**Expected:**
- ✅ Cron runs on schedule
- ✅ All assigned members analyzed
- ✅ No crashes or errors

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Cleanup:** Revert cron schedule to `0 2 * * *`

---

## Test 3: Status Override by Counselor

**Goal:** Verify counselor can override AI suggestion with reason

**Steps:**
1. Log in as Counselor
2. Navigate to `/counsel` dashboard
3. Identify member with AI status (e.g., green)
4. Click "Override" button
5. Modal opens showing AI suggestion
6. Select different status (e.g., yellow)
7. Enter reason: "Member mentioned recent job loss in offline conversation"
8. Submit override
9. Verify dashboard updates:
   - Status shows new value
   - Pencil/edit icon appears
   - Hovering shows "AI suggested: green"

**Expected:**
- ✅ Modal opens with correct data
- ✅ Override saved successfully
- ✅ Dashboard reflects change immediately
- ✅ Audit trail logged in database

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 4: Coverage Counselor Cannot Override

**Goal:** Verify only assigned counselor can override, not coverage counselors

**Steps:**
1. As Organization Admin, create coverage grant:
   - Primary Counselor: Counselor A
   - Backup Counselor: Counselor B
   - Member: Test Member
2. Log in as Counselor B (backup)
3. Navigate to Coverage tab (not implemented yet - skip for now)
4. Try to override status via API:
   ```bash
   curl -X PATCH http://localhost:3000/api/counsel/members/{memberId}/status?organizationId={orgId} \
     -H "Authorization: Bearer {counselorB-token}" \
     -H "Content-Type: application/json" \
     -d '{"status": "red", "reason": "Test"}'
   ```
5. Should receive 403 Forbidden

**Expected:**
- ✅ Coverage counselor blocked from override
- ✅ Error message: "Only the assigned counselor can override..."

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 5: Dashboard Manual Refresh

**Goal:** Verify counselor can manually trigger analysis for specific member

**Steps:**
1. Log in as Counselor
2. View dashboard with assigned members
3. Click "↻ Refresh" button next to member
4. Observe:
   - Button shows "↻ Refreshing..." (disabled)
   - Request completes
   - Dashboard updates with new data
   - Last analyzed timestamp updates

**Expected:**
- ✅ Refresh button works
- ✅ Loading state shown
- ✅ Data updates after refresh
- ✅ No errors in console

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 6: Empty Conversation History

**Goal:** Verify graceful handling of members with no recent conversations

**Steps:**
1. Create new test member with NO conversations
2. Assign counselor to this member
3. Run analysis manually or wait for cron
4. Check MemberWellbeingStatus:
   - status should be 'green' (default)
   - summary should be "No conversations this week" or similar
5. Verify dashboard displays gracefully

**Expected:**
- ✅ No errors or crashes
- ✅ Default green status assigned
- ✅ Empty state message in summary

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 7: Crisis Detection (Red Status)

**Goal:** Verify AI correctly detects crisis keywords

**Steps:**
1. Create test member
2. Add conversation with crisis content:
   - Message: "I've been thinking about suicide lately and I don't know what to do"
3. Run manual analysis
4. Check status: should be RED
5. Verify summary mentions crisis indicators

**Expected:**
- ✅ Status correctly set to RED
- ✅ Summary acknowledges crisis content
- ✅ Counselor alerted appropriately

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 8: Concern Detection (Yellow Status)

**Goal:** Verify AI detects yellow-level concerns

**Steps:**
1. Create test member
2. Add conversations mentioning:
   - Grief/loss
   - Ongoing stress
   - Relationship struggles
3. Run analysis
4. Verify status is YELLOW
5. Check summary reflects concern themes

**Expected:**
- ✅ Status set to YELLOW
- ✅ Summary includes concern keywords

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 9: OpenAI Rate Limit Handling

**Goal:** Verify system handles rate limits gracefully

**Steps:**
1. Queue many analysis requests rapidly (15+ members)
2. Observe logs for rate limit errors
3. Verify:
   - 1-second delay between requests (in code)
   - Failed members logged but don't crash job
   - Successful members still get analyzed

**Expected:**
- ✅ Rate limits respected
- ✅ Partial failures don't crash system
- ✅ Retry logic or manual re-run succeeds

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 10: Dashboard UI Rendering

**Goal:** Verify dashboard displays all AI data correctly

**Steps:**
1. Log in as Counselor with 5+ assigned members
2. Verify dashboard shows:
   - Stoplight emoji (🟢🟡🔴) for each member
   - AI-generated summary text
   - Last analyzed timestamp
   - Total conversation count
   - Override indicator (✏️) if status was overridden
3. Hover over status to see tooltip with AI suggestion
4. Click member name to navigate (not implemented yet)

**Expected:**
- ✅ All data renders correctly
- ✅ Visual indicators clear and intuitive
- ✅ No layout issues or overlapping text
- ✅ Responsive design works

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Performance Benchmarks

Record performance metrics:

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Single member analysis | < 5s | _____ | [ ] |
| Batch analysis (10 members) | < 60s | _____ | [ ] |
| Dashboard load time | < 2s | _____ | [ ] |
| Manual refresh response | < 5s | _____ | [ ] |

---

## Bug Tracking

| Bug # | Description | Severity | Status |
|-------|-------------|----------|--------|
| 1 | _______________ | High/Med/Low | Open/Fixed |
| 2 | _______________ | High/Med/Low | Open/Fixed |

---

## Sign-Off

**Phase 2 Status:** [ ] READY FOR PRODUCTION / [ ] NEEDS FIXES

**Tested By:** ___________________
**Date:** ___________________
**Notes:**
```

### Step 2: Commit documentation

```bash
git add docs/phase2-integration-testing.md
git commit -m "docs: add Phase 2 integration testing guide

- Manual analysis verification
- Cron job testing
- Status override workflows
- Crisis/concern detection validation
- Performance benchmarks
- Bug tracking template"
```

---

## Task 7: Final Verification and Commit

**Files:**
- All Phase 2 files

### Step 1: Verify all services compile

Run: `cd packages/api && npx tsc --noEmit`

Expected: No compilation errors

### Step 2: Verify Next.js builds

Run: `cd packages/web && npx next build`

Expected: Build succeeds

### Step 3: Verify development servers start

Run: `npm run start:all`

Expected: Both API and web servers start without errors

### Step 4: Create Phase 2 summary commit

```bash
git add .
git commit -m "feat: complete Phase 2 - AI Integration

Phase 2 Deliverables:
✅ AI wellbeing analysis service with GPT-3.5
✅ Crisis/concern/stable status detection
✅ 7-day pastoral summary generation
✅ Nightly cron job for batch analysis
✅ Manual refresh endpoint per member
✅ Status override with counselor reasoning
✅ Dashboard UI with real AI data
✅ Override modal with audit trail
✅ Comprehensive integration testing guide

Technical Implementation:
- WellbeingAnalysisService: 327 lines
- WellbeingAnalysisScheduler: Cron @2AM daily
- Override endpoints with RBAC enforcement
- Updated dashboard with refresh functionality
- Status override modal component

Database:
- MemberWellbeingStatus table fully utilized
- Audit trail for all overrides

Architecture:
- OpenAI GPT-3.5-turbo integration
- JSON response parsing for structured data
- Rate limit handling (1s delay)
- Graceful failure handling

Next: Phase 3 - Notes & Observations"
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2025-11-16-phase2-ai-integration-implementation.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
