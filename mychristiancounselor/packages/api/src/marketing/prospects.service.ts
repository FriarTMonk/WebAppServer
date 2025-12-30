import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { ProspectFiltersDto } from './dto/prospect-filters.dto';

@Injectable()
export class ProspectsService {
  private readonly logger = new Logger(ProspectsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new prospect
   */
  async createProspect(userId: string, dto: CreateProspectDto) {
    // Check if any contact email already exists for other prospects
    for (const contact of dto.contacts) {
      const existing = await this.prisma.prospectContact.findFirst({
        where: { email: contact.email },
      });

      if (existing) {
        throw new BadRequestException(`A prospect with email ${contact.email} already exists`);
      }
    }

    // Ensure at least one contact is marked as primary
    const hasPrimary = dto.contacts.some(c => c.isPrimary);
    if (!hasPrimary && dto.contacts.length > 0) {
      dto.contacts[0].isPrimary = true;
    }

    const { contacts, ...prospectData } = dto;

    const prospect = await this.prisma.prospect.create({
      data: {
        ...prospectData,
        createdById: userId,
        contacts: {
          create: contacts,
        },
      },
      include: {
        contacts: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    this.logger.log(`Prospect created: ${prospect.id} with ${contacts.length} contact(s) by user ${userId}`);
    return prospect;
  }

  /**
   * List prospects with filters
   * Sales reps see only their own, platform admins see all
   */
  async listProspects(userId: string, isPlatformAdmin: boolean, filters: ProspectFiltersDto) {
    const where: any = {};

    // Permission filter: sales reps see only their own
    if (!isPlatformAdmin) {
      where.createdById = userId;
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { organizationName: { contains: filters.search, mode: 'insensitive' } },
        { contacts: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
        { contacts: { some: { email: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    // Archived filter
    if (!filters.includeArchived) {
      where.archivedAt = null;
    }

    // Converted filter
    if (!filters.includeConverted) {
      where.convertedAt = null;
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const prospects = await this.prisma.prospect.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedToOrganization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { campaignRecipients: true },
        },
      },
    });

    return prospects;
  }

  /**
   * Get prospect by ID
   * Check permission: owner or platform admin
   */
  async getProspect(userId: string, isPlatformAdmin: boolean, prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedToOrganization: {
          select: { id: true, name: true },
        },
        campaignRecipients: {
          include: {
            prospectContact: true,
            campaign: {
              select: { id: true, name: true, subject: true, sentAt: true, status: true },
            },
          },
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only view your own prospects');
    }

    return prospect;
  }

  /**
   * Update prospect
   * Check permission: owner or platform admin
   */
  async updateProspect(userId: string, isPlatformAdmin: boolean, prospectId: string, dto: UpdateProspectDto) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: { contacts: true },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only update your own prospects');
    }

    // If updating contacts, check for duplicate emails
    if (dto.contacts) {
      for (const contact of dto.contacts) {
        const existing = await this.prisma.prospectContact.findFirst({
          where: {
            email: contact.email,
            prospectId: { not: prospectId }, // Exclude current prospect's contacts
          },
        });

        if (existing) {
          throw new BadRequestException(`A prospect with email ${contact.email} already exists`);
        }
      }

      // Ensure at least one contact is marked as primary
      const hasPrimary = dto.contacts.some(c => c.isPrimary);
      if (!hasPrimary && dto.contacts.length > 0) {
        dto.contacts[0].isPrimary = true;
      }
    }

    const { contacts, ...prospectData } = dto;

    // Build update data
    const updateData: any = { ...prospectData };

    // If contacts are provided, replace all contacts
    if (contacts) {
      updateData.contacts = {
        deleteMany: {}, // Delete all existing contacts
        create: contacts, // Create new contacts
      };
    }

    const updated = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: updateData,
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedToOrganization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Prospect updated: ${prospectId} by user ${userId}`);
    return updated;
  }

  /**
   * Archive prospect (soft delete)
   */
  async archiveProspect(userId: string, isPlatformAdmin: boolean, prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only archive your own prospects');
    }

    const updated = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { archivedAt: new Date() },
    });

    this.logger.log(`Prospect archived: ${prospectId} by user ${userId}`);
    return updated;
  }

  /**
   * Unarchive prospect
   */
  async unarchiveProspect(userId: string, isPlatformAdmin: boolean, prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only unarchive your own prospects');
    }

    const updated = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { archivedAt: null },
    });

    this.logger.log(`Prospect unarchived: ${prospectId} by user ${userId}`);
    return updated;
  }

  /**
   * Delete prospect (hard delete)
   * Only for prospects with no campaign history
   */
  async deleteProspect(userId: string, isPlatformAdmin: boolean, prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        _count: {
          select: { campaignRecipients: true },
        },
      },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own prospects');
    }

    // Check if prospect has campaign history
    if (prospect._count.campaignRecipients > 0) {
      throw new BadRequestException('Cannot delete prospect with campaign history. Archive instead.');
    }

    await this.prisma.prospect.delete({
      where: { id: prospectId },
    });

    this.logger.log(`Prospect deleted: ${prospectId} by user ${userId}`);
    return { message: 'Prospect deleted successfully' };
  }

  /**
   * Check if prospect can receive a campaign (90-day cooldown)
   */
  async canReceiveCampaign(prospectId: string): Promise<boolean> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { lastCampaignSentAt: true },
    });

    if (!prospect) {
      return false;
    }

    // No campaign sent yet
    if (!prospect.lastCampaignSentAt) {
      return true;
    }

    // Check 90-day cooldown
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return prospect.lastCampaignSentAt < ninetyDaysAgo;
  }

  /**
   * Update last campaign sent timestamp
   */
  async updateLastCampaignSent(prospectId: string, sentAt: Date = new Date()) {
    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { lastCampaignSentAt: sentAt },
    });

    this.logger.log(`Updated lastCampaignSentAt for prospect: ${prospectId}`);
  }

  /**
   * Convert prospect to organization
   */
  async convertProspectToOrganization(userId: string, isPlatformAdmin: boolean, prospectId: string, organizationId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only convert your own prospects');
    }

    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.prospect.update({
      where: { id: prospectId },
      data: {
        convertedToOrganizationId: organizationId,
        convertedAt: new Date(),
      },
      include: {
        convertedToOrganization: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(`Prospect converted to organization: ${prospectId} → ${organizationId} by user ${userId}`);
    return updated;
  }

  /**
   * Get campaign history for a prospect
   */
  async getCampaignHistory(userId: string, isPlatformAdmin: boolean, prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundException('Prospect not found');
    }

    // Permission check
    if (!isPlatformAdmin && prospect.createdById !== userId) {
      throw new ForbiddenException('You can only view your own prospects');
    }

    const history = await this.prisma.emailCampaignRecipient.findMany({
      where: { prospectId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true,
            sentAt: true,
            status: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return history;
  }
}
