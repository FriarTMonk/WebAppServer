import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface AssessmentTrendData {
  assessmentType: string;
  data: ChartDataPoint[];
  currentScore: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

export interface SessionActivityData {
  date: string;
  sessionCount: number;
  tasksCompleted: number;
}

export interface ProgressOverviewData {
  phq9: AssessmentTrendData;
  gad7: AssessmentTrendData;
  sessions: number;
  tasksCompleted: number;
}

/**
 * Assessment Charts Service
 *
 * Provides counselor-facing analytics for tracking member assessment progress.
 *
 * **Data Model Mapping:**
 * - Uses `AssignedAssessment` + `AssessmentResponse` models (instead of non-existent `AssessmentResult`)
 * - Uses `Session` model for session activity tracking
 * - Uses `MemberTask` model for task completion tracking
 * - Uses `CounselorAssignment` for access control verification
 *
 * **Assessment Identification:**
 * - PHQ-9 assessments are identified by assessment.id = 'phq-9' (from PHQ9_ASSESSMENT constant)
 * - GAD-7 assessments are identified by assessment.id = 'gad-7' (from GAD7_ASSESSMENT constant)
 * - Scores are retrieved from `AssessmentResponse.score` field
 * - Completion dates come from `AssignedAssessment.completedAt` field
 *
 * **Access Control:**
 * - Verifies counselor has active assignment to member via `CounselorAssignment` table
 * - Throws NotFoundException if no assignment exists
 */
@Injectable()
export class AssessmentChartsService {
  private readonly logger = new Logger(AssessmentChartsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get PHQ-9 trend data for a member
   *
   * Retrieves historical PHQ-9 assessment scores and calculates trend.
   * PHQ-9 scores range from 0-27, where lower scores indicate better outcomes.
   *
   * @param counselorId - ID of the counselor requesting data
   * @param memberId - ID of the member whose data is being requested
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Assessment trend data with scores and calculated trend
   */
  async getPhq9Trend(
    counselorId: string,
    memberId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AssessmentTrendData> {
    try {
      this.logger.log(`Fetching PHQ-9 trend for member ${memberId}`);

      // Verify counselor has access to this member
      await this.verifyCounselorAccess(counselorId, memberId);

      // Build date filter
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.completedAt = {};
        if (startDate) dateFilter.completedAt.gte = startDate;
        if (endDate) dateFilter.completedAt.lte = endDate;
      }

      // Fetch completed PHQ-9 assessments
      // Note: Assessment IDs come from PHQ9_ASSESSMENT.id = 'phq-9'
      const assignments = await this.prisma.assignedAssessment.findMany({
        where: {
          memberId,
          status: 'completed',
          ...dateFilter,
        },
        include: {
          assessment: {
            select: {
              id: true,
              name: true,
            },
          },
          responses: {
            select: {
              score: true,
            },
          },
        },
        orderBy: { completedAt: 'asc' },
      });

      // Filter for PHQ-9 assessments only
      const phq9Results = assignments.filter(
        a => a.assessment.id === 'phq-9' && a.responses?.score !== null && a.responses?.score !== undefined
      );

      // Map to chart data points
      const data = phq9Results.map(a => ({
        date: a.completedAt!.toISOString().split('T')[0],
        value: a.responses!.score!,
      }));

      const currentScore = phq9Results.length > 0
        ? phq9Results[phq9Results.length - 1].responses!.score!
        : null;

      const scores = phq9Results.map(a => a.responses!.score!);
      const trend = this.calculateTrend(scores);

      return {
        assessmentType: 'PHQ-9',
        data,
        currentScore,
        trend,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch PHQ-9 trend for member ${memberId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch PHQ-9 trend');
    }
  }

  /**
   * Get GAD-7 trend data for a member
   *
   * Retrieves historical GAD-7 assessment scores and calculates trend.
   * GAD-7 scores range from 0-21, where lower scores indicate better outcomes.
   *
   * @param counselorId - ID of the counselor requesting data
   * @param memberId - ID of the member whose data is being requested
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Assessment trend data with scores and calculated trend
   */
  async getGad7Trend(
    counselorId: string,
    memberId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AssessmentTrendData> {
    try {
      this.logger.log(`Fetching GAD-7 trend for member ${memberId}`);

      await this.verifyCounselorAccess(counselorId, memberId);

      // Build date filter
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.completedAt = {};
        if (startDate) dateFilter.completedAt.gte = startDate;
        if (endDate) dateFilter.completedAt.lte = endDate;
      }

      // Fetch completed GAD-7 assessments
      // Note: Assessment IDs come from GAD7_ASSESSMENT.id = 'gad-7'
      const assignments = await this.prisma.assignedAssessment.findMany({
        where: {
          memberId,
          status: 'completed',
          ...dateFilter,
        },
        include: {
          assessment: {
            select: {
              id: true,
              name: true,
            },
          },
          responses: {
            select: {
              score: true,
            },
          },
        },
        orderBy: { completedAt: 'asc' },
      });

      // Filter for GAD-7 assessments only
      const gad7Results = assignments.filter(
        a => a.assessment.id === 'gad-7' && a.responses?.score !== null && a.responses?.score !== undefined
      );

      // Map to chart data points
      const data = gad7Results.map(a => ({
        date: a.completedAt!.toISOString().split('T')[0],
        value: a.responses!.score!,
      }));

      const currentScore = gad7Results.length > 0
        ? gad7Results[gad7Results.length - 1].responses!.score!
        : null;

      const scores = gad7Results.map(a => a.responses!.score!);
      const trend = this.calculateTrend(scores);

      return {
        assessmentType: 'GAD-7',
        data,
        currentScore,
        trend,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch GAD-7 trend for member ${memberId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch GAD-7 trend');
    }
  }

  /**
   * Get session activity data for a member
   *
   * Retrieves daily session counts and task completion counts.
   * Groups data by date to show activity patterns over time.
   *
   * **Note:** Uses `Session` model (not `CounselingSession`) for session tracking.
   *
   * @param counselorId - ID of the counselor requesting data
   * @param memberId - ID of the member whose data is being requested
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Array of daily activity data with session and task counts
   */
  async getSessionActivity(
    counselorId: string,
    memberId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SessionActivityData[]> {
    try {
      this.logger.log(`Fetching session activity for member ${memberId}`);

      await this.verifyCounselorAccess(counselorId, memberId);

      // Build session date filter
      const sessionWhere: any = { userId: memberId };
      if (startDate || endDate) {
        sessionWhere.createdAt = {};
        if (startDate) sessionWhere.createdAt.gte = startDate;
        if (endDate) sessionWhere.createdAt.lte = endDate;
      }

      // Fetch sessions (using Session model, filtered by userId)
      const sessions = await this.prisma.session.findMany({
        where: sessionWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
        },
      });

      // Build task date filter
      const taskWhere: any = {
        memberId,
        completedAt: { not: null },
      };
      if (startDate || endDate) {
        const completedFilter: any = { not: null };
        if (startDate || endDate) {
          const andConditions = [{ completedAt: { not: null } }];
          if (startDate) andConditions.push({ completedAt: { gte: startDate } });
          if (endDate) andConditions.push({ completedAt: { lte: endDate } });
          taskWhere.AND = andConditions;
        }
      }

      // Fetch completed tasks
      const tasks = await this.prisma.memberTask.findMany({
        where: taskWhere,
        select: {
          completedAt: true,
        },
      });

      // Group by date
      const dataByDate = new Map<string, { sessionCount: number; tasksCompleted: number }>();

      sessions.forEach(s => {
        const date = s.createdAt.toISOString().split('T')[0];
        const existing = dataByDate.get(date) || { sessionCount: 0, tasksCompleted: 0 };
        existing.sessionCount++;
        dataByDate.set(date, existing);
      });

      tasks.forEach(t => {
        if (t.completedAt) {
          const date = t.completedAt.toISOString().split('T')[0];
          const existing = dataByDate.get(date) || { sessionCount: 0, tasksCompleted: 0 };
          existing.tasksCompleted++;
          dataByDate.set(date, existing);
        }
      });

      return Array.from(dataByDate.entries())
        .map(([date, data]) => ({
          date,
          sessionCount: data.sessionCount,
          tasksCompleted: data.tasksCompleted,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch session activity for member ${memberId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch session activity');
    }
  }

  /**
   * Get comprehensive progress overview for a member
   *
   * Combines PHQ-9/GAD-7 trends (last 90 days) with overall session and task statistics.
   * Provides a high-level view of member progress across all metrics.
   *
   * @param counselorId - ID of the counselor requesting data
   * @param memberId - ID of the member whose data is being requested
   * @returns Comprehensive progress data including assessment trends and activity counts
   */
  async getProgressOverview(
    counselorId: string,
    memberId: string,
  ): Promise<ProgressOverviewData> {
    try {
      this.logger.log(`Fetching progress overview for member ${memberId}`);

      await this.verifyCounselorAccess(counselorId, memberId);

      // Get assessment trends (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [phq9, gad7, sessionCount, taskCount] = await Promise.all([
        this.getPhq9Trend(counselorId, memberId, ninetyDaysAgo, new Date()),
        this.getGad7Trend(counselorId, memberId, ninetyDaysAgo, new Date()),
        this.prisma.session.count({
          where: { userId: memberId },
        }),
        this.prisma.memberTask.count({
          where: { memberId, completedAt: { not: null } },
        }),
      ]);

      return {
        phq9,
        gad7,
        sessions: sessionCount,
        tasksCompleted: taskCount,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch progress overview for member ${memberId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch progress overview');
    }
  }

  /**
   * Verify counselor has access to a member
   *
   * Checks for an active counselor assignment in the CounselorAssignment table.
   * Throws NotFoundException if no active assignment exists.
   *
   * @param counselorId - ID of the counselor
   * @param memberId - ID of the member
   * @throws NotFoundException if no active assignment found
   */
  private async verifyCounselorAccess(counselorId: string, memberId: string): Promise<void> {
    // Verify that the counselor has an active assignment to this member
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        status: 'active',
      },
    });

    if (!assignment) {
      throw new NotFoundException('Member not found or access denied');
    }
  }

  /**
   * Calculate trend from a series of scores
   *
   * Uses simple linear regression to determine if scores are improving, stable, or declining.
   * For PHQ-9 and GAD-7, lower scores are better, so negative slope = improving.
   *
   * @param scores - Array of assessment scores
   * @returns Trend classification
   */
  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
    if (scores.length < 2) {
      return 'insufficient_data';
    }

    // Simple linear regression to determine trend
    const n = scores.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // For assessment scores, lower is better (PHQ-9, GAD-7)
    // So negative slope = improving
    if (slope < -0.5) return 'improving';
    if (slope > 0.5) return 'declining';
    return 'stable';
  }
}
