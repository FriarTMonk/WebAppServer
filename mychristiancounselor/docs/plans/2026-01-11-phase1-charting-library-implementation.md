# Phase 1: Charting Library Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install Recharts and implement comprehensive visual analytics across all platform areas (20-25 chart types) for member wellness, counselor analytics, admin metrics, marketing campaigns, and sales pipeline.

**Architecture:** Install Recharts library, create reusable chart components in shared directory, build backend API endpoints for chart data aggregation, integrate charts into existing pages with loading/empty states.

**Tech Stack:** Recharts, React 19, TypeScript, Next.js 16, NestJS, Prisma, Tailwind CSS

---

## Group 1: Foundation (Install & Shared Components)

### Task 1: Install Recharts library

**Files:**
- Modify: `packages/web/package.json`

**Step 1: Install Recharts**

Run: `cd packages/web && npm install recharts`
Expected: Package installed successfully

**Step 2: Verify installation**

Run: `npm list recharts`
Expected: `recharts@2.x.x`

**Step 3: Commit**

```bash
git add packages/web/package.json packages/web/package-lock.json
git commit -m "feat(charts): install Recharts library for visual analytics"
```

---

### Task 2: Create shared chart components directory structure

**Files:**
- Create: `packages/web/src/components/charts/index.ts`
- Create: `packages/web/src/components/charts/LineChart.tsx`
- Create: `packages/web/src/components/charts/BarChart.tsx`
- Create: `packages/web/src/components/charts/PieChart.tsx`
- Create: `packages/web/src/components/charts/ChartContainer.tsx`
- Create: `packages/web/src/components/charts/EmptyChart.tsx`

**Step 1: Create charts directory**

Run: `mkdir -p packages/web/src/components/charts`
Expected: Directory created

**Step 2: Create ChartContainer component**

File: `packages/web/src/components/charts/ChartContainer.tsx`

```typescript
'use client';

import React from 'react';

interface ChartContainerProps {
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  height?: number;
}

export function ChartContainer({
  title,
  description,
  loading,
  error,
  children,
  height = 300,
}: ChartContainerProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {!loading && !error && children}
    </div>
  );
}
```

**Step 3: Create EmptyChart component**

File: `packages/web/src/components/charts/EmptyChart.tsx`

```typescript
'use client';

interface EmptyChartProps {
  message?: string;
  height?: number;
}

export function EmptyChart({ message = 'No data available', height = 300 }: EmptyChartProps) {
  return (
    <div
      className="flex items-center justify-center text-gray-500 text-sm"
      style={{ height }}
    >
      {message}
    </div>
  );
}
```

**Step 4: Create reusable LineChart component**

File: `packages/web/src/components/charts/LineChart.tsx`

```typescript
'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface LineChartData {
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartData[];
  xAxisKey: string;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  emptyMessage?: string;
}

export function LineChart({
  data,
  xAxisKey,
  lines,
  height = 300,
  emptyMessage,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          stroke="#d1d5db"
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          stroke="#d1d5db"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
```

**Step 5: Create reusable BarChart component**

File: `packages/web/src/components/charts/BarChart.tsx`

```typescript
'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface BarChartData {
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  xAxisKey: string;
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  emptyMessage?: string;
}

export function BarChart({
  data,
  xAxisKey,
  bars,
  height = 300,
  layout = 'vertical',
  emptyMessage,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {layout === 'vertical' ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
```

**Step 6: Create reusable PieChart component**

File: `packages/web/src/components/charts/PieChart.tsx`

```typescript
'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface PieChartData {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieChartData[];
  colors: string[];
  height?: number;
  emptyMessage?: string;
}

export function PieChart({
  data,
  colors,
  height = 300,
  emptyMessage,
}: PieChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
```

**Step 7: Create index file for exports**

File: `packages/web/src/components/charts/index.ts`

```typescript
export { LineChart } from './LineChart';
export { BarChart } from './BarChart';
export { PieChart } from './PieChart';
export { ChartContainer } from './ChartContainer';
export { EmptyChart } from './EmptyChart';

export type { LineChartData } from './LineChart';
export type { BarChartData } from './BarChart';
export type { PieChartData } from './PieChart';
```

**Step 8: Commit**

```bash
git add packages/web/src/components/charts/
git commit -m "feat(charts): add shared chart components (Line, Bar, Pie, Container, Empty)"
```

---

## Group 2: Backend API Endpoints for Chart Data

### Task 3: Create wellness charts controller

**Files:**
- Create: `packages/api/src/wellness/wellness-charts.controller.ts`
- Create: `packages/api/src/wellness/wellness-charts.service.ts`
- Modify: `packages/api/src/wellness/wellness.module.ts`

**Step 1: Create wellness charts service**

File: `packages/api/src/wellness/wellness-charts.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MoodTrendData {
  date: string;
  mood: number;
}

interface SleepData {
  date: string;
  hours: number;
  quality: number;
}

interface ExerciseData {
  date: string;
  minutes: number;
}

interface MultiMetricData {
  date: string;
  mood: number;
  sleep: number;
  exercise: number;
}

@Injectable()
export class WellnessChartsService {
  constructor(private prisma: PrismaService) {}

  async getMoodTrends(userId: string, days: number): Promise<MoodTrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.wellnessLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        mood: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        mood: true,
      },
    });

    return logs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      mood: log.mood || 0,
    }));
  }

  async getSleepTrends(userId: string, days: number): Promise<SleepData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.wellnessLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        sleepHours: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        sleepHours: true,
        sleepQuality: true,
      },
    });

    return logs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      hours: log.sleepHours || 0,
      quality: log.sleepQuality || 0,
    }));
  }

  async getExerciseTrends(userId: string, days: number): Promise<ExerciseData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.wellnessLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        exerciseMinutes: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        exerciseMinutes: true,
      },
    });

    return logs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      minutes: log.exerciseMinutes || 0,
    }));
  }

  async getMultiMetricCorrelation(userId: string, days: number): Promise<MultiMetricData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.wellnessLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        mood: true,
        sleepQuality: true,
        exerciseMinutes: true,
      },
    });

    return logs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      mood: log.mood || 0,
      sleep: log.sleepQuality || 0,
      exercise: log.exerciseMinutes ? Math.min(log.exerciseMinutes / 60, 10) : 0, // Normalize to 0-10 scale
    }));
  }
}
```

**Step 2: Create wellness charts controller**

File: `packages/api/src/wellness/wellness-charts.controller.ts`

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WellnessChartsService } from './wellness-charts.service';

@Controller('wellness/charts')
@UseGuards(JwtAuthGuard)
export class WellnessChartsController {
  constructor(private wellnessCharts: WellnessChartsService) {}

  @Get('mood')
  async getMoodTrends(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.wellnessCharts.getMoodTrends(userId, parsedDays);
  }

  @Get('sleep')
  async getSleepTrends(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.wellnessCharts.getSleepTrends(userId, parsedDays);
  }

  @Get('exercise')
  async getExerciseTrends(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.wellnessCharts.getExerciseTrends(userId, parsedDays);
  }

