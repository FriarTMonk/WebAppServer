import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AssignRepDto } from './dto/assign-rep.dto';
import { RecordActivityDto } from './dto/record-activity.dto';
import { MarkWonDto } from './dto/mark-won.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { SalesStage } from '@prisma/client';

interface QueueFilters {
  stage?: SalesStage;
  leadSource?: string;
  assignmentFilter?: 'all' | 'unassigned' | 'assigned';
  sortBy?: 'priorityScore' | 'dealValue' | 'probability' | 'createdAt' | 'estimatedCloseDate';
  skip?: number;
  take?: number;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate priority score for an opportunity
   * Formula: (dealValue / 1000) × (probability / 100) × urgencyFactor
   */
  private calculatePriorityScore(
    dealValue: number,
    probability: number,
    estimatedCloseDate?: Date | string,
  ): number {
    const baseScore = (dealValue / 1000) * (probability / 100);

    if (!estimatedCloseDate) return baseScore;

    const closeDate = new Date(estimatedCloseDate);
    const now = new Date();
    const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyFactor = 1.0;
    if (daysUntilClose < 0 || daysUntilClose <= 7) {
      urgencyFactor = 3.0; // Overdue or this week
    } else if (daysUntilClose <= 30) {
      urgencyFactor = 2.0; // This month
    } else if (daysUntilClose <= 60) {
      urgencyFactor = 1.5; // Next month
    }

    return baseScore * urgencyFactor;
  }

