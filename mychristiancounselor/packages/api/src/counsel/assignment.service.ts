import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CounselorAssignment,
  CreateCounselorAssignmentDto,
  CounselorMemberSummary,
} from '@mychristiancounselor/shared';
import { EmailService } from '../email/email.service';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Get all members assigned to a counselor
   */
  async getCounselorMembers(counselorId: string, organizationId: string): Promise<CounselorMemberSummary[]> {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: {
        counselorId,
        organizationId,
        status: 'active',
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    // Get wellbeing status for each member (will return mock data for now)
    const summaries: CounselorMemberSummary[] = await Promise.all(
      assignments.map(async (assignment) => {
        // Get last login (most recent session)
        const lastSession = await this.prisma.session.findFirst({
          where: {
            userId: assignment.memberId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        });

        // Get last active (most recent user message)
        const lastMessage = await this.prisma.message.findFirst({
          where: {
            role: 'user',
            session: {
              userId: assignment.memberId,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          select: {
            timestamp: true,
          },
        });

        // Count total conversations
        const totalConversations = await this.prisma.session.count({
          where: {
            userId: assignment.memberId,
          },
        });

        // Count observations
        const observationCount = await this.prisma.counselorObservation.count({
          where: {
            counselorId,
            memberId: assignment.memberId,
          },
        });

        // Count pending tasks
        const pendingTasks = await this.prisma.memberTask.count({
          where: {
            memberId: assignment.memberId,
            status: 'pending',
            OR: [
              { dueDate: null },
              { dueDate: { gte: new Date() } },
            ],
          },
        });

        // Count overdue tasks
        const overdueTasks = await this.prisma.memberTask.count({
          where: {
            memberId: assignment.memberId,
            status: 'pending',
            dueDate: { lt: new Date() },
          },
        });

        // Count pending assessments
        const pendingAssessments = await this.prisma.assignedAssessment.count({
          where: {
            memberId: assignment.memberId,
            status: 'pending',
          },
        });

        // Get or create wellbeing status (mock for Phase 1)
        let wellbeingStatus = await this.prisma.memberWellbeingStatus.findUnique({
          where: {
            memberId: assignment.memberId,
          },
        });

        if (!wellbeingStatus) {
          // Create default status for testing
          wellbeingStatus = await this.prisma.memberWellbeingStatus.create({
            data: {
              memberId: assignment.memberId,
              status: 'green',
              aiSuggestedStatus: 'green',
              summary: 'Member profile created. AI analysis pending.',
              lastAnalyzedAt: new Date(),
            },
          });
        }

        return {
          member: assignment.member,
          wellbeingStatus: wellbeingStatus as any,
          lastLogin: lastSession?.createdAt,
          lastActive: lastMessage?.timestamp,
          lastConversationDate: lastSession?.createdAt, // Keep for backward compatibility
          totalConversations,
          observationCount,
          assignment: assignment as any,
          pendingTasks,
          overdueTasks,
          pendingAssessments,
        };
      })
    );

    return summaries;
  }

  /**
   * Create a new counselor-member assignment
   */
  async createAssignment(
    dto: CreateCounselorAssignmentDto,
    assignedBy: string
  ): Promise<CounselorAssignment> {
    // Check if counselor has Counselor role in the organization
    const counselorMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: dto.counselorId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!counselorMembership) {
      throw new BadRequestException('Counselor is not a member of this organization');
    }

    // Verify role has counseling permissions (check role name contains "Counselor")
    if (!counselorMembership.role.name.includes('Counselor')) {
      throw new BadRequestException('User does not have Counselor role');
    }

    // Check if member belongs to organization
    const memberMembership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId: dto.memberId,
        },
      },
    });

    if (!memberMembership) {
      throw new BadRequestException('Member is not part of this organization');
    }

    // Check for existing active assignment for this member in this organization
    const existingAssignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        memberId: dto.memberId,
        organizationId: dto.organizationId,
        status: 'active',
      },
    });

    // If exists, deactivate it
    if (existingAssignment) {
      await this.prisma.counselorAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: 'inactive',
          endedAt: new Date(),
        },
      });
    }

    // Create new assignment
    const assignment = await this.prisma.counselorAssignment.create({
      data: {
        counselorId: dto.counselorId,
        memberId: dto.memberId,
        organizationId: dto.organizationId,
        assignedBy,
        status: 'active',
      },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send email notifications (async, don't block assignment creation)
    this.sendAssignmentNotifications(assignment).catch(err => {
      this.logger.error('Failed to send counselor assignment notifications:', err);
    });

    return assignment as any;
  }

  /**
   * Send email notifications for counselor assignment
   * Sends two emails: one to member, one to counselor
   */
  private async sendAssignmentNotifications(assignment: any): Promise<void> {
    const counselorName = `${assignment.counselor.firstName || ''} ${assignment.counselor.lastName || ''}`.trim() || assignment.counselor.email;
    const memberName = `${assignment.member.firstName || ''} ${assignment.member.lastName || ''}`.trim() || assignment.member.email;
    const organizationName = assignment.organization.name;

    // 1. Send email to member
    await this.emailService.sendCounselorAssignmentEmail(
      assignment.member.email,
      {
        recipientName: assignment.member.firstName || memberName,
        counselorName,
        organizationName,
        isForMember: true,
      },
      assignment.member.id,
    );

    // 2. Send email to counselor
    await this.emailService.sendCounselorAssignmentEmail(
      assignment.counselor.email,
      {
        recipientName: assignment.counselor.firstName || counselorName,
        memberName,
        organizationName,
        isForMember: false,
      },
      assignment.counselor.id,
    );
  }

  /**
   * End a counselor assignment
   */
  async endAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.prisma.counselorAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.counselorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'inactive',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Get all assignments in an organization (for admin view)
   */
  async getOrganizationAssignments(organizationId: string): Promise<CounselorAssignment[]> {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: {
        organizationId,
      },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return assignments as any;
  }

  /**
   * Get counselor workload (caseload count) for all counselors
   */
  async getCounselorWorkloads(organizationId: string) {
    // Get all users with Counselor role
    const counselors = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        role: true,
      },
    });

    const counselorsWithRole = counselors.filter(c =>
      c.role.name.includes('Counselor')
    );

    // Count active assignments for each
    const workloads = await Promise.all(
      counselorsWithRole.map(async (counselor) => {
        const count = await this.prisma.counselorAssignment.count({
          where: {
            counselorId: counselor.userId,
            organizationId,
            status: 'active',
          },
        });

        return {
          counselor: counselor.user,
          caseloadCount: count,
        };
      })
    );

    return workloads;
  }

  /**
   * Verify counselor has active assignment to member
   */
  async verifyCounselorAssignment(
    counselorId: string,
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    return !!assignment;
  }
}