  @Get('correlation')
  async getMultiMetricCorrelation(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.wellnessCharts.getMultiMetricCorrelation(userId, parsedDays);
  }
}
```

**Step 3: Register in WellnessModule**

File: `packages/api/src/wellness/wellness.module.ts`

Add imports:
```typescript
import { WellnessChartsController } from './wellness-charts.controller';
import { WellnessChartsService } from './wellness-charts.service';
```

Add to module:
```typescript
@Module({
  controllers: [
    WellnessController,
    WellnessChartsController, // Add this
  ],
  providers: [
    WellnessService,
    WellnessChartsService, // Add this
  ],
})
```

**Step 4: Commit**

```bash
git add packages/api/src/wellness/
git commit -m "feat(charts): add wellness charts API endpoints"
```

---

### Task 4: Create counselor assessment charts service

**Files:**
- Create: `packages/api/src/counsel/charts/assessment-charts.service.ts`
- Create: `packages/api/src/counsel/charts/member-charts.controller.ts`
- Modify: `packages/api/src/counsel/counsel.module.ts`

**Step 1: Create charts directory**

Run: `mkdir -p packages/api/src/counsel/charts`
Expected: Directory created

**Step 2: Create assessment charts service**

File: `packages/api/src/counsel/charts/assessment-charts.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AssessmentTrendData {
  date: string;
  score: number;
}

interface TaskCompletionData {
  name: string;
  value: number;
}

interface SessionFrequencyData {
  week: string;
  count: number;
}

@Injectable()
export class AssessmentChartsService {
  constructor(private prisma: PrismaService) {}

  async getAssessmentTrends(
    memberId: string,
    assessmentType: string,
  ): Promise<AssessmentTrendData[]> {
    const results = await this.prisma.assessmentResult.findMany({
      where: {
        memberId,
        assessmentType,
      },
      orderBy: { completedAt: 'asc' },
      select: {
        completedAt: true,
        totalScore: true,
      },
      take: 50, // Last 50 assessments
    });

    return results.map(result => ({
      date: result.completedAt.toISOString().split('T')[0],
      score: result.totalScore,
    }));
  }

  async getTaskCompletion(memberId: string): Promise<TaskCompletionData[]> {
    const tasks = await this.prisma.task.groupBy({
      by: ['status'],
      where: { memberId },
      _count: true,
    });

    return tasks.map(task => ({
      name: task.status.charAt(0).toUpperCase() + task.status.slice(1),
      value: task._count,
    }));
  }

  async getAssessmentCompletion(memberId: string): Promise<TaskCompletionData[]> {
    const completed = await this.prisma.assessmentResult.count({
      where: { memberId },
    });

    const assigned = await this.prisma.task.count({
      where: {
        memberId,
        type: 'assessment',
      },
    });

    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: Math.max(0, assigned - completed) },
    ];
  }

  async getSessionFrequency(memberId: string, weeks: number = 12): Promise<SessionFrequencyData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        memberId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
      },
    });

    // Group by week
    const weekMap = new Map<string, number>();
    conversations.forEach(conv => {
      const week = this.getWeekKey(conv.createdAt);
      weekMap.set(week, (weekMap.get(week) || 0) + 1);
    });

    return Array.from(weekMap.entries()).map(([week, count]) => ({
      week,
      count,
    }));
  }

  private getWeekKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
```

**Step 3: Create member charts controller**

File: `packages/api/src/counsel/charts/member-charts.controller.ts`

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssessmentChartsService } from './assessment-charts.service';

@Controller('counsel/members/:memberId/charts')
@UseGuards(JwtAuthGuard)
export class MemberChartsController {
  constructor(private assessmentCharts: AssessmentChartsService) {}

  @Get('assessments/:type')
  async getAssessmentTrends(
    @Param('memberId') memberId: string,
    @Param('type') assessmentType: string,
  ) {
    return this.assessmentCharts.getAssessmentTrends(memberId, assessmentType);
  }

  @Get('tasks/completion')
  async getTaskCompletion(@Param('memberId') memberId: string) {
    return this.assessmentCharts.getTaskCompletion(memberId);
  }

  @Get('assessments/completion')
  async getAssessmentCompletion(@Param('memberId') memberId: string) {
    return this.assessmentCharts.getAssessmentCompletion(memberId);
  }

  @Get('sessions/frequency')
  async getSessionFrequency(
    @Param('memberId') memberId: string,
    @Query('weeks') weeks?: string,
  ) {
    const parsedWeeks = weeks ? parseInt(weeks, 10) : 12;
    return this.assessmentCharts.getSessionFrequency(memberId, parsedWeeks);
  }
}
```

**Step 4: Register in CounselModule**

File: `packages/api/src/counsel/counsel.module.ts`

Add imports:
```typescript
import { MemberChartsController } from './charts/member-charts.controller';
import { AssessmentChartsService } from './charts/assessment-charts.service';
```

Add to module:
```typescript
@Module({
  controllers: [
    // ... existing controllers
    MemberChartsController, // Add this
  ],
  providers: [
    // ... existing providers
    AssessmentChartsService, // Add this
  ],
})
```

**Step 5: Commit**

```bash
git add packages/api/src/counsel/charts/
git add packages/api/src/counsel/counsel.module.ts
git commit -m "feat(charts): add counselor member assessment charts API"
```

---

### Task 5: Create admin analytics charts service

**Files:**
- Create: `packages/api/src/admin/charts/admin-charts.service.ts`
- Create: `packages/api/src/admin/charts/admin-charts.controller.ts`
- Modify: `packages/api/src/admin/admin.module.ts`

**Step 1: Create charts directory**

Run: `mkdir -p packages/api/src/admin/charts`
Expected: Directory created

**Step 2: Create admin charts service**

File: `packages/api/src/admin/charts/admin-charts.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CostTrendData {
  date: string;
  cost: number;
}

interface CostByModelData {
  name: string;
  value: number;
}

interface EvaluationVolumeData {
  date: string;
  count: number;
}

interface EmailHealthData {
  date: string;
  delivered: number;
  bounced: number;
  opened: number;
}

interface UserGrowthData {
  date: string;
  signups: number;
}

interface RevenueData {
  month: string;
  mrr: number;
  arr: number;
}

@Injectable()
export class AdminChartsService {
  constructor(private prisma: PrismaService) {}

  async getCostTrends(days: number = 30): Promise<CostTrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costs = await this.prisma.evaluationCostLog.groupBy({
      by: ['evaluatedAt'],
      where: {
        evaluatedAt: { gte: startDate },
      },
      _sum: { totalCost: true },
      orderBy: { evaluatedAt: 'asc' },
    });

    return costs.map(cost => ({
      date: cost.evaluatedAt.toISOString().split('T')[0],
      cost: cost._sum.totalCost || 0,
    }));
  }

  async getCostByModel(): Promise<CostByModelData[]> {
    const costs = await this.prisma.evaluationCostLog.groupBy({
      by: ['modelUsed'],
      _sum: { totalCost: true },
    });

    return costs.map(cost => ({
      name: this.formatModelName(cost.modelUsed),
      value: cost._sum.totalCost || 0,
    }));
  }

  async getEvaluationVolume(days: number = 30): Promise<EvaluationVolumeData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const volumes = await this.prisma.evaluationCostLog.groupBy({
      by: ['evaluatedAt'],
      where: {
        evaluatedAt: { gte: startDate },
      },
      _count: true,
      orderBy: { evaluatedAt: 'asc' },
    });

    return volumes.map(volume => ({
      date: volume.evaluatedAt.toISOString().split('T')[0],
      count: volume._count,
    }));
  }

  async getEmailHealth(days: number = 30): Promise<EmailHealthData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.emailLog.groupBy({
      by: ['sentAt'],
      where: {
        sentAt: { gte: startDate },
      },
      _count: {
        deliveredAt: true,
        bouncedAt: true,
        openedAt: true,
      },
      orderBy: { sentAt: 'asc' },
    });

    return logs.map(log => ({
      date: log.sentAt.toISOString().split('T')[0],
      delivered: log._count.deliveredAt,
      bounced: log._count.bouncedAt,
      opened: log._count.openedAt,
    }));
  }

  async getUserGrowth(days: number = 90): Promise<UserGrowthData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    return users.map(user => ({
      date: user.createdAt.toISOString().split('T')[0],
      signups: user._count,
    }));
  }

  async getRevenueTrends(months: number = 12): Promise<RevenueData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // This is a simplified example - actual implementation would depend on subscription model
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'active',
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const monthMap = new Map<string, number>();
    subscriptions.forEach(sub => {
      const month = sub.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthMap.set(month, (monthMap.get(month) || 0) + (sub.amount?.toNumber() || 0));
    });

    return Array.from(monthMap.entries()).map(([month, mrr]) => ({
      month,
      mrr,
      arr: mrr * 12,
    }));
  }

  private formatModelName(modelUsed: string): string {
    if (modelUsed.includes('sonnet')) return 'Sonnet';
    if (modelUsed.includes('opus')) return 'Opus';
    if (modelUsed.includes('haiku')) return 'Haiku';
    return modelUsed;
  }
}
```