  /**
   * Create a new sales opportunity
   */
  async createOpportunity(userId: string, dto: CreateOpportunityDto) {
    const priorityScore = this.calculatePriorityScore(
      dto.dealValue,
      dto.probability,
      dto.estimatedCloseDate,
    );

    return this.prisma.salesOpportunity.create({
      data: {
        title: dto.title,
        description: dto.description,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        companyName: dto.companyName,
        leadSource: dto.leadSource,
        dealValue: dto.dealValue,
        probability: dto.probability,
        estimatedCloseDate: dto.estimatedCloseDate ? new Date(dto.estimatedCloseDate) : null,
        stage: SalesStage.prospect,
        priorityScore,
        createdById: userId,
        firstContactAt: new Date(),
        campaignRecipientId: dto.campaignRecipientId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get a single opportunity with permission check
   */
  async getOpportunity(opportunityId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true, isSalesRep: true },
    });

    const opportunity = await this.prisma.salesOpportunity.findUnique({
      where: { id: opportunityId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        activities: {
          include: {
            performedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        notes: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Permission check
    const canView =
      user.isPlatformAdmin ||
      (user.isSalesRep && (opportunity.assignedToId === userId || !opportunity.assignedToId)) ||
      opportunity.createdById === userId;

    if (!canView) {
      throw new ForbiddenException('You do not have permission to view this opportunity');
    }

    return opportunity;
  }

  /**
   * Get user's opportunities (for regular users, not admin queue)
   */
  async getUserOpportunities(userId: string, options?: QueueFilters) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true, isSalesRep: true },
    });

    const where: any = {};

    // Regular users see only their created opportunities
    if (!user.isPlatformAdmin && !user.isSalesRep) {
      where.createdById = userId;
    } else if (user.isSalesRep && !user.isPlatformAdmin) {
      // Sales reps see assigned + unassigned
      where.OR = [{ assignedToId: userId }, { assignedToId: null }];
    }
    // Platform admins see all (no filter)

    // Apply optional filters
    if (options?.stage) {
      where.stage = options.stage;
    }
    if (options?.leadSource) {
      where.leadSource = options.leadSource;
    }

    const orderBy = this.getOrderBy(options?.sortBy);

    const [opportunities, total] = await Promise.all([
      this.prisma.salesOpportunity.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.salesOpportunity.count({ where }),
    ]);

    return {
      opportunities,
      total,
      page: Math.floor((options?.skip || 0) / (options?.take || 50)) + 1,
      pageSize: options?.take || 50,
    };
  }

  /**
   * Get admin queue with role-based filtering
   * Platform Admin: See ALL opportunities
   * Sales Rep: See assigned to them OR unassigned
   * Regular User: See only created by them
   */
  async getAdminQueue(userId: string, options?: QueueFilters) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true, isSalesRep: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const where: any = {};

    // Role-based filtering
    if (user.isPlatformAdmin) {
      // Platform Admin: See ALL opportunities (no filter)
      where.stage = { notIn: [SalesStage.won, SalesStage.lost] }; // Active only by default
    } else if (user.isSalesRep) {
      // Sales Rep: See assigned to them OR unassigned
      where.AND = [
        {
          OR: [{ assignedToId: userId }, { assignedToId: null }],
        },
        {
          stage: { notIn: [SalesStage.won, SalesStage.lost] }, // Active only
        },
      ];
    } else {
      // Regular user: See only created by them
      where.createdById = userId;
    }

    // Apply optional filters
    if (options?.stage) {
      // Override default active filter if specific stage requested
      if (where.AND) {
        where.AND[1].stage = options.stage;
      } else {
        where.stage = options.stage;
      }
    }
    if (options?.leadSource) {
      where.leadSource = options.leadSource;
    }
    if (options?.assignmentFilter) {
      if (options.assignmentFilter === 'unassigned') {
        where.assignedToId = null;
      } else if (options.assignmentFilter === 'assigned') {
        where.assignedToId = { not: null };
      }
    }

    const orderBy = this.getOrderBy(options?.sortBy || 'priorityScore');

    const [opportunities, total] = await Promise.all([
      this.prisma.salesOpportunity.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.salesOpportunity.count({ where }),
    ]);

    return {
      opportunities,
      total,
      page: Math.floor((options?.skip || 0) / (options?.take || 50)) + 1,
      pageSize: options?.take || 50,
    };
  }

  /**
   * Assign opportunity to sales rep (admin or sales rep only)
   */
  async assignToRep(opportunityId: string, userId: string, dto: AssignRepDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true, isSalesRep: true },
    });

    if (!user.isPlatformAdmin && !user.isSalesRep) {
      throw new ForbiddenException('Only admins and sales reps can assign opportunities');
    }

    const opportunity = await this.prisma.salesOpportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Verify assignee is a sales rep or admin
    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
      select: { isSalesRep: true, isPlatformAdmin: true },
    });

    if (!assignee || (!assignee.isSalesRep && !assignee.isPlatformAdmin)) {
      throw new ForbiddenException('Can only assign to sales reps or admins');
    }

    return this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: {
        assignedToId: dto.assignedToId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update opportunity stage with auto-timestamps
   */
  async updateStage(opportunityId: string, userId: string, dto: UpdateStageDto) {
    await this.getOpportunity(opportunityId, userId); // Permission check

    const updateData: any = {
      stage: dto.stage,
    };

    // Auto-set timestamps based on stage
    const now = new Date();
    if (dto.stage === SalesStage.proposal) {
      updateData.proposalSentAt = now;
    } else if (dto.stage === SalesStage.negotiation) {
      updateData.negotiationStartedAt = now;
    } else if (dto.stage === SalesStage.won) {
      updateData.wonAt = now;
    } else if (dto.stage === SalesStage.lost) {
      updateData.lostAt = now;
    }

    return this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Record sales activity
   */
  async recordActivity(opportunityId: string, userId: string, dto: RecordActivityDto) {
    await this.getOpportunity(opportunityId, userId); // Permission check

    const [activity] = await Promise.all([
      this.prisma.salesActivity.create({
        data: {
          opportunityId,
          performedById: userId,
          activityType: dto.activityType,
          subject: dto.subject,
          notes: dto.notes,
          duration: dto.duration,
          outcome: dto.outcome,
          nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null,
        },
        include: {
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.salesOpportunity.update({
        where: { id: opportunityId },
        data: {
          lastActivityAt: new Date(),
          nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
          followUpNotes: dto.notes || undefined,
        },
      }),
    ]);

    return activity;
  }

  /**
   * Mark opportunity as won
   */
  async markWon(opportunityId: string, userId: string, dto: MarkWonDto) {
    await this.getOpportunity(opportunityId, userId); // Permission check

    const now = new Date();
    return this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: {
        stage: SalesStage.won,
        wonAt: now,
        dealValue: dto.actualValue,
        probability: 100, // Won = 100%
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Mark opportunity as lost
   */
  async markLost(opportunityId: string, userId: string, dto: MarkLostDto) {
    await this.getOpportunity(opportunityId, userId); // Permission check

    const now = new Date();
    return this.prisma.salesOpportunity.update({
      where: { id: opportunityId },
      data: {
        stage: SalesStage.lost,
        lostAt: now,
        lossReason: dto.lossReason,
        lossNotes: dto.notes,
        probability: 0, // Lost = 0%
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Helper to get orderBy clause
   */
  private getOrderBy(sortBy?: string) {
    switch (sortBy) {
      case 'dealValue':
        return { dealValue: 'desc' as const };
      case 'probability':
        return { probability: 'desc' as const };
      case 'createdAt':
        return { createdAt: 'desc' as const };
      case 'estimatedCloseDate':
        return { estimatedCloseDate: 'asc' as const };
      case 'priorityScore':
      default:
        return { priorityScore: 'desc' as const };
    }
  }
}
