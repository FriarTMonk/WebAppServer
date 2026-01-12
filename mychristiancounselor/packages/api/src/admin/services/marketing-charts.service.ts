import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface CampaignPerformanceData {
  campaignName: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface LeadConversionData {
  stage: string;
  count: number;
  percentage: number;
}

/**
 * Marketing Charts Service
 *
 * Provides analytics endpoints for email campaign performance and lead tracking.
 *
 * **Data Models Used:**
 * - `EmailCampaign`: Campaign metadata (name, sentAt, status)
 * - `EmailCampaignRecipient`: Individual recipient tracking with event timestamps
 *   - Events tracked via nullable DateTime fields: openedAt, clickedAt, bouncedAt
 * - `User`: For lead conversion tracking by subscription status
 *
 * **Lead Conversion Stages:**
 * Since the system doesn't have a dedicated lead status field, this service
 * uses User.subscriptionStatus as a proxy for conversion stages:
 * - "none" = New leads (no subscription)
 * - "active" = Converted leads (active subscription)
 * - Other statuses = Various conversion states
 */
@Injectable()
export class MarketingChartsService {
  private readonly logger = new Logger(MarketingChartsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get campaign performance metrics
   *
   * Retrieves email campaign performance data including open rates, click rates,
   * and bounce rates. Aggregates recipient-level events to calculate metrics.
   *
   * @param startDate - Optional start date filter (filters by campaign sentAt)
   * @param endDate - Optional end date filter
   * @param campaignId - Optional filter for specific campaign
   * @returns Array of campaign performance data with calculated rates
   */
  async getCampaignPerformance(
    startDate?: Date,
    endDate?: Date,
    campaignId?: string,
  ): Promise<CampaignPerformanceData[]> {
    try {
      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }

      this.logger.log('Fetching campaign performance data');

      const where: Prisma.EmailCampaignWhereInput = {
        status: 'sent',
      };

      if (campaignId) {
        where.id = campaignId;
      }

      if (startDate || endDate) {
        where.sentAt = {};
        if (startDate) where.sentAt.gte = startDate;
        if (endDate) where.sentAt.lte = endDate;
      }

      const campaigns = await this.prisma.emailCampaign.findMany({
        where,
        select: {
          id: true,
          name: true,
          sentAt: true,
          recipients: {
            select: {
              openedAt: true,
              clickedAt: true,
              bouncedAt: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      });

      return campaigns.map(campaign => {
        const sent = campaign.recipients.length;
        const opened = campaign.recipients.filter(r => r.openedAt !== null).length;
        const clicked = campaign.recipients.filter(r => r.clickedAt !== null).length;
        const bounced = campaign.recipients.filter(r => r.bouncedAt !== null).length;

        return {
          campaignName: campaign.name,
          sent,
          opened,
          clicked,
          bounced,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
          bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch campaign performance', error.stack);
      throw new InternalServerErrorException('Failed to fetch campaign performance');
    }
  }

  /**
   * Get lead conversion funnel data
   *
   * Analyzes user subscription statuses to track lead conversion.
   * Uses User.subscriptionStatus as a proxy for conversion stages.
   *
   * **Note:** This is a simplified conversion funnel. For more accurate tracking,
   * consider adding a dedicated Lead model with explicit conversion stages.
   *
   * @param startDate - Optional start date filter (filters by user createdAt)
   * @param endDate - Optional end date filter
   * @returns Array of conversion stages with counts and percentages
   */
  async getLeadConversion(
    startDate?: Date,
    endDate?: Date,
  ): Promise<LeadConversionData[]> {
    try {
      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }

      this.logger.log('Fetching lead conversion data');

      const where: Prisma.UserWhereInput = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get all users within date range
      const totalUsers = await this.prisma.user.count({ where });

      if (totalUsers === 0) {
        return [];
      }

      // Count users by subscription status (proxy for conversion stages)
      const stages = await this.prisma.user.groupBy({
        by: ['subscriptionStatus'],
        where,
        _count: true,
      });

      return stages.map(stage => ({
        stage: stage.subscriptionStatus,
        count: stage._count,
        percentage: (stage._count / totalUsers) * 100,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch lead conversion', error.stack);
      throw new InternalServerErrorException('Failed to fetch lead conversion');
    }
  }
}