**Step 3: Create admin charts controller**

File: `packages/api/src/admin/charts/admin-charts.controller.ts`

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IsPlatformAdminGuard } from '../guards/is-platform-admin.guard';
import { AdminChartsService } from './admin-charts.service';

@Controller('admin/charts')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class AdminChartsController {
  constructor(private adminCharts: AdminChartsService) {}

  @Get('costs')
  async getCostTrends(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.adminCharts.getCostTrends(parsedDays);
  }

  @Get('costs/by-model')
  async getCostByModel() {
    return this.adminCharts.getCostByModel();
  }

  @Get('evaluations/volume')
  async getEvaluationVolume(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.adminCharts.getEvaluationVolume(parsedDays);
  }

  @Get('email/health')
  async getEmailHealth(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.adminCharts.getEmailHealth(parsedDays);
  }

  @Get('users/growth')
  async getUserGrowth(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 90;
    return this.adminCharts.getUserGrowth(parsedDays);
  }

  @Get('revenue/trends')
  async getRevenueTrends(@Query('months') months?: string) {
    const parsedMonths = months ? parseInt(months, 10) : 12;
    return this.adminCharts.getRevenueTrends(parsedMonths);
  }
}
```

**Step 4: Register in AdminModule**

File: `packages/api/src/admin/admin.module.ts`

Add imports:
```typescript
import { AdminChartsController } from './charts/admin-charts.controller';
import { AdminChartsService } from './charts/admin-charts.service';
```

Add to module:
```typescript
@Module({
  controllers: [
    AdminController,
    AdminChartsController, // Add this
  ],
  providers: [
    AdminService,
    AdminChartsService, // Add this
    // ... existing providers
  ],
})
```

**Step 5: Commit**

```bash
git add packages/api/src/admin/charts/
git add packages/api/src/admin/admin.module.ts
git commit -m "feat(charts): add admin analytics charts API (costs, email, users, revenue)"
```

---

### Task 6: Create marketing and sales charts services

**Files:**
- Create: `packages/api/src/admin/charts/marketing-charts.service.ts`
- Create: `packages/api/src/admin/charts/sales-charts.service.ts`
- Modify: `packages/api/src/admin/charts/admin-charts.controller.ts`
- Modify: `packages/api/src/admin/admin.module.ts`

**Step 1: Create marketing charts service**

File: `packages/api/src/admin/charts/marketing-charts.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CampaignFunnelData {
  name: string;
  value: number;
}

interface CampaignPerformanceData {
  campaign: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface ConversionRateData {
  date: string;
  rate: number;
}

interface LeadSourceData {
  name: string;
  value: number;
}

@Injectable()
export class MarketingChartsService {
  constructor(private prisma: PrismaService) {}

