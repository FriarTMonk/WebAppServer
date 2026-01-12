import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface EvaluationCostsData {
  data: ChartDataPoint[];
  totalCost: number;
  averageCostPerBook: number;
  currentMonthCost: number;
}

export interface EmailHealthData {
  bounceRate: number;
  openRate: number;
  clickRate: number;
  trendData: Array<{
    date: string;
    bounces: number;
    opens: number;
    clicks: number;
  }>;
}

export interface UserGrowthData {
  data: ChartDataPoint[];
  totalUsers: number;
  activeUsers: number;
  growthRate: number;
}

export interface RevenueData {
  data: ChartDataPoint[];
  totalRevenue: number;
  activeSubscriptions: number;
  growthRate: number;
}

/**
 * Analytics Charts Service
 *
 * Provides admin-facing analytics for platform monitoring and reporting.
 *
 * **Data Model Notes:**
 * - Uses `EvaluationCostLog` model for actual AI evaluation costs
 * - Uses `EmailCampaign` + `EmailCampaignRecipient` for email metrics
 *   (events tracked as fields: openedAt, clickedAt, bouncedAt)
 * - Uses `User.createdAt` for user growth tracking
 * - Uses `Subscription` model for revenue tracking
 *   (Note: Subscription model doesn't have amount field - uses count-based metrics)
 * - User model doesn't have `lastLoginAt` field - uses RefreshToken activity as proxy
 */
