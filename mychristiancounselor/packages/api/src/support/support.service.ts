import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyToTicketDto } from './dto/reply-to-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { LinkTicketsDto } from './dto/link-tickets.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { AiService } from '../ai/ai.service';
import { SlaCalculatorService } from '../sla/sla-calculator.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private slaCalculator: SlaCalculatorService,
  ) {}

  async createTicket(userId: string, dto: CreateTicketDto): Promise<any> {
    // Get user with organization memberships
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine organizationId (null if individual user, set if org member)
    const organizationId = user.organizationMemberships.length > 0
      ? user.organizationMemberships[0].organizationId
      : null;

    // Get org size for work priority calculation
    let orgSize = 0;
    if (organizationId) {
      try {
        orgSize = await this.prisma.organizationMember.count({ where: { organizationId } });
      } catch (error) {
        this.logger.warn(
          `Failed to get org size for ${organizationId}: ${error.message}`
        );
        // Continue with orgSize = 0
      }
    }

    // AI Priority Detection
    let priority = dto.priority || 'medium';
    let aiDetectedPriority = false;

    // Only use AI if user didn't explicitly set priority OR set it to default 'medium'
    if (!dto.priority || dto.priority === 'medium') {
      try {
        const aiPriority = await this.aiService.detectPriority(
          dto.title,
          dto.description
        );
        priority = aiPriority;
        aiDetectedPriority = true;
        this.logger.log(
          `AI detected priority: ${aiPriority} for ticket "${dto.title}"`
        );
      } catch (error) {
        this.logger.error('AI priority detection failed', {
          error: error.message,
          title: dto.title,
        });
        // Keep fallback priority 'medium'
        aiDetectedPriority = false;
      }
    }

    // Map priority to numeric value
    const priorityValues = {
      urgent: 11,
      high: 9,
      medium: 6,
      none: 3,
      low: 2,
      feature: 1,
    };
    const priorityScore = priorityValues[priority] || 6;

    // Calculate initial work priority score
    // Formula: (priority × 10) + (age × 2) + (orgSize × 0.5)
    const ageInDays = 0; // Just created
    const workPriorityScore = (priorityScore * 10) + (ageInDays * 2) + (orgSize * 0.5);

    // Calculate SLA deadlines based on priority
    const responseHours = this.slaCalculator.getSLAHours(priority as any, 'response');
    const resolutionHours = this.slaCalculator.getSLAHours(priority as any, 'resolution');

    const responseSLADeadline = await this.slaCalculator.calculateDeadline(
      new Date(),
      responseHours,
    );

    const resolutionSLADeadline = await this.slaCalculator.calculateDeadline(
      new Date(),
      resolutionHours,
    );

    this.logger.log(
      `SLA deadlines calculated for priority ${priority}: ` +
      `response=${responseSLADeadline?.toISOString() || 'null'}, ` +
      `resolution=${resolutionSLADeadline?.toISOString() || 'null'}`
    );

    // Determine assignedToId for auto-assignment (org tickets → org admin)
    let assignedToId: string | null = null;

    if (organizationId) {
      // For org users: find org admin to auto-assign
      // Try to find an Owner first (preferred)
      let orgAdmin = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: organizationId,
          role: { name: 'Owner' },
        },
      });

      // If no Owner, fall back to Admin
      if (!orgAdmin) {
        orgAdmin = await this.prisma.organizationMember.findFirst({
          where: {
            organizationId: organizationId,
            role: { name: 'Admin' },
          },
        });
      }

      assignedToId = orgAdmin?.userId || null;
    }
    // For individual users: tickets go to platform admin (no auto-assignment, assignedToId stays null)

    // Create ticket and initial message in a transaction
    const ticket = await this.prisma.$transaction(async (tx) => {
      // Create the ticket
      const newTicket = await tx.supportTicket.create({
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority: priority,
          workPriorityScore: workPriorityScore,
          aiDetectedPriority: aiDetectedPriority,
          createdById: userId,
          organizationId: organizationId,
          assignedToId: assignedToId,
          status: assignedToId ? 'in_progress' : 'open', // Auto-assigned tickets start in_progress

          // SLA fields
          responseSLADeadline,
          resolutionSLADeadline,
          responseSLAStatus: 'on_track',
          resolutionSLAStatus: 'on_track',
        },
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedTo: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      // Create initial message with the description
      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          authorId: userId,
          authorRole: 'user',
          content: dto.description,
          isInternal: false,
        },
      });

      return newTicket;
    });

    // Log ticket creation
    this.logger.log(
      `Ticket created: ${ticket.id} by user ${userId} ` +
      `(org: ${organizationId || 'individual'}, ` +
      `priority: ${priority}${aiDetectedPriority ? ' [AI]' : ''}, ` +
      `assigned: ${assignedToId ? 'yes' : 'no'})`
    );

    // Note: Email notifications skipped - EmailModule doesn't exist yet

    return ticket;
  }

  async getTicketById(ticketId: string, userId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async getUserTickets(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: string[];
      priority?: string[];
      category?: string[];
    }
  ): Promise<{ tickets: any[]; total: number; page: number; limit: number }> {
    // Get user with platform admin flag and org memberships
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPlatformAdmin: true,
        organizationMemberships: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build where clause based on user role
    let where: any;

    if (user.isPlatformAdmin) {
      // Platform admins see ALL tickets in the system
      where = {};
    } else {
      // Regular users see tickets where they are creator OR assignee
      // For org users, also include tickets from their organization(s)
      const orgIds = user.organizationMemberships.map(m => m.organizationId);

      if (orgIds.length > 0) {
        // Org user: tickets they created, tickets assigned to them, OR tickets from their org
        where = {
          OR: [
            { createdById: userId },
            { assignedToId: userId },
            { organizationId: { in: orgIds } },
          ],
        };
      } else {
        // Individual user: only tickets they created or are assigned to
        where = {
          OR: [
            { createdById: userId },
            { assignedToId: userId },
          ],
        };
      }
    }

    // Add status filter
    if (options?.status?.length) {
      where.status = { in: options.status };
    }

    // Add priority filter
    if (options?.priority?.length) {
      where.priority = { in: options.priority };
    }

    // Add category filter
    if (options?.category?.length) {
      where.category = { in: options.category };
    }

    // Fetch tickets and total count in parallel
    const [ticketsRaw, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedTo: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { workPriorityScore: 'desc' }, // Highest priority first
        skip: options?.skip || 0,
        take: options?.take || 50, // Default limit of 50
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    // Transform to include messageCount in the response
    const tickets = ticketsRaw.map(ticket => ({
      ...ticket,
      messageCount: ticket._count.messages,
      _count: undefined, // Remove _count from response
    }));

    return {
      tickets,
      total,
      page: Math.floor((options?.skip || 0) / (options?.take || 50)) + 1,
      limit: options?.take || 50,
    };
  }

  async replyToTicket(ticketId: string, userId: string, dto: ReplyToTicketDto): Promise<any> {
    // Fetch user once with all needed data to avoid duplicate queries
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPlatformAdmin: true,
        organizationMemberships: {
          select: {
            organizationId: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get ticket with relations
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        assignedTo: true,
        organization: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Cannot reply to closed tickets
    if (ticket.status === 'closed' || ticket.status === 'rejected') {
      throw new BadRequestException('Cannot reply to closed or rejected tickets');
    }

    // Check if user can access this ticket
    const canAccess = this.canUserAccessTicket(user, ticket);
    if (!canAccess) {
      throw new ForbiddenException('You do not have permission to reply to this ticket');
    }

    // Determine author role based on user's relationship to the ticket
    const authorRole = this.determineAuthorRole(user, ticket);

    // Only admins can create internal messages
    if (dto.isInternal && authorRole === 'user') {
      throw new ForbiddenException('Only administrators can create internal messages');
    }

    // Create message and update ticket status in a transaction for data consistency
    const message = await this.prisma.$transaction(async (tx) => {
      // Create the message
      const newMessage = await tx.ticketMessage.create({
        data: {
          ticketId: ticketId,
          authorId: userId,
          authorRole: authorRole,
          content: dto.content,
          isInternal: dto.isInternal || false,
        },
        include: {
          author: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          attachments: true,
        },
      });

      // Update ticket status based on who replied
      if (ticket.status === 'open' && authorRole !== 'user') {
        // Admin claimed the ticket by replying
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'in_progress' },
        });
      } else if (ticket.status === 'waiting_on_user' && authorRole === 'user') {
        // User responded to admin's message
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'in_progress' },
        });
      } else if (ticket.status === 'in_progress' && authorRole !== 'user' && !dto.isInternal) {
        // Internal admin messages don't change ticket status - only public replies trigger status transitions
        // Admin replied to user, now waiting on user
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'waiting_on_user' },
        });
      }

      return newMessage;
    });

    this.logger.log(
      `Message created on ticket ${ticketId} by user ${userId} ` +
      `(role: ${authorRole}, internal: ${dto.isInternal || false})`
    );

    // Note: Email notifications skipped - EmailModule doesn't exist yet

    return message;
  }

  private async getUserWithPermissions(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPlatformAdmin: true,
        organizationMemberships: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private canUserAccessTicket(user: any, ticket: any): boolean {
    // Platform admins can access all tickets
    if (user.isPlatformAdmin) {
      return true;
    }

    // User created the ticket
    if (ticket.createdById === user.id) {
      return true;
    }

    // User is assigned to the ticket
    if (ticket.assignedToId === user.id) {
      return true;
    }

    // If ticket belongs to an organization, check if user is admin in that org
    if (ticket.organizationId) {
      const orgMembership = user.organizationMemberships.find(
        (m: any) => m.organizationId === ticket.organizationId
      );

      if (orgMembership && ['Owner', 'Admin'].includes(orgMembership.role.name)) {
        return true;
      }
    }

    return false;
  }

  private canUserCloseTicket(user: any, ticket: any): boolean {
    // Platform admins can close all tickets
    if (user.isPlatformAdmin) {
      return true;
    }

    // User created the ticket
    if (ticket.createdById === user.id) {
      return true;
    }

    // If ticket belongs to an organization, check if user is admin in that org
    if (ticket.organizationId) {
      const orgMembership = user.organizationMemberships.find(
        (m: any) => m.organizationId === ticket.organizationId
      );

      if (orgMembership && ['Owner', 'Admin'].includes(orgMembership.role.name)) {
        return true;
      }
    }

    return false;
  }

  private determineAuthorRole(user: any, ticket: any): string {
    // Platform admin
    if (user.isPlatformAdmin) {
      return 'platform_admin';
    }

    // Check if org admin
    if (ticket.organizationId) {
      const orgMembership = user.organizationMemberships.find(
        (m: any) => m.organizationId === ticket.organizationId
      );

      if (orgMembership && ['Owner', 'Admin'].includes(orgMembership.role.name)) {
        return 'org_admin';
      }

      // Org member (but not admin)
      if (orgMembership) {
        return 'org_member';
      }
    }

    // Regular user
    return 'user';
  }

  async getAdminQueue(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: string[];
      priority?: string[];
      category?: string[];
      assignedToId?: string;
    }
  ): Promise<{ tickets: any[]; total: number; page: number; limit: number }> {
    // Get user with platform admin flag and org memberships
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPlatformAdmin: true,
        organizationMemberships: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Filter admin memberships first to ensure proper permission checks
    const adminMemberships = user.organizationMemberships.filter(
      (m) => m.role.name === 'Owner' || m.role.name === 'Admin'
    );

    if (!user.isPlatformAdmin && adminMemberships.length === 0) {
      throw new ForbiddenException('Only administrators can access the admin queue');
    }

    // Build where clause based on user role
    const where: any = {
      status: { notIn: ['closed', 'rejected'] }, // Unresolved tickets only by default
    };

    // Apply role-based visibility
    if (user.isPlatformAdmin) {
      // Platform admins see ALL unresolved tickets in the system
      // (no additional filters needed)
    } else {
      // Org admins see only tickets from organizations where they are admin
      // This prevents users who are Admin in Org A but Member in Org B from seeing Org B tickets
      const orgIds = adminMemberships.map((m) => m.organizationId);

      where.organizationId = { in: orgIds };
    }

    // Apply status filter (if provided, overrides default unresolved-only behavior)
    // This allows admins to explicitly query for closed/rejected tickets if needed,
    // which is useful for reviewing recently resolved tickets
    if (options?.status?.length) {
      where.status = { in: options.status };
    }

    // Apply priority filter
    if (options?.priority?.length) {
      where.priority = { in: options.priority };
    }

    // Apply category filter
    if (options?.category?.length) {
      where.category = { in: options.category };
    }

    // Apply assignedToId filter
    if (options?.assignedToId) {
      where.assignedToId = options.assignedToId;
    }

    // Fetch tickets and total count in parallel
    const [ticketsRaw, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedTo: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { workPriorityScore: 'desc' }, // Highest priority first
        skip: options?.skip || 0,
        take: options?.take || 50, // Default limit of 50
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    // Transform to include messageCount in the response
    const tickets = ticketsRaw.map((ticket) => ({
      ...ticket,
      messageCount: ticket._count.messages,
      _count: undefined, // Remove _count from response
    }));

    return {
      tickets,
      total,
      page: Math.floor((options?.skip || 0) / (options?.take || 50)) + 1,
      limit: options?.take || 50,
    };
  }

  async assignTicket(ticketId: string, adminId: string, dto: AssignTicketDto): Promise<any> {
    // Get ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        organization: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify admin can access this ticket
    const user = await this.getUserWithPermissions(adminId);

    // Check if admin has permission to assign this ticket
    const canAccess = this.canUserAccessTicket(user, ticket);
    if (!canAccess) {
      throw new ForbiddenException('You do not have permission to assign this ticket');
    }

    // Verify that the assignee exists and fetch with permissions
    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPlatformAdmin: true,
        organizationMemberships: {
          include: {
            role: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee user not found');
    }

    // Verify assignee has admin permissions for this ticket
    const isValidAssignee = assignee.isPlatformAdmin ||
      (ticket.organizationId &&
       assignee.organizationMemberships.some((m: any) =>
         m.organizationId === ticket.organizationId &&
         ['Owner', 'Admin'].includes(m.role.name)
       ));

    if (!isValidAssignee) {
      throw new ForbiddenException(
        'Cannot assign ticket to user without admin permissions for this organization'
      );
    }

    // Update ticket
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: dto.assignedToId,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Ticket ${ticketId} assigned to user ${dto.assignedToId} by admin ${adminId}`
    );

    return updated;
  }

  async resolveTicket(ticketId: string, adminId: string, dto: ResolveTicketDto): Promise<any> {
    // Get ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        organization: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if ticket is already resolved or closed
    if (ticket.status === 'resolved') {
      throw new BadRequestException('Ticket is already resolved');
    }

    if (ticket.status === 'closed' || ticket.status === 'rejected') {
      throw new BadRequestException('Cannot resolve a closed or rejected ticket');
    }

    // Verify admin can access this ticket
    const user = await this.getUserWithPermissions(adminId);

    // Check if admin has permission to resolve this ticket
    const canAccess = this.canUserAccessTicket(user, ticket);
    if (!canAccess) {
      throw new ForbiddenException('You do not have permission to resolve this ticket');
    }

    // Update ticket with resolution and resolvedById
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolution: dto.resolution,
        resolvedById: adminId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        resolvedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Ticket ${ticketId} resolved by admin ${adminId} with resolution: ${dto.resolution.substring(0, 50)}...`
    );

    // Note: Email notifications skipped - EmailModule doesn't exist yet

    return updated;
  }

  async closeTicket(ticketId: string, userId: string): Promise<any> {
    // Get ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: true,
        organization: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if ticket is already closed
    if (ticket.status === 'closed' || ticket.status === 'rejected') {
      throw new BadRequestException('Ticket is already closed or rejected');
    }

    // Get user info
    const user = await this.getUserWithPermissions(userId);

    // Check if user can close this ticket (must be creator or admin)
    const canClose = this.canUserCloseTicket(user, ticket);
    if (!canClose) {
      throw new ForbiddenException('You do not have permission to close this ticket');
    }

    // Update ticket
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        closedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Ticket ${ticketId} closed by user ${userId}`
    );

    return updated;
  }

  /**
   * Get similar tickets (active or historical) for a given ticket
   * @param ticketId Source ticket ID
   * @param userId User requesting the data
   * @param matchType 'active' or 'historical'
   * @returns Similar tickets with full details
   */
  async getSimilarTickets(
    ticketId: string,
    userId: string,
    matchType: 'active' | 'historical'
  ): Promise<any[]> {
    // Verify user has access to the source ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, createdById: true, organizationId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access
    const user = await this.getUserWithPermissions(userId);
    const canAccess = this.canUserAccessTicket(user, ticket);

    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to view this ticket'
      );
    }

    // Get similarity results from AI service
    let similarityResults: any[];

    if (matchType === 'active') {
      similarityResults = await this.aiService.findSimilarActiveTickets(ticketId);
    } else {
      similarityResults = await this.aiService.getCachedHistoricalMatches(
        ticketId
      );
    }

    // Fetch full ticket details for similar tickets
    const similarTicketIds = similarityResults.map((r) => r.similarTicketId);

    if (similarTicketIds.length === 0) {
      return [];
    }

    const similarTickets = await this.prisma.supportTicket.findMany({
      where: {
        id: { in: similarTicketIds },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Combine similarity scores with ticket details
    const results = similarityResults.map((sr) => {
      const ticket = similarTickets.find((t) => t.id === sr.similarTicketId);
      if (!ticket) return null;

      return {
        id: `${ticketId}-${ticket.id}-${matchType}`, // Unique ID for frontend
        sourceTicketId: ticketId,
        similarTicketId: ticket.id,
        similarityScore: sr.score,
        matchType,
        similarTicket: {
          ...ticket,
          messageCount: ticket._count.messages,
          _count: undefined,
        },
      };
    });

    return results.filter((r) => r !== null);
  }

  /**
   * Link two tickets together
   * @param sourceTicketId Source ticket ID
   * @param dto Link details (target ticket ID and relationship)
   * @param userId User performing the action
   * @returns Created ticket link
   */
  async linkTickets(
    sourceTicketId: string,
    dto: LinkTicketsDto,
    userId: string
  ): Promise<any> {
    // Verify user is admin
    const user = await this.getUserWithPermissions(userId);

    if (!user.isPlatformAdmin) {
      // Check if org admin
      const isOrgAdmin = user.organizationMemberships.some(
        (m: any) => m.role.name === 'Owner' || m.role.name === 'Admin'
      );

      if (!isOrgAdmin) {
        throw new ForbiddenException('Only admins can link tickets');
      }
    }

    // Verify both tickets exist
    const [sourceTicket, targetTicket] = await Promise.all([
      this.prisma.supportTicket.findUnique({
        where: { id: sourceTicketId },
        select: { id: true },
      }),
      this.prisma.supportTicket.findUnique({
        where: { id: dto.targetTicketId },
        select: { id: true },
      }),
    ]);

    if (!sourceTicket || !targetTicket) {
      throw new NotFoundException('One or both tickets not found');
    }

    // Create the link
    const link = await this.prisma.ticketLink.create({
      data: {
        sourceTicketId,
        targetTicketId: dto.targetTicketId,
        relationship: dto.relationship,
        aiSuggested: false,
        createdById: userId,
      },
    });

    this.logger.log(
      `Tickets linked: ${sourceTicketId} -> ${dto.targetTicketId} ` +
        `(${dto.relationship}) by user ${userId}`
    );

    return link;
  }

  /**
   * Dismiss an AI similarity suggestion
   * @param similarityId Similarity cache record ID
   * @param userId User dismissing the suggestion
   */
  async dismissSuggestion(similarityId: string, userId: string): Promise<void> {
    // Parse the similarity ID (format: sourceTicketId-similarTicketId-matchType)
    const parts = similarityId.split('-');
    if (parts.length < 3) {
      throw new BadRequestException('Invalid similarity ID format');
    }

    const sourceTicketId = parts[0];
    const similarTicketId = parts[1];
    const matchType = parts[2];

    // Verify user has access to source ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: sourceTicketId },
      select: { id: true, createdById: true, organizationId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.getUserWithPermissions(userId);
    const canAccess = this.canUserAccessTicket(user, ticket);

    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to dismiss this suggestion'
      );
    }

    // Delete the similarity record
    await this.prisma.ticketSimilarity.deleteMany({
      where: {
        sourceTicketId,
        similarTicketId,
        matchType,
      },
    });

    this.logger.log(
      `Similarity suggestion dismissed: ${sourceTicketId} -> ${similarTicketId} ` +
        `(${matchType}) by user ${userId}`
    );
  }
}