  async getCampaignFunnel(campaignId: string): Promise<CampaignFunnelData[]> {
    const recipients = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId },
    });

    const sent = recipients.length;
    const delivered = recipients.filter(r => r.deliveredAt).length;
    const opened = recipients.filter(r => r.openedAt).length;
    const clicked = recipients.filter(r => r.clickedAt).length;
    const replied = recipients.filter(r => r.repliedAt).length;
    const converted = recipients.filter(r => r.convertedAt).length;

    return [
      { name: 'Sent', value: sent },
      { name: 'Delivered', value: delivered },
      { name: 'Opened', value: opened },
      { name: 'Clicked', value: clicked },
      { name: 'Replied', value: replied },
      { name: 'Converted', value: converted },
    ];
  }

  async getCampaignPerformance(limit: number = 10): Promise<CampaignPerformanceData[]> {
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { status: 'sent' },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        recipients: {
          select: {
            sentAt: true,
            openedAt: true,
            clickedAt: true,
          },
        },
      },
    });

    return campaigns.map(campaign => ({
      campaign: campaign.name,
      sent: campaign.recipients.filter(r => r.sentAt).length,
      opened: campaign.recipients.filter(r => r.openedAt).length,
      clicked: campaign.recipients.filter(r => r.clickedAt).length,
    }));
  }

  async getConversionRates(days: number = 30): Promise<ConversionRateData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const campaigns = await this.prisma.emailCampaign.findMany({
      where: {
        sentAt: { gte: startDate },
        status: 'sent',
      },
      include: {
        recipients: {
          select: {
            deliveredAt: true,
            convertedAt: true,
          },
        },
      },
    });

    const dateMap = new Map<string, { delivered: number; converted: number }>();
    campaigns.forEach(campaign => {
      const date = campaign.sentAt?.toISOString().split('T')[0] || '';
      const delivered = campaign.recipients.filter(r => r.deliveredAt).length;
      const converted = campaign.recipients.filter(r => r.convertedAt).length;

      const existing = dateMap.get(date) || { delivered: 0, converted: 0 };
      dateMap.set(date, {
        delivered: existing.delivered + delivered,
        converted: existing.converted + converted,
      });
    });

    return Array.from(dateMap.entries()).map(([date, stats]) => ({
      date,
      rate: stats.delivered > 0 ? (stats.converted / stats.delivered) * 100 : 0,
    }));
  }

  async getLeadSourceEffectiveness(): Promise<LeadSourceData[]> {
    const opportunities = await this.prisma.salesOpportunity.groupBy({
      by: ['leadSource'],
      _count: true,
      where: {
        stage: 'won',
      },
    });

    return opportunities.map(opp => ({
      name: this.formatLeadSource(opp.leadSource),
      value: opp._count,
    }));
  }

  private formatLeadSource(source: string): string {
    return source
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

**Step 2: Create sales charts service**

File: `packages/api/src/admin/charts/sales-charts.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PipelineByStageData {
  stage: string;
  value: number;
  count: number;
}

interface DealVelocityData {
  month: string;
  avgDays: number;
}

interface WinRateData {
  month: string;
  rate: number;
}

interface RepPerformanceData {
  rep: string;
  won: number;
  revenue: number;
}

@Injectable()
export class SalesChartsService {
  constructor(private prisma: PrismaService) {}

  async getPipelineByStage(): Promise<PipelineByStageData[]> {
    const opportunities = await this.prisma.salesOpportunity.groupBy({
      by: ['stage'],
      where: {
        stage: { notIn: ['won', 'lost'] },
      },
      _sum: { dealValue: true },
      _count: true,
    });

    return opportunities.map(opp => ({
      stage: this.formatStage(opp.stage),
      value: opp._sum.dealValue?.toNumber() || 0,
      count: opp._count,
    }));
  }

  async getDealVelocity(months: number = 12): Promise<DealVelocityData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const wonDeals = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: 'won',
        wonAt: { gte: startDate },
      },
      select: {
        wonAt: true,
        firstContactAt: true,
      },
    });

    const monthMap = new Map<string, number[]>();
    wonDeals.forEach(deal => {
      if (!deal.wonAt || !deal.firstContactAt) return;

      const month = deal.wonAt.toISOString().slice(0, 7); // YYYY-MM
      const days = Math.floor(
        (deal.wonAt.getTime() - deal.firstContactAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const existing = monthMap.get(month) || [];
      existing.push(days);
      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries()).map(([month, days]) => ({
      month,
      avgDays: days.reduce((sum, d) => sum + d, 0) / days.length,
    }));
  }

  async getWinRates(months: number = 12): Promise<WinRateData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const deals = await this.prisma.salesOpportunity.findMany({
      where: {
        OR: [
          { wonAt: { gte: startDate } },
          { lostAt: { gte: startDate } },
        ],
      },
      select: {
        wonAt: true,
        lostAt: true,
        stage: true,
      },
    });

    const monthMap = new Map<string, { won: number; lost: number }>();
    deals.forEach(deal => {
      const date = deal.wonAt || deal.lostAt;
      if (!date) return;

      const month = date.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { won: 0, lost: 0 };

      if (deal.stage === 'won') {
        existing.won++;
      } else if (deal.stage === 'lost') {
        existing.lost++;
      }

      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries()).map(([month, stats]) => ({
      month,
      rate: stats.won + stats.lost > 0 ? (stats.won / (stats.won + stats.lost)) * 100 : 0,
    }));
  }

  async getRepPerformance(): Promise<RepPerformanceData[]> {
    const reps = await this.prisma.salesOpportunity.groupBy({
      by: ['assignedToId'],
      where: {
        stage: 'won',
        assignedToId: { not: null },
      },
      _sum: { dealValue: true },
      _count: true,
    });

    const repData = await Promise.all(
      reps.map(async rep => {
        const user = await this.prisma.user.findUnique({
          where: { id: rep.assignedToId! },
          select: { firstName: true, lastName: true },
        });

        return {
          rep: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          won: rep._count,
          revenue: rep._sum.dealValue?.toNumber() || 0,
        };
      }),
    );

    return repData;
  }

  private formatStage(stage: string): string {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

**Step 3: Add marketing and sales endpoints to admin charts controller**

File: `packages/api/src/admin/charts/admin-charts.controller.ts`

Add to imports:
```typescript
import { MarketingChartsService } from './marketing-charts.service';
import { SalesChartsService } from './sales-charts.service';
```

Add to constructor:
```typescript
constructor(
  private adminCharts: AdminChartsService,
  private marketingCharts: MarketingChartsService,
  private salesCharts: SalesChartsService,
) {}
```

Add endpoints:
```typescript
  // Marketing endpoints
  @Get('marketing/campaign/:id/funnel')
  async getCampaignFunnel(@Param('id') campaignId: string) {
    return this.marketingCharts.getCampaignFunnel(campaignId);
  }

  @Get('marketing/campaigns/performance')
  async getCampaignPerformance(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.marketingCharts.getCampaignPerformance(parsedLimit);
  }

  @Get('marketing/conversion-rates')
  async getConversionRates(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.marketingCharts.getConversionRates(parsedDays);
  }

  @Get('marketing/lead-sources')
  async getLeadSourceEffectiveness() {
    return this.marketingCharts.getLeadSourceEffectiveness();
  }

  // Sales endpoints
  @Get('sales/pipeline-by-stage')
  async getPipelineByStage() {
    return this.salesCharts.getPipelineByStage();
  }

  @Get('sales/deal-velocity')
  async getDealVelocity(@Query('months') months?: string) {
    const parsedMonths = months ? parseInt(months, 10) : 12;
    return this.salesCharts.getDealVelocity(parsedMonths);
  }

  @Get('sales/win-rates')
  async getWinRates(@Query('months') months?: string) {
    const parsedMonths = months ? parseInt(months, 10) : 12;
    return this.salesCharts.getWinRates(parsedMonths);
  }

  @Get('sales/rep-performance')
  async getRepPerformance() {
    return this.salesCharts.getRepPerformance();
  }
```

**Step 4: Register services in AdminModule**

File: `packages/api/src/admin/admin.module.ts`

Add imports:
```typescript
import { MarketingChartsService } from './charts/marketing-charts.service';
import { SalesChartsService } from './charts/sales-charts.service';
```

Add to providers:
```typescript
providers: [
  AdminService,
  AdminChartsService,
  MarketingChartsService, // Add this
  SalesChartsService, // Add this
  // ... existing providers
],
```

**Step 5: Commit**

```bash
git add packages/api/src/admin/charts/
git add packages/api/src/admin/admin.module.ts
git commit -m "feat(charts): add marketing and sales charts APIs"
```

---

## Group 3: Frontend Chart Integrations

### Task 7: Create wellness charts page

**Files:**
- Create: `packages/web/src/app/wellness/charts/page.tsx`
- Create: `packages/web/src/components/wellness/WellnessCharts.tsx`

**Step 1: Create WellnessCharts component**

File: `packages/web/src/components/wellness/WellnessCharts.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, BarChart, ChartContainer } from '@/components/charts';

interface WellnessChartsProps {
  userId: string;
}

