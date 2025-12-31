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

    // Collect all member IDs for batch queries
    const memberIds = assignments.map(a => a.memberId);
    const now = new Date();

    // Execute batch queries in parallel
    const [
      sessionsData,
      messagesData,
      observationsData,
      pendingTasksData,
      overdueTasksData,
      pendingAssessmentsData,
      wellbeingStatusesData,
      conversationCountData,
    ] = await Promise.all([
      // Get last login for all members
      this.prisma.session.groupBy({
        by: ['userId'],
        where: {
          userId: { in: memberIds },
        },
        _max: {
          createdAt: true,
        },
      }),
      // Get last active message for all members
      this.prisma.$queryRaw<Array<{ userId: string; maxTimestamp: Date }>>`
        SELECT s."userId", MAX(m.timestamp) as "maxTimestamp"
        FROM "Message" m
        INNER JOIN "Session" s ON m."sessionId" = s.id
        WHERE m.role = 'user' AND s."userId" IN (${this.prisma.join(memberIds)})
        GROUP BY s."userId"
      `,
      // Count observations for all members
      this.prisma.counselorObservation.groupBy({
        by: ['memberId'],
        where: {
          counselorId,
          memberId: { in: memberIds },
        },
        _count: {
          id: true,
        },
      }),
      // Count pending tasks (not overdue) for all members
      this.prisma.memberTask.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          status: 'pending',
          OR: [
            { dueDate: null },
            { dueDate: { gte: now } },
          ],
        },
        _count: {
          id: true,
        },
      }),
      // Count overdue tasks for all members
      this.prisma.memberTask.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          status: 'pending',
          dueDate: { lt: now },
        },
        _count: {
          id: true,
        },
      }),
      // Count pending assessments for all members
      this.prisma.assignedAssessment.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          status: 'pending',
        },
        _count: {
          id: true,
        },
      }),
      // Get wellbeing statuses for all members
      this.prisma.memberWellbeingStatus.findMany({
        where: {
          memberId: { in: memberIds },
        },
      }),
      // Count total conversations for all members
      this.prisma.session.groupBy({
        by: ['userId'],
        where: {
          userId: { in: memberIds },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Build lookup maps for fast access
    const sessionMap = new Map(sessionsData.map(s => [s.userId, s._max.createdAt]));
    const messageMap = new Map(messagesData.map(m => [m.userId, m.maxTimestamp]));
    const observationMap = new Map(observationsData.map(o => [o.memberId, o._count.id]));
    const pendingTasksMap = new Map(pendingTasksData.map(t => [t.memberId, t._count.id]));
    const overdueTasksMap = new Map(overdueTasksData.map(t => [t.memberId, t._count.id]));
    const pendingAssessmentsMap = new Map(pendingAssessmentsData.map(a => [a.memberId, a._count.id]));
    const wellbeingStatusMap = new Map(wellbeingStatusesData.map(w => [w.memberId, w]));
    const conversationCountMap = new Map(conversationCountData.map(d => [d.userId, d._count.id]));

    // Create members that don't have wellbeing status
    const missingWellbeingMemberIds = memberIds.filter(id => !wellbeingStatusMap.has(id));
    if (missingWellbeingMemberIds.length > 0) {
      const createdStatuses = await this.prisma.memberWellbeingStatus.createMany({
        data: missingWellbeingMemberIds.map(memberId => ({
          memberId,
          status: 'green',
          aiSuggestedStatus: 'green',
          summary: 'Member profile created. AI analysis pending.',
          lastAnalyzedAt: new Date(),
        })),
      });

      // Fetch newly created statuses and add to map
      const newStatuses = await this.prisma.memberWellbeingStatus.findMany({
        where: {
          memberId: { in: missingWellbeingMemberIds },
        },
      });
      newStatuses.forEach(s => wellbeingStatusMap.set(s.memberId, s));
    }

    // Build summaries using lookup maps
    const summaries: CounselorMemberSummary[] = assignments.map((assignment) => {
      const memberId = assignment.memberId;
      const lastLogin = sessionMap.get(memberId);
      const lastActive = messageMap.get(memberId);
      const totalConversations = conversationCountMap.get(memberId) || 0;
      const observationCount = observationMap.get(memberId) || 0;
      const pendingTasks = pendingTasksMap.get(memberId) || 0;
      const overdueTasks = overdueTasksMap.get(memberId) || 0;
      const pendingAssessments = pendingAssessmentsMap.get(memberId) || 0;
      const wellbeingStatus = wellbeingStatusMap.get(memberId)!;

      return {
        member: assignment.member,
        wellbeingStatus: wellbeingStatus as any,
        lastLogin,
        lastActive,
        lastConversationDate: lastLogin, // Keep for backward compatibility
        totalConversations,
        observationCount,
        assignment: assignment as any,
        pendingTasks,
        overdueTasks,
        pendingAssessments,
      };
    });

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
