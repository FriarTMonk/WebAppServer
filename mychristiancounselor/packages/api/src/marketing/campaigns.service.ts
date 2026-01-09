import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProspectsService } from './prospects.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private prospectsService: ProspectsService,
  ) {}

  /**
   * Create a new campaign (draft status)
   */
  async createCampaign(userId: string, dto: CreateCampaignDto) {
    // Validate prospect contacts exist and check 90-day cooldown
    const validation = await this.validateRecipients(dto.prospectContactIds);

    if (validation.ineligible.length > 0) {
      throw new BadRequestException({
        message: 'Some prospect contacts are not eligible due to 90-day cooldown',
        ineligible: validation.ineligible,
      });
    }

    // Create campaign
    const campaign = await this.prisma.emailCampaign.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        textBody: dto.textBody,
        status: dto.scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        createdById: userId,
        recipients: {
          create: dto.prospectContactIds.map(prospectContactId => ({
            prospectContactId,
            prospectId: validation.contactToProspectMap[prospectContactId], // Link to parent prospect
            status: 'pending',
          })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recipients: {
          include: {
            prospect: {
              select: {
                id: true,
                organizationName: true,
                lastCampaignSentAt: true,
              },
            },
            prospectContact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
                isPrimary: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Campaign created: ${campaign.id} by user ${userId} with ${dto.prospectContactIds.length} recipients`);
    return campaign;
  }

  /**
   * List campaigns with filters
   * Sales reps see only their own, platform admins see all
   */
  async listCampaigns(userId: string, isPlatformAdmin: boolean, filters: CampaignFiltersDto) {
    const where: any = {};

    // Permission filter
    if (!isPlatformAdmin) {
      where.createdById = userId;
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const campaigns = await this.prisma.emailCampaign.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    return campaigns;
  }

  /**
   * Get campaign by ID
   * Check permission: owner or platform admin
   */
  async getCampaign(userId: string, isPlatformAdmin: boolean, campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recipients: {
          include: {
            prospect: {
              select: {
                id: true,
                organizationName: true,
                website: true,
                industry: true,
                estimatedSize: true,
                lastCampaignSentAt: true,
              },
            },
            prospectContact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
                isPrimary: true,
              },
            },
            emailLog: {
              select: {
                status: true,
                sentAt: true,
                deliveredAt: true,
                openedAt: true,
                clickedAt: true,
                bouncedAt: true,
                bounceReason: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Permission check
    if (!isPlatformAdmin && campaign.createdById !== userId) {
      throw new ForbiddenException('You can only view your own campaigns');
    }

    return campaign;
  }

  /**
   * Get campaign analytics (aggregated metrics)
   */
  async getCampaignAnalytics(userId: string, isPlatformAdmin: boolean, campaignId: string) {
    const campaign = await this.getCampaign(userId, isPlatformAdmin, campaignId);

    const recipients = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId },
      include: {
        salesOpportunities: {
          select: { id: true, stage: true, dealValue: true },
        },
      },
    });

    const totalRecipients = recipients.length;
    const sent = recipients.filter(r => r.sentAt).length;
    const delivered = recipients.filter(r => r.deliveredAt).length;
    const opened = recipients.filter(r => r.openedAt).length;
    const clicked = recipients.filter(r => r.clickedAt).length;
    const bounced = recipients.filter(r => r.bouncedAt).length;
    const replied = recipients.filter(r => r.salesOpportunities.length > 0).length;
    const converted = recipients.filter(r => r.convertedAt).length;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        createdAt: campaign.createdAt,
        scheduledFor: campaign.scheduledFor,
        sentAt: campaign.sentAt,
      },
      metrics: {
        totalRecipients,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        replied,
        converted,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
        bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
        replyRate: delivered > 0 ? (replied / delivered) * 100 : 0,
        conversionRate: delivered > 0 ? (converted / delivered) * 100 : 0,
      },
    };
  }

  /**
   * Update campaign (only draft campaigns)
   */
  async updateCampaign(userId: string, isPlatformAdmin: boolean, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Permission check
    if (!isPlatformAdmin && campaign.createdById !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    // Only allow updates to draft campaigns
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be updated');
    }

    // If updating prospect contacts, validate them
    if (dto.prospectContactIds) {
      const validation = await this.validateRecipients(dto.prospectContactIds);

      if (validation.ineligible.length > 0) {
        throw new BadRequestException({
          message: 'Some prospect contacts are not eligible due to 90-day cooldown',
          ineligible: validation.ineligible,
        });
      }

      // Delete existing recipients and create new ones
      await this.prisma.emailCampaignRecipient.deleteMany({
        where: { campaignId },
      });

      await this.prisma.emailCampaignRecipient.createMany({
        data: dto.prospectContactIds.map(prospectContactId => ({
          campaignId,
          prospectContactId,
          prospectId: validation.contactToProspectMap[prospectContactId], // Link to parent prospect
          status: 'pending',
        })),
      });
    }

    const updated = await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        name: dto.name,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        textBody: dto.textBody,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        status: dto.scheduledFor ? 'scheduled' : 'draft',
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recipients: {
          include: {
            prospect: {
              select: {
                id: true,
                organizationName: true,
                website: true,
                industry: true,
                estimatedSize: true,
              },
            },
            prospectContact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
                isPrimary: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Campaign updated: ${campaignId} by user ${userId}`);
    return updated;
  }

  /**
   * Delete campaign (only draft or cancelled)
   */
  async deleteCampaign(userId: string, isPlatformAdmin: boolean, campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Permission check
    if (!isPlatformAdmin && campaign.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    // Only allow delete for draft or cancelled
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      throw new BadRequestException('Only draft or cancelled campaigns can be deleted');
    }

    await this.prisma.emailCampaign.delete({
      where: { id: campaignId },
    });

    this.logger.log(`Campaign deleted: ${campaignId} by user ${userId}`);
    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Schedule campaign for future send
   */
  async scheduleCampaign(userId: string, isPlatformAdmin: boolean, campaignId: string, scheduledFor: Date) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Permission check
    if (!isPlatformAdmin && campaign.createdById !== userId) {
      throw new ForbiddenException('You can only schedule your own campaigns');
    }

    // Only draft campaigns can be scheduled
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be scheduled');
    }

    // Validate scheduledFor is in the future
    if (new Date(scheduledFor) <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const updated = await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'scheduled',
        scheduledFor: new Date(scheduledFor),
      },
    });

    this.logger.log(`Campaign scheduled: ${campaignId} for ${scheduledFor}`);
    return updated;
  }

  /**
   * Cancel scheduled campaign
   */
  async cancelCampaign(userId: string, isPlatformAdmin: boolean, campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Permission check
    if (!isPlatformAdmin && campaign.createdById !== userId) {
      throw new ForbiddenException('You can only cancel your own campaigns');
    }

    // Only scheduled campaigns can be cancelled
    if (campaign.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled campaigns can be cancelled');
    }

    const updated = await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'cancelled',
        scheduledFor: null,
      },
    });

    this.logger.log(`Campaign cancelled: ${campaignId} by user ${userId}`);
    return updated;
  }

  /**
   * Validate recipients - check if they can receive campaigns (90-day cooldown)
   */
  async validateRecipients(prospectContactIds: string[]) {
    const eligible: string[] = [];
    const ineligible: Array<{ prospectContactId: string; reason: string; lastCampaignSentAt?: Date }> = [];
    const contactToProspectMap: Record<string, string> = {};

    for (const prospectContactId of prospectContactIds) {
      const prospectContact = await this.prisma.prospectContact.findUnique({
        where: { id: prospectContactId },
        include: {
          prospect: {
            select: { id: true, lastCampaignSentAt: true, archivedAt: true, convertedAt: true },
          },
        },
      });

      if (!prospectContact) {
        ineligible.push({ prospectContactId, reason: 'Prospect contact not found' });
        continue;
      }

      const prospect = prospectContact.prospect;

      if (prospect.archivedAt) {
        ineligible.push({ prospectContactId, reason: 'Prospect is archived' });
        continue;
      }

      if (prospect.convertedAt) {
        ineligible.push({ prospectContactId, reason: 'Prospect already converted to customer' });
        continue;
      }

      // Check 90-day cooldown at prospect level
      const canReceive = await this.prospectsService.canReceiveCampaign(prospect.id);
      if (!canReceive) {
        ineligible.push({
          prospectContactId,
          reason: '90-day cooldown period not elapsed',
          lastCampaignSentAt: prospect.lastCampaignSentAt,
        });
        continue;
      }

      eligible.push(prospectContactId);
      contactToProspectMap[prospectContactId] = prospect.id;
    }

    return { eligible, ineligible, contactToProspectMap };
  }

  /**
   * Get marketing dashboard metrics
   */
  async getMetrics(userId: string, isPlatformAdmin: boolean) {
    const where: any = isPlatformAdmin ? {} : { createdById: userId };

    // Prospect stats
    const [
      totalProspects,
      activeProspects,
      convertedProspects,
      archivedProspects,
    ] = await Promise.all([
      this.prisma.prospect.count({ where }),
      this.prisma.prospect.count({ where: { ...where, archivedAt: null, convertedAt: null } }),
      this.prisma.prospect.count({ where: { ...where, convertedAt: { not: null } } }),
      this.prisma.prospect.count({ where: { ...where, archivedAt: { not: null } } }),
    ]);

    // Campaign stats
    const [
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      sentCampaigns,
    ] = await Promise.all([
      this.prisma.emailCampaign.count({ where }),
      this.prisma.emailCampaign.count({ where: { ...where, status: 'draft' } }),
      this.prisma.emailCampaign.count({ where: { ...where, status: 'scheduled' } }),
      this.prisma.emailCampaign.count({ where: { ...where, status: 'sent' } }),
    ]);

    // Engagement stats - only from sent campaigns
    const sentCampaignIds = await this.prisma.emailCampaign.findMany({
      where: { ...where, status: 'sent' },
      select: { id: true },
    });

    let avgOpenRate = 0;
    let avgClickRate = 0;
    let avgReplyRate = 0;
    let totalRecipients = 0;

    if (sentCampaignIds.length > 0) {
      const recipients = await this.prisma.emailCampaignRecipient.findMany({
        where: {
          campaignId: { in: sentCampaignIds.map(c => c.id) },
        },
        select: {
          openedAt: true,
          clickedAt: true,
          repliedAt: true,
        },
      });

      totalRecipients = recipients.length;

      if (totalRecipients > 0) {
        const openCount = recipients.filter(r => r.openedAt !== null).length;
        const clickCount = recipients.filter(r => r.clickedAt !== null).length;
        const replyCount = recipients.filter(r => r.repliedAt !== null).length;

        avgOpenRate = (openCount / totalRecipients) * 100;
        avgClickRate = (clickCount / totalRecipients) * 100;
        avgReplyRate = (replyCount / totalRecipients) * 100;
      }
    }

    return {
      prospects: {
        total: totalProspects,
        active: activeProspects,
        converted: convertedProspects,
        archived: archivedProspects,
      },
      campaigns: {
        total: totalCampaigns,
        draft: draftCampaigns,
        scheduled: scheduledCampaigns,
        sent: sentCampaigns,
      },
      engagement: {
        avgOpenRate,
        avgClickRate,
        avgReplyRate,
        totalRecipients,
      },
    };
  }
}