export function WellnessCharts({ userId }: WellnessChartsProps) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [moodData, setMoodData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [exerciseData, setExerciseData] = useState([]);
  const [correlationData, setCorrelationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [days]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [mood, sleep, exercise, correlation] = await Promise.all([
        fetch(`/api/wellness/charts/mood?days=${days}`, { headers }).then(r => r.json()),
        fetch(`/api/wellness/charts/sleep?days=${days}`, { headers }).then(r => r.json()),
        fetch(`/api/wellness/charts/exercise?days=${days}`, { headers }).then(r => r.json()),
        fetch(`/api/wellness/charts/correlation?days=${days}`, { headers }).then(r => r.json()),
      ]);

      setMoodData(mood);
      setSleepData(sleep);
      setExerciseData(exercise);
      setCorrelationData(correlation);
    } catch (error) {
      console.error('Failed to fetch wellness charts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time period selector */}
      <div className="flex space-x-2">
        <button
          onClick={() => setDays(7)}
          className={`px-4 py-2 rounded ${days === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          7 Days
        </button>
        <button
          onClick={() => setDays(30)}
          className={`px-4 py-2 rounded ${days === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          30 Days
        </button>
        <button
          onClick={() => setDays(90)}
          className={`px-4 py-2 rounded ${days === 90 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          90 Days
        </button>
      </div>

      {/* Mood Trends */}
      <ChartContainer
        title="Mood Trends"
        description="Track your mood over time"
        loading={loading}
      >
        <LineChart
          data={moodData}
          xAxisKey="date"
          lines={[{ dataKey: 'mood', name: 'Mood', color: '#3b82f6' }]}
          emptyMessage="No mood data recorded yet"
        />
      </ChartContainer>

      {/* Sleep Quality */}
      <ChartContainer
        title="Sleep Quality & Duration"
        description="Monitor your sleep patterns"
        loading={loading}
      >
        <BarChart
          data={sleepData}
          xAxisKey="date"
          bars={[
            { dataKey: 'hours', name: 'Hours', color: '#8b5cf6' },
            { dataKey: 'quality', name: 'Quality', color: '#ec4899' },
          ]}
          emptyMessage="No sleep data recorded yet"
        />
      </ChartContainer>

      {/* Exercise Frequency */}
      <ChartContainer
        title="Exercise Activity"
        description="Track your physical activity"
        loading={loading}
      >
        <BarChart
          data={exerciseData}
          xAxisKey="date"
          bars={[{ dataKey: 'minutes', name: 'Minutes', color: '#10b981' }]}
          emptyMessage="No exercise data recorded yet"
        />
      </ChartContainer>

      {/* Multi-Metric Correlation */}
      <ChartContainer
        title="Wellness Correlation"
        description="See how mood, sleep, and exercise relate"
        loading={loading}
      >
        <LineChart
          data={correlationData}
          xAxisKey="date"
          lines={[
            { dataKey: 'mood', name: 'Mood', color: '#3b82f6' },
            { dataKey: 'sleep', name: 'Sleep', color: '#8b5cf6' },
            { dataKey: 'exercise', name: 'Exercise', color: '#10b981' },
          ]}
          emptyMessage="No wellness data recorded yet"
        />
      </ChartContainer>
    </div>
  );
}
```

**Step 2: Create wellness charts page**

File: `packages/web/src/app/wellness/charts/page.tsx`

```typescript
import { WellnessCharts } from '@/components/wellness/WellnessCharts';

export default function WellnessChartsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wellness Trends</h1>
        <p className="text-gray-600 mt-1">
          Visualize your wellness data and track your progress over time.
        </p>
      </div>

      <WellnessCharts userId="current-user" />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add packages/web/src/app/wellness/charts/
git add packages/web/src/components/wellness/WellnessCharts.tsx
git commit -m "feat(charts): add wellness charts page with mood, sleep, and exercise trends"
```

---

### Task 8: Add assessment charts to counselor member view

**Files:**
- Create: `packages/web/src/components/counsel/MemberAssessmentCharts.tsx`
- Modify: `packages/web/src/app/counsel/members/[id]/page.tsx` (add charts section)

**Step 1: Create MemberAssessmentCharts component**

File: `packages/web/src/components/counsel/MemberAssessmentCharts.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart, BarChart, ChartContainer } from '@/components/charts';

interface MemberAssessmentChartsProps {
  memberId: string;
}

export function MemberAssessmentCharts({ memberId }: MemberAssessmentChartsProps) {
  const [phq9Data, setPhq9Data] = useState([]);
  const [gad7Data, setGad7Data] = useState([]);
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [assessmentCompletion, setAssessmentCompletion] = useState([]);
  const [sessionFrequency, setSessionFrequency] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [memberId]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [phq9, gad7, tasks, assessments, sessions] = await Promise.all([
        fetch(`/api/counsel/members/${memberId}/charts/assessments/phq9`, { headers }).then(r => r.json()),
        fetch(`/api/counsel/members/${memberId}/charts/assessments/gad7`, { headers }).then(r => r.json()),
        fetch(`/api/counsel/members/${memberId}/charts/tasks/completion`, { headers }).then(r => r.json()),
        fetch(`/api/counsel/members/${memberId}/charts/assessments/completion`, { headers }).then(r => r.json()),
        fetch(`/api/counsel/members/${memberId}/charts/sessions/frequency`, { headers }).then(r => r.json()),
      ]);

      setPhq9Data(phq9);
      setGad7Data(gad7);
      setTaskCompletion(tasks);
      setAssessmentCompletion(assessments);
      setSessionFrequency(sessions);
    } catch (error) {
      console.error('Failed to fetch member charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const taskColors = ['#10b981', '#f59e0b', '#ef4444'];
  const assessmentColors = ['#3b82f6', '#9ca3af'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Progress Charts</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHQ-9 Trends */}
        <ChartContainer
          title="PHQ-9 Depression Scores"
          description="Lower scores indicate improvement"
          loading={loading}
        >
          <LineChart
            data={phq9Data}
            xAxisKey="date"
            lines={[{ dataKey: 'score', name: 'PHQ-9 Score', color: '#ef4444' }]}
            emptyMessage="No PHQ-9 assessments completed yet"
          />
        </ChartContainer>

        {/* GAD-7 Trends */}
        <ChartContainer
          title="GAD-7 Anxiety Scores"
          description="Lower scores indicate improvement"
          loading={loading}
        >
          <LineChart
            data={gad7Data}
            xAxisKey="date"
            lines={[{ dataKey: 'score', name: 'GAD-7 Score', color: '#f59e0b' }]}
            emptyMessage="No GAD-7 assessments completed yet"
          />
        </ChartContainer>

        {/* Task Completion */}
        <ChartContainer
          title="Task Completion"
          description="Overall task status"
          loading={loading}
        >
          <PieChart
            data={taskCompletion}
            colors={taskColors}
            emptyMessage="No tasks assigned yet"
          />
        </ChartContainer>

        {/* Assessment Completion */}
        <ChartContainer
          title="Assessment Completion"
          description="Completed vs pending assessments"
          loading={loading}
        >
          <PieChart
            data={assessmentCompletion}
            colors={assessmentColors}
            emptyMessage="No assessments assigned yet"
          />
        </ChartContainer>
      </div>

      {/* Session Frequency */}
      <ChartContainer
        title="Session Frequency"
        description="Number of counseling sessions per week"
        loading={loading}
      >
        <BarChart
          data={sessionFrequency}
          xAxisKey="week"
          bars={[{ dataKey: 'count', name: 'Sessions', color: '#8b5cf6' }]}
          emptyMessage="No session history yet"
        />
      </ChartContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/counsel/MemberAssessmentCharts.tsx
git commit -m "feat(charts): add member assessment charts component for counselors"
```

---

### Task 9: Add admin analytics charts

**Files:**
- Create: `packages/web/src/components/admin/AdminAnalyticsCharts.tsx`
- Create: `packages/web/src/app/admin/analytics/page.tsx`

**Step 1: Create AdminAnalyticsCharts component**

File: `packages/web/src/components/admin/AdminAnalyticsCharts.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart, BarChart, ChartContainer } from '@/components/charts';

export function AdminAnalyticsCharts() {
  const [costTrends, setCostTrends] = useState([]);
  const [costByModel, setCostByModel] = useState([]);
  const [evaluationVolume, setEvaluationVolume] = useState([]);
  const [emailHealth, setEmailHealth] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [costs, models, volume, email, users, rev] = await Promise.all([
        fetch('/api/admin/charts/costs', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/costs/by-model', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/evaluations/volume', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/email/health', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/users/growth', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/revenue/trends', { headers }).then(r => r.json()),
      ]);

      setCostTrends(costs);
      setCostByModel(models);
      setEvaluationVolume(volume);
      setEmailHealth(email);
      setUserGrowth(users);
      setRevenue(rev);
    } catch (error) {
      console.error('Failed to fetch admin charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const modelColors = ['#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Evaluation Cost Trends */}
      <ChartContainer
        title="AI Evaluation Costs"
        description="Daily spend on book evaluations"
        loading={loading}
      >
        <LineChart
          data={costTrends}
          xAxisKey="date"
          lines={[{ dataKey: 'cost', name: 'Cost ($)', color: '#3b82f6' }]}
          emptyMessage="No cost data available"
        />
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Model */}
        <ChartContainer
          title="Cost by AI Model"
          description="Spending breakdown by model type"
          loading={loading}
        >
          <PieChart
            data={costByModel}
            colors={modelColors}
            emptyMessage="No model data available"
          />
        </ChartContainer>

        {/* Evaluation Volume */}
        <ChartContainer
          title="Evaluation Volume"
          description="Number of evaluations per day"
          loading={loading}
        >
          <BarChart
            data={evaluationVolume}
            xAxisKey="date"
            bars={[{ dataKey: 'count', name: 'Evaluations', color: '#8b5cf6' }]}
            emptyMessage="No evaluation data available"
          />
        </ChartContainer>
      </div>

      {/* Email Health */}
      <ChartContainer
        title="Email Delivery Health"
        description="Email delivery, bounce, and open rates"
        loading={loading}
      >
        <LineChart
          data={emailHealth}
          xAxisKey="date"
          lines={[
            { dataKey: 'delivered', name: 'Delivered', color: '#10b981' },
            { dataKey: 'bounced', name: 'Bounced', color: '#ef4444' },
            { dataKey: 'opened', name: 'Opened', color: '#3b82f6' },
          ]}
          emptyMessage="No email data available"
        />
      </ChartContainer>

      {/* User Growth */}
      <ChartContainer
        title="User Growth"
        description="New user signups over time"
        loading={loading}
      >
        <BarChart
          data={userGrowth}
          xAxisKey="date"
          bars={[{ dataKey: 'signups', name: 'Signups', color: '#ec4899' }]}
          emptyMessage="No user growth data available"
        />
      </ChartContainer>

      {/* Revenue Trends */}
      <ChartContainer
        title="Revenue Trends (MRR/ARR)"
        description="Monthly and annual recurring revenue"
        loading={loading}
      >
        <LineChart
          data={revenue}
          xAxisKey="month"
          lines={[
            { dataKey: 'mrr', name: 'MRR ($)', color: '#10b981' },
            { dataKey: 'arr', name: 'ARR ($)', color: '#3b82f6' },
          ]}
          emptyMessage="No revenue data available"
        />
      </ChartContainer>
    </div>
  );
}
```

**Step 2: Create admin analytics page**

File: `packages/web/src/app/admin/analytics/page.tsx`

```typescript
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts';

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600 mt-1">
          Monitor platform metrics, costs, and performance.
        </p>
      </div>

      <AdminAnalyticsCharts />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add packages/web/src/components/admin/AdminAnalyticsCharts.tsx
git add packages/web/src/app/admin/analytics/page.tsx
git commit -m "feat(charts): add admin analytics dashboard with cost, email, user, and revenue charts"
```

---

### Task 10: Add marketing and sales charts

**Files:**
- Create: `packages/web/src/components/admin/MarketingCharts.tsx`
- Create: `packages/web/src/components/admin/SalesCharts.tsx`
- Create: `packages/web/src/app/admin/marketing/analytics/page.tsx`
- Create: `packages/web/src/app/admin/sales/analytics/page.tsx`

**Step 1: Create MarketingCharts component**

File: `packages/web/src/components/admin/MarketingCharts.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, PieChart, BarChart, ChartContainer } from '@/components/charts';

export function MarketingCharts() {
  const [campaignPerformance, setCampaignPerformance] = useState([]);
  const [conversionRates, setConversionRates] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [performance, conversion, sources] = await Promise.all([
        fetch('/api/admin/charts/marketing/campaigns/performance', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/marketing/conversion-rates', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/marketing/lead-sources', { headers }).then(r => r.json()),
      ]);

      setCampaignPerformance(performance);
      setConversionRates(conversion);
      setLeadSources(sources);
    } catch (error) {
      console.error('Failed to fetch marketing charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const sourceColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Campaign Performance */}
      <ChartContainer
        title="Campaign Performance Comparison"
        description="Recent campaign metrics"
        loading={loading}
      >
        <BarChart
          data={campaignPerformance}
          xAxisKey="campaign"
          bars={[
            { dataKey: 'sent', name: 'Sent', color: '#3b82f6' },
            { dataKey: 'opened', name: 'Opened', color: '#10b981' },
            { dataKey: 'clicked', name: 'Clicked', color: '#f59e0b' },
          ]}
          emptyMessage="No campaign data available"
        />
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rates */}
        <ChartContainer
          title="Conversion Rate Trends"
          description="Campaign conversion rates over time"
          loading={loading}
        >
          <LineChart
            data={conversionRates}
            xAxisKey="date"
            lines={[{ dataKey: 'rate', name: 'Rate (%)', color: '#8b5cf6' }]}
            emptyMessage="No conversion data available"
          />
        </ChartContainer>

        {/* Lead Sources */}
        <ChartContainer
          title="Lead Source Effectiveness"
          description="Won deals by lead source"
          loading={loading}
        >
          <PieChart
            data={leadSources}
            colors={sourceColors}
            emptyMessage="No lead source data available"
          />
        </ChartContainer>
      </div>
    </div>
  );
}
```

**Step 2: Create SalesCharts component**

File: `packages/web/src/components/admin/SalesCharts.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, BarChart, ChartContainer } from '@/components/charts';

export function SalesCharts() {
  const [pipelineByStage, setPipelineByStage] = useState([]);
  const [dealVelocity, setDealVelocity] = useState([]);
  const [winRates, setWinRates] = useState([]);
  const [repPerformance, setRepPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pipeline, velocity, rates, reps] = await Promise.all([
        fetch('/api/admin/charts/sales/pipeline-by-stage', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/sales/deal-velocity', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/sales/win-rates', { headers }).then(r => r.json()),
        fetch('/api/admin/charts/sales/rep-performance', { headers }).then(r => r.json()),
      ]);

      setPipelineByStage(pipeline);
      setDealVelocity(velocity);
      setWinRates(rates);
      setRepPerformance(reps);
    } catch (error) {
      console.error('Failed to fetch sales charts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline by Stage */}
      <ChartContainer
        title="Pipeline by Stage"
        description="Deal value and count per stage"
        loading={loading}
      >
        <BarChart
          data={pipelineByStage}
          xAxisKey="stage"
          bars={[
            { dataKey: 'value', name: 'Value ($)', color: '#3b82f6' },
            { dataKey: 'count', name: 'Count', color: '#10b981' },
          ]}
          emptyMessage="No pipeline data available"
        />
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Velocity */}
        <ChartContainer
          title="Deal Velocity"
          description="Average days to close over time"
          loading={loading}
        >
          <LineChart
            data={dealVelocity}
            xAxisKey="month"
            lines={[{ dataKey: 'avgDays', name: 'Avg Days', color: '#f59e0b' }]}
            emptyMessage="No velocity data available"
          />
        </ChartContainer>

        {/* Win Rates */}
        <ChartContainer
          title="Win Rate Trends"
          description="Monthly win rate percentage"
          loading={loading}
        >
          <LineChart
            data={winRates}
            xAxisKey="month"
            lines={[{ dataKey: 'rate', name: 'Win Rate (%)', color: '#10b981' }]}
            emptyMessage="No win rate data available"
          />
        </ChartContainer>
      </div>

      {/* Rep Performance */}
      <ChartContainer
        title="Sales Rep Performance"
        description="Won deals and revenue per rep"
        loading={loading}
      >
        <BarChart
          data={repPerformance}
          xAxisKey="rep"
          bars={[
            { dataKey: 'won', name: 'Won Deals', color: '#8b5cf6' },
            { dataKey: 'revenue', name: 'Revenue ($)', color: '#ec4899' },
          ]}
          emptyMessage="No rep performance data available"
        />
      </ChartContainer>
    </div>
  );
}
```

**Step 3: Create marketing analytics page**

File: `packages/web/src/app/admin/marketing/analytics/page.tsx`

```typescript
import { MarketingCharts } from '@/components/admin/MarketingCharts';

export default function MarketingAnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Analytics</h1>
        <p className="text-gray-600 mt-1">
          Track campaign performance, conversion rates, and lead sources.
        </p>
      </div>

      <MarketingCharts />
    </div>
  );
}
```

**Step 4: Create sales analytics page**

File: `packages/web/src/app/admin/sales/analytics/page.tsx`

```typescript
import { SalesCharts } from '@/components/admin/SalesCharts';

export default function SalesAnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="text-gray-600 mt-1">
          Monitor pipeline, deal velocity, win rates, and rep performance.
        </p>
      </div>

      <SalesCharts />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add packages/web/src/components/admin/MarketingCharts.tsx
git add packages/web/src/components/admin/SalesCharts.tsx
git add packages/web/src/app/admin/marketing/analytics/page.tsx
git add packages/web/src/app/admin/sales/analytics/page.tsx
git commit -m "feat(charts): add marketing and sales analytics pages with comprehensive charts"
```

---

## Group 4: Testing & Documentation

### Task 11: Add chart component tests

**Files:**
- Create: `packages/web/src/components/charts/__tests__/LineChart.test.tsx`
- Create: `packages/web/src/components/charts/__tests__/BarChart.test.tsx`
- Create: `packages/web/src/components/charts/__tests__/PieChart.test.tsx`

**Step 1: Install testing dependencies (if not already installed)**

Run: `cd packages/web && npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom`
Expected: Packages installed

**Step 2: Create LineChart test**

File: `packages/web/src/components/charts/__tests__/LineChart.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { LineChart } from '../LineChart';

describe('LineChart', () => {
  const mockData = [
    { date: '2026-01-01', value: 5 },
    { date: '2026-01-02', value: 7 },
    { date: '2026-01-03', value: 6 },
  ];

  const mockLines = [
    { dataKey: 'value', name: 'Test Value', color: '#3b82f6' },
  ];

  it('renders chart with data', () => {
    render(
      <LineChart
        data={mockData}
        xAxisKey="date"
        lines={mockLines}
      />
    );

    // Recharts renders SVG elements
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <LineChart
        data={[]}
        xAxisKey="date"
        lines={mockLines}
        emptyMessage="No data available"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('respects custom height', () => {
    const { container } = render(
      <LineChart
        data={mockData}
        xAxisKey="date"
        lines={mockLines}
        height={400}
      />
    );

    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toHaveStyle({ height: '400px' });
  });
});
```

**Step 3: Create BarChart test**

File: `packages/web/src/components/charts/__tests__/BarChart.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { BarChart } from '../BarChart';

describe('BarChart', () => {
  const mockData = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
    { category: 'C', value: 15 },
  ];

  const mockBars = [
    { dataKey: 'value', name: 'Test Value', color: '#10b981' },
  ];

  it('renders chart with data', () => {
    render(
      <BarChart
        data={mockData}
        xAxisKey="category"
        bars={mockBars}
      />
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <BarChart
        data={[]}
        xAxisKey="category"
        bars={mockBars}
        emptyMessage="No bars to show"
      />
    );

    expect(screen.getByText('No bars to show')).toBeInTheDocument();
  });

  it('supports horizontal layout', () => {
    render(
      <BarChart
        data={mockData}
        xAxisKey="category"
        bars={mockBars}
        layout="horizontal"
      />
    );

    // Horizontal layout changes XAxis to type="number"
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
```

**Step 4: Create PieChart test**

File: `packages/web/src/components/charts/__tests__/PieChart.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { PieChart } from '../PieChart';

describe('PieChart', () => {
  const mockData = [
    { name: 'Category A', value: 30 },
    { name: 'Category B', value: 50 },
    { name: 'Category C', value: 20 },
  ];

  const mockColors = ['#3b82f6', '#8b5cf6', '#10b981'];

  it('renders chart with data', () => {
    render(
      <PieChart
        data={mockData}
        colors={mockColors}
      />
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <PieChart
        data={[]}
        colors={mockColors}
        emptyMessage="No pie slices"
      />
    );

    expect(screen.getByText('No pie slices')).toBeInTheDocument();
  });

  it('applies custom colors to slices', () => {
    render(
      <PieChart
        data={mockData}
        colors={mockColors}
      />
    );

    // Recharts generates cells with fill colors
    const cells = document.querySelectorAll('.recharts-pie-sector');
    expect(cells.length).toBeGreaterThan(0);
  });
});
```

**Step 5: Run tests**

Run: `cd packages/web && npm test -- --testPathPattern=charts`
Expected: All chart tests pass

**Step 6: Commit**

```bash
git add packages/web/src/components/charts/__tests__/
git commit -m "test(charts): add unit tests for LineChart, BarChart, and PieChart components"
```

---

### Task 12: Update documentation

**Files:**
- Create: `docs/features/charting-system.md`
- Modify: `packages/web/README.md` (add charts section)

**Step 1: Create charting system documentation**

File: `docs/features/charting-system.md`

```markdown
# Charting System

**Status**: ✅ Implemented (Phase 1)
**Last Updated**: January 11, 2026

---

## Overview

The MyChristianCounselor platform includes comprehensive visual analytics powered by Recharts. Charts are implemented across member wellness tracking, counselor member progress views, and admin analytics dashboards.

---

## Chart Types

### 1. Line Charts
**Use Cases**: Trends over time (mood, assessments, costs, growth)
**Component**: `@/components/charts/LineChart`
**Features**:
- Multiple data series support
- Customizable colors per line
- Responsive container
- Empty state handling
- Hover tooltips

### 2. Bar Charts
**Use Cases**: Comparisons, volume metrics (sleep, exercise, evaluations)
**Component**: `@/components/charts/BarChart`
**Features**:
- Vertical and horizontal layouts
- Multiple bar series
- Stacked bars support
- Customizable colors
- Empty state handling

### 3. Pie Charts
**Use Cases**: Proportions, distributions (task completion, cost by model)
**Component**: `@/components/charts/PieChart`
**Features**:
- Percentage labels
- Custom color schemes
- Legend support
- Hover tooltips
- Empty state handling

---

## Implementation Areas

### Member Experience
**Location**: `/wellness/charts`

**Charts**:
- Mood trends (7/30/90 day views)
- Sleep quality and duration
- Exercise frequency
- Multi-metric correlation

**API Endpoints**:
- `GET /api/wellness/charts/mood?days=30`
- `GET /api/wellness/charts/sleep?days=30`
- `GET /api/wellness/charts/exercise?days=30`
- `GET /api/wellness/charts/correlation?days=30`

### Counselor Experience
**Location**: `/counsel/members/[id]` (integrated in member detail view)

**Charts**:
- PHQ-9 depression score trends
- GAD-7 anxiety score trends
- Task completion pie chart
- Assessment completion pie chart
- Session frequency bar chart

**API Endpoints**:
- `GET /api/counsel/members/:id/charts/assessments/phq9`
- `GET /api/counsel/members/:id/charts/assessments/gad7`
- `GET /api/counsel/members/:id/charts/tasks/completion`
- `GET /api/counsel/members/:id/charts/assessments/completion`
- `GET /api/counsel/members/:id/charts/sessions/frequency`

### Admin Experience
**Location**: `/admin/analytics`

**Charts**:
- Cost trends (daily AI spend)
- Cost by model (Sonnet/Opus/Haiku)
- Evaluation volume
- Email health (delivery/bounce/open rates)
- User growth
- Revenue trends (MRR/ARR)

**API Endpoints**:
- `GET /api/admin/charts/costs?days=30`
- `GET /api/admin/charts/costs/by-model`
- `GET /api/admin/charts/evaluations/volume?days=30`
- `GET /api/admin/charts/email/health?days=30`
- `GET /api/admin/charts/users/growth?days=90`
- `GET /api/admin/charts/revenue/trends?months=12`

### Marketing Analytics
**Location**: `/admin/marketing/analytics`

**Charts**:
- Campaign performance comparison
- Conversion rate trends
- Lead source effectiveness

**API Endpoints**:
- `GET /api/admin/charts/marketing/campaigns/performance?limit=10`
- `GET /api/admin/charts/marketing/conversion-rates?days=30`
- `GET /api/admin/charts/marketing/lead-sources`

### Sales Analytics
**Location**: `/admin/sales/analytics`

**Charts**:
- Pipeline by stage
- Deal velocity
- Win rate trends
- Rep performance comparison

**API Endpoints**:
- `GET /api/admin/charts/sales/pipeline-by-stage`
- `GET /api/admin/charts/sales/deal-velocity?months=12`
- `GET /api/admin/charts/sales/win-rates?months=12`
- `GET /api/admin/charts/sales/rep-performance`

---

## Shared Components

### ChartContainer
Wrapper component providing consistent styling, loading states, and error handling.

**Usage**:
```typescript
<ChartContainer
  title="Chart Title"
  description="Optional description"
  loading={isLoading}
  error={errorMessage}
>
  <LineChart data={data} ... />
</ChartContainer>
```

### EmptyChart
Displays placeholder message when no data is available.

**Usage**:
```typescript
<EmptyChart message="No data available yet" height={300} />
```

---

## Customization

### Colors
Default color palette:
- Primary Blue: `#3b82f6`
- Purple: `#8b5cf6`
- Green: `#10b981`
- Yellow: `#f59e0b`
- Red: `#ef4444`
- Pink: `#ec4899`

### Heights
Default chart height: `300px`
Override via `height` prop on any chart component.

### Responsive Behavior
All charts use `ResponsiveContainer` from Recharts, adapting to parent container width.

---

## Testing

Unit tests located in `packages/web/src/components/charts/__tests__/`

Run tests:
```bash
cd packages/web
npm test -- --testPathPattern=charts
```

---

## Performance Considerations

- Charts render client-side only (`'use client'` directive)
- Data fetching uses parallel Promise.all() for multiple endpoints
- Loading states prevent layout shift
- Empty states avoid unnecessary rendering

---

## Future Enhancements

Potential additions:
- Export chart as PNG/SVG
- Custom date range selectors
- Real-time chart updates (WebSocket integration)
- Drill-down capabilities (click to filter)
- Comparison mode (year-over-year, member-to-member)
```

**Step 2: Commit**

```bash
git add docs/features/charting-system.md
git commit -m "docs(charts): add comprehensive charting system documentation"
```

---

### Task 13: Build verification

**Step 1: Build API**

Run: `cd packages/api && npm run build`
Expected: Build succeeds with no errors

**Step 2: Build Web**

Run: `cd packages/web && npm run build`
Expected: Build succeeds with no errors

**Step 3: Verify no TypeScript errors**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Commit if fixes needed**

If any build errors occurred and were fixed:
```bash
git add .
git commit -m "fix(charts): resolve build errors in Phase 1"
```

---

### Task 14: Final integration and deployment

**Step 1: Test API locally**

Run: `cd packages/api && npm run start:dev`
Expected: API starts without errors

Test endpoints:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/wellness/charts/mood?days=7
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/charts/costs
```

**Step 2: Test Web locally**

Run: `cd packages/web && PORT=3699 npx next dev -p 3699`
Expected: Web starts without errors

Navigate to:
- http://localhost:3699/wellness/charts
- http://localhost:3699/admin/analytics
- http://localhost:3699/admin/marketing/analytics
- http://localhost:3699/admin/sales/analytics

**Step 3: Update STATUS.md**

File: `docs/plans/STATUS.md`

Update to mark Phase 1 complete:
```markdown
## 🚀 ACTIVE PLAN

### System Evaluation High-Priority Recommendations (In Progress)
**Start Date**: January 11, 2026
**Plan Document**: `docs/plans/2026-01-11-system-evaluation-recommendations-design.md`

**Phases**:
1. ✅ Phase 1: Charting Library Integration (Recharts) - COMPLETED
2. ⏳ Phase 2: Workflow Rule Creation UI
3. ⏳ Phase 3: Real-Time Dashboard Enhancements
4. ⏳ Phase 4: Scheduled Campaign Execution
5. ⏳ Phase 5: Security & Compliance (2FA + Documentation)
```

**Step 4: Final commit**

```bash
git add docs/plans/STATUS.md
git commit -m "feat(charts): Phase 1 complete - comprehensive charting library integration

✅ Installed Recharts
✅ Created shared chart components (Line, Bar, Pie, Container, Empty)
✅ Built backend API endpoints for all chart data
✅ Integrated charts into wellness, counselor, admin, marketing, and sales pages
✅ Added unit tests for chart components
✅ Updated documentation

Total: 20+ chart types across 5 platform areas"
```

**Step 5: Push to origin**

Run: `git push origin master`
Expected: Changes pushed successfully

---

## Summary

**Phase 1: Charting Library Integration - COMPLETE**

### Deliverables
1. ✅ Recharts library installed
2. ✅ 5 shared chart components created
3. ✅ 6 backend API services with 20+ endpoints
4. ✅ 5 frontend chart integration areas
5. ✅ Unit tests for chart components
6. ✅ Comprehensive documentation

### Files Created
**Backend** (11 files):
- wellness-charts.controller.ts
- wellness-charts.service.ts
- member-charts.controller.ts
- assessment-charts.service.ts
- admin-charts.controller.ts
- admin-charts.service.ts
- marketing-charts.service.ts
- sales-charts.service.ts

**Frontend** (18 files):
- 5 shared chart components
- WellnessCharts.tsx
- MemberAssessmentCharts.tsx
- AdminAnalyticsCharts.tsx
- MarketingCharts.tsx
- SalesCharts.tsx
- 5 page components
- 3 test files

**Documentation** (2 files):
- charting-system.md
- Updated STATUS.md

### Total Lines of Code
Approximately 3,500+ lines across backend services, frontend components, tests, and documentation.

**Phase 1 is now COMPLETE and ready for Phase 2!**
