import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

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

  async getUserTickets(userId: string): Promise<any> {
    throw new Error('Not implemented');
  }
}