@Injectable()
export class AnalyticsChartsService {
  private readonly logger = new Logger(AnalyticsChartsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get evaluation cost analytics
   *
   * Retrieves AI evaluation costs from the EvaluationCostLog model.
   * Groups costs by date and calculates aggregates.
   *
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Cost analytics with trend data and aggregates
   */
  async getEvaluationCosts(
    startDate?: Date,
    endDate?: Date,
  ): Promise<EvaluationCostsData> {
    try {
      this.logger.log('Fetching evaluation costs analytics');

      const where: Prisma.EvaluationCostLogWhereInput = {};

      if (startDate || endDate) {
        where.evaluatedAt = {};
        if (startDate) where.evaluatedAt.gte = startDate;
        if (endDate) where.evaluatedAt.lte = endDate;
      }

      // Fetch evaluation cost logs
      const costLogs = await this.prisma.evaluationCostLog.findMany({
        where,
        select: {
          evaluatedAt: true,
          totalCost: true,
        },
        orderBy: { evaluatedAt: 'asc' },
      });

      // Group by date
      const data = this.groupByDate(
        costLogs.map(log => ({
          date: log.evaluatedAt.toISOString().split('T')[0],
          value: log.totalCost,
        })),
      );

      const totalCost = costLogs.reduce((sum, log) => sum + log.totalCost, 0);
      const averageCostPerBook = costLogs.length > 0 ? totalCost / costLogs.length : 0;

      // Current month cost
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthCost = costLogs
        .filter(log => log.evaluatedAt >= startOfMonth)
        .reduce((sum, log) => sum + log.totalCost, 0);

      return {
        data,
        totalCost,
        averageCostPerBook,
        currentMonthCost,
      };
    } catch (error) {
      this.logger.error('Failed to fetch evaluation costs', error.stack);
      throw new InternalServerErrorException('Failed to fetch evaluation costs');
    }
  }

  /**
   * Get email health analytics
   *
   * Retrieves email campaign metrics from EmailCampaign and EmailCampaignRecipient models.
   * Calculates bounce, open, and click rates from recipient-level event tracking.
   *
   * **Note:** Events are tracked as nullable DateTime fields on EmailCampaignRecipient:
   * - bouncedAt: Email bounced
   * - openedAt: Email opened
   * - clickedAt: Link clicked
   *
   * @param startDate - Optional start date filter (filters by campaign sentAt)
   * @param endDate - Optional end date filter
   * @returns Email health metrics with rates and trend data
   */
  async getEmailHealth(
    startDate?: Date,
    endDate?: Date,
  ): Promise<EmailHealthData> {
    try {
      this.logger.log('Fetching email health analytics');

      const where: Prisma.EmailCampaignWhereInput = {
        status: 'sent', // Only include sent campaigns
      };

      if (startDate || endDate) {
        where.sentAt = {};
        if (startDate) where.sentAt.gte = startDate;
        if (endDate) where.sentAt.lte = endDate;
      }

      // Get email campaigns with recipients
      const campaigns = await this.prisma.emailCampaign.findMany({
        where,
        select: {
          id: true,
          sentAt: true,
          recipients: {
            select: {
              openedAt: true,
              clickedAt: true,
              bouncedAt: true,
            },
          },
        },
        orderBy: { sentAt: 'asc' },
      });

      if (campaigns.length === 0) {
        return {
          bounceRate: 0,
          openRate: 0,
          clickRate: 0,
          trendData: [],
        };
      }

      // Calculate overall metrics
      let totalRecipients = 0;
      let totalBounces = 0;
      let totalOpens = 0;
      let totalClicks = 0;

      campaigns.forEach(campaign => {
        totalRecipients += campaign.recipients.length;
        totalBounces += campaign.recipients.filter(r => r.bouncedAt !== null).length;
        totalOpens += campaign.recipients.filter(r => r.openedAt !== null).length;
        totalClicks += campaign.recipients.filter(r => r.clickedAt !== null).length;
      });

      const bounceRate = totalRecipients > 0 ? (totalBounces / totalRecipients) * 100 : 0;
      const openRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0;
      const clickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0;

      // Get trend data by campaign date
      const trendData = campaigns.map(c => {
        const recipients = c.recipients;
        return {
          date: c.sentAt!.toISOString().split('T')[0],
          bounces: recipients.filter(r => r.bouncedAt !== null).length,
          opens: recipients.filter(r => r.openedAt !== null).length,
          clicks: recipients.filter(r => r.clickedAt !== null).length,
        };
      });

      return {
        bounceRate,
        openRate,
        clickRate,
        trendData,
      };
    } catch (error) {
      this.logger.error('Failed to fetch email health', error.stack);
      throw new InternalServerErrorException('Failed to fetch email health');
    }
  }

  /**
   * Get user growth analytics
   *
   * Retrieves user registration trends from the User model.
   * Calculates active users based on recent RefreshToken activity (proxy for lastLoginAt).
   *
   * **Note:** User model doesn't have `lastLoginAt` field.
   * Active users are determined by RefreshToken entries within last 30 days.
   *
   * @param startDate - Optional start date filter (filters by user createdAt)
   * @param endDate - Optional end date filter
   * @returns User growth metrics with trend data and aggregates
   */
  async getUserGrowth(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserGrowthData> {
    try {
      this.logger.log('Fetching user growth analytics');

      const where: Prisma.UserWhereInput = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get users grouped by registration date
      const users = await this.prisma.user.findMany({
        where,
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const data = this.groupByDate(
        users.map(u => ({
          date: u.createdAt.toISOString().split('T')[0],
          value: 1,
        })),
      );

      // Total users (all time)
      const totalUsers = await this.prisma.user.count();

      // Active users (based on RefreshToken activity in last 30 days)
      // Using RefreshToken.createdAt as proxy for login activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUserIds = await this.prisma.refreshToken.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      const activeUsers = activeUserIds.length;

      // Calculate growth rate (last 30 days vs previous 30 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [recentUsers, previousUsers] = await Promise.all([
        this.prisma.user.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
      ]);

      const growthRate =
        previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : 0;

      return {
        data,
        totalUsers,
        activeUsers,
        growthRate,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user growth', error.stack);
      throw new InternalServerErrorException('Failed to fetch user growth');
    }
  }

  /**
   * Get revenue analytics
   *
   * Retrieves subscription trends from the Subscription model.
   *
   * **Important Note:** The Subscription model doesn't have an `amount` field.
   * This implementation uses subscription counts as a proxy for revenue metrics.
   * For actual revenue tracking, consider:
   * 1. Adding an `amount` field to the Subscription model
   * 2. Integrating with Stripe for payment data
   * 3. Creating a separate Payment or Invoice model
   *
   * Current implementation tracks:
   * - Subscription growth over time (count-based)
   * - Active subscription count
   * - Growth rate based on subscription counts
   *
   * @param startDate - Optional start date filter (filters by subscription startDate)
   * @param endDate - Optional end date filter
   * @returns Revenue-like metrics based on subscription counts
   */
  async getRevenue(
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueData> {
    try {
      this.logger.log('Fetching revenue analytics');

      const where: Prisma.SubscriptionWhereInput = {
        status: 'active',
      };

      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = startDate;
        if (endDate) where.startDate.lte = endDate;
      }

      // Get active subscriptions
      const subscriptions = await this.prisma.subscription.findMany({
        where,
        select: {
          startDate: true,
        },
        orderBy: { startDate: 'asc' },
      });

      // Group subscription starts by date
      const data = this.groupByDate(
        subscriptions.map(s => ({
          date: s.startDate.toISOString().split('T')[0],
          value: 1, // Count-based since we don't have amount field
        })),
      );

      // Total subscription count (proxy for total revenue)
      const totalRevenue = subscriptions.length;

      // Active subscriptions count
      const activeSubscriptions = await this.prisma.subscription.count({
        where: { status: 'active' },
      });

      // Calculate growth rate
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [recentSubscriptions, previousSubscriptions] = await Promise.all([
        this.prisma.subscription.count({
          where: {
            startDate: { gte: thirtyDaysAgo },
            status: 'active',
          },
        }),
        this.prisma.subscription.count({
          where: {
            startDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            status: 'active',
          },
        }),
      ]);

      const growthRate =
        previousSubscriptions > 0
          ? ((recentSubscriptions - previousSubscriptions) / previousSubscriptions) * 100
          : 0;

      return {
        data,
        totalRevenue,
        activeSubscriptions,
        growthRate,
      };
    } catch (error) {
      this.logger.error('Failed to fetch revenue', error.stack);
      throw new InternalServerErrorException('Failed to fetch revenue');
    }
  }

  /**
   * Helper method to group data points by date
   *
   * Aggregates multiple values for the same date by summing them.
   * Useful for combining multiple events on the same day.
   *
   * @param items - Array of date/value pairs
   * @returns Aggregated and sorted chart data points
   */
  private groupByDate(items: Array<{ date: string; value: number }>): ChartDataPoint[] {
    const grouped = new Map<string, number>();

    items.forEach(item => {
      const existing = grouped.get(item.date) || 0;
      grouped.set(item.date, existing + item.value);
    });

    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
