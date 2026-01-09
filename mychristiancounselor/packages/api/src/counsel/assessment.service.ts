import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentStatus } from '@prisma/client';
import { AssessmentResponse } from './assessments/assessment.types';

export interface AssignAssessmentDto {
  memberId: string;
  assessmentId: string;
  assignedBy: string;
  dueDate?: Date;
  notes?: string;
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Assign an assessment to a member
   */
  async assignAssessment(dto: AssignAssessmentDto) {
    this.logger.log(
      `Assigning assessment ${dto.assessmentId} to member ${dto.memberId}`,
    );

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

  /**
   * Get assigned assessments for a member
   * @param memberId - The member's ID
   * @param status - Optional filter by status
   */
  async getAssignedAssessments(memberId: string, status?: AssessmentStatus) {
    this.logger.log(
      `Fetching assigned assessments for member ${memberId}${status ? ` with status ${status}` : ''}`,
    );

    return this.prisma.assignedAssessment.findMany({
      where: {
        memberId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit assessment responses
   * @param assignedAssessmentId - The assigned assessment ID
   * @param memberId - The member submitting the response
   * @param responses - Array of assessment responses
   */
  async submitResponse(
    assignedAssessmentId: string,
    memberId: string,
    responses: AssessmentResponse[],
  ) {
    this.logger.log(
      `Submitting responses for assigned assessment ${assignedAssessmentId}`,
    );

    // Verify assignment exists and belongs to member
    const assignment = await this.prisma.assignedAssessment.findUnique({
      where: { id: assignedAssessmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assessment assignment not found');
    }

    if (assignment.memberId !== memberId) {
      throw new NotFoundException('Assessment not assigned to this member');
    }

    // Save responses as JSON
    await this.prisma.assessmentResponse.create({
      data: {
        assignedAssessmentId,
        answers: responses,
      },
    });

    // Mark assignment as completed
    const updatedAssignment = await this.prisma.assignedAssessment.update({
      where: { id: assignedAssessmentId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Completed assigned assessment ${assignedAssessmentId} for member ${memberId}`,
    );

    return updatedAssignment;
  }

  /**
   * Get responses for an assigned assessment
   * @param assignedAssessmentId - The assigned assessment ID
   */
  async getResponses(assignedAssessmentId: string) {
    this.logger.log(
      `Fetching responses for assigned assessment ${assignedAssessmentId}`,
    );

    return this.prisma.assessmentResponse.findUnique({
      where: { assignedAssessmentId },
    });
  }

  /**
   * Get assessment history for a member by type
   * @param memberId - The member's ID
   * @param type - The assessment type (e.g., 'phq9', 'gad7')
   */
  async getAssessmentHistory(memberId: string, type: string) {
    this.logger.log(
      `Fetching assessment history for member ${memberId}, type ${type}`,
    );

    const assignments = await this.prisma.assignedAssessment.findMany({
      where: {
        memberId,
        assessmentId: type,
        status: 'completed',
      },
      include: {
        responses: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Format for frontend
    return assignments.map(assignment => ({
      id: assignment.id,
      type,
      completedAt: assignment.completedAt?.toISOString() || '',
      score: assignment.responses?.score || 0,
      severity: assignment.responses?.interpretation || 'unknown',
    }));
  }
}
