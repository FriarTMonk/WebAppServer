import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentService } from './assessment.service';

@Injectable()
export class AssessmentSchedulingService {
  private readonly logger = new Logger(AssessmentSchedulingService.name);

  constructor(
    private prisma: PrismaService,
    private assessmentService: AssessmentService,
  ) {}

  /**
   * Process scheduled assessment assignments (runs daily at 9 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processScheduledAssessments() {
    this.logger.log('Processing scheduled assessments...');

    // Get all active schedules
    const schedules = await this.prisma.assessmentSchedule.findMany({
      where: { isActive: true },
      include: { assessment: true },
    });

    for (const schedule of schedules) {
      try {
        await this.processSchedule(schedule);
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }

    this.logger.log('Scheduled assessment processing complete');
  }

  /**
   * Process a single schedule rule
   */
  private async processSchedule(schedule: any) {
    // Get target members based on schedule type
    let members: { memberId: string; counselorId: string }[] = [];

    if (schedule.targetType === 'all_assigned_members') {
      // Get all members with active counselor assignments
      const assignments = await this.prisma.counselorAssignment.findMany({
        where: { status: 'active' },
        select: { memberId: true, counselorId: true },
      });
      members = assignments.map((a) => ({
        memberId: a.memberId,
        counselorId: a.counselorId,
      }));
    } else if (schedule.targetType === 'specific_members') {
      // Target specific members (stored in schedule.targetMemberIds)
      members =
        schedule.targetMemberIds?.map((id: string) => ({
          memberId: id,
          counselorId: schedule.createdBy, // Use schedule creator as counselor
        })) || [];
    }

    // Check each member for eligibility
    for (const { memberId, counselorId } of members) {
      const eligible = await this.checkEligibility(
        memberId,
        schedule.assessmentId,
        schedule.frequencyDays,
      );

      if (eligible) {
        // Assign assessment
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // 7 days to complete

        await this.assessmentService.assignAssessment({
          memberId,
          assessmentId: schedule.assessmentId,
          assignedBy: counselorId,
          dueDate,
        });

        this.logger.log(
          `Assigned ${schedule.assessment.type} to member ${memberId} via schedule ${schedule.id}`,
        );
      }
    }
  }

  /**
   * Check if member is eligible for assessment assignment
   */
  private async checkEligibility(
    memberId: string,
    assessmentId: string,
    frequencyDays: number,
  ): Promise<boolean> {
    // Get most recent assignment of this type
    const recentAssignment = await this.prisma.assignedAssessment.findFirst({
      where: {
        memberId,
        assessmentId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!recentAssignment) {
      return true; // No previous assignment, eligible
    }

    // Check if frequency period has elapsed
    const daysSinceLastAssignment = Math.floor(
      (Date.now() - recentAssignment.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return daysSinceLastAssignment >= frequencyDays;
  }

  /**
   * Create a new assessment schedule
   */
  async createSchedule(dto: {
    name: string;
    assessmentId: string;
    targetType: string;
    frequencyDays: number;
    organizationId?: string;
    createdBy: string;
  }) {
    return this.prisma.assessmentSchedule.create({
      data: {
        name: dto.name,
        assessmentId: dto.assessmentId,
        targetType: dto.targetType,
        frequencyDays: dto.frequencyDays,
        organizationId: dto.organizationId,
        createdBy: dto.createdBy,
        isActive: true,
      },
    });
  }
}
