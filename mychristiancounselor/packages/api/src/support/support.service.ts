import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyToTicketDto } from './dto/reply-to-ticket.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
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

    // Map priority to numeric value
    const priorityValues = {
      urgent: 11,
      high: 9,
      medium: 6,
      none: 3,
      low: 2,
      feature: 1,
    };
    const priority = dto.priority || 'medium';
    const priorityScore = priorityValues[priority] || 6;

    // Calculate initial work priority score
    // Formula: (priority × 10) + (age × 2) + (orgSize × 0.5)
    const ageInDays = 0; // Just created
    const workPriorityScore = (priorityScore * 10) + (ageInDays * 2) + (orgSize * 0.5);

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
          createdById: userId,
          organizationId: organizationId,
          assignedToId: assignedToId,
          status: assignedToId ? 'in_progress' : 'open', // Auto-assigned tickets start in_progress
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
      `priority: ${priority}, ` +
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
}
