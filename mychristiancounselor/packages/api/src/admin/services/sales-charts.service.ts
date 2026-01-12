import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface PipelineStageData {
  stage: string;
  count: number;
  value: number;
}

export interface SalesProjectionData {
  data: ChartDataPoint[];
  projectedRevenue: number;
  conversionRate: number;
}

/**
 * Sales Charts Service
 *
 * Provides analytics endpoints for sales pipeline tracking and revenue projections.
 *
 * **Data Models Used:**
 * - `SalesOpportunity`: Sales pipeline tracking with stages, dealValue, probability
 * - `Subscription`: Subscription records (status, startDate)
 * - `User`: User records for conversion tracking
 *
 * **Important Notes:**
 * - SalesOpportunity model has `dealValue` (Decimal) and `probability` (Int) fields
 * - SalesOpportunity.stage is an enum: prospect, qualified, proposal, negotiation, won, lost
 * - Used for calculating pipeline value and projections
 */
@Injectable()
export class SalesChartsService {
  private readonly logger = new Logger(SalesChartsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get sales pipeline stages
   *
   * Retrieves sales opportunities grouped by stage with counts and total values.
   * Uses SalesOpportunity model which has dealValue and stage fields.
   *
   * @param startDate - Optional start date filter (filters by opportunity createdAt)
   * @param endDate - Optional end date filter
   * @returns Array of pipeline stages with counts and aggregate values
   */
  async getPipelineStages(
    startDate?: Date,
    endDate?: Date,
  ): Promise<PipelineStageData[]> {
    try {
      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }

      this.logger.log('Fetching sales pipeline stages');

      const where: Prisma.SalesOpportunityWhereInput = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get opportunities grouped by stage
      const stages = await this.prisma.salesOpportunity.groupBy({
        by: ['stage'],
        where,
        _count: true,
        _sum: {
          dealValue: true,
        },
      });

      return stages.map(stage => ({
        stage: stage.stage,
        count: stage._count,
        value: stage._sum.dealValue ? Number(stage._sum.dealValue) : 0,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch pipeline stages', error.stack);
      throw new InternalServerErrorException('Failed to fetch pipeline stages');
    }
  }

  /**
   * Get sales projections
   *
   * Calculates sales projections based on:
   * - Active subscription trends over time
   * - Weighted pipeline value (dealValue * probability)
   * - Conversion rate from prospects to active subscriptions
   *
   * **Projection Methodology:**
   * - projectedRevenue: Sum of (dealValue * probability/100) for non-won/lost opportunities
   * - conversionRate: Ratio of active subscriptions to total users
   * - data: Trend of active subscriptions by start date
   *
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Sales projection data with trends and metrics
   */
  async getSalesProjections(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SalesProjectionData> {
    try {
      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }

      this.logger.log('Fetching sales projections');

      const whereSubscription: Prisma.SubscriptionWhereInput = {
        status: 'active',
      };

      if (startDate || endDate) {
        whereSubscription.startDate = {};
        if (startDate) whereSubscription.startDate.gte = startDate;
        if (endDate) whereSubscription.startDate.lte = endDate;
      }

      // Get subscription trends
      const subscriptions = await this.prisma.subscription.findMany({
        where: whereSubscription,
        select: {
          startDate: true,
        },
        orderBy: { startDate: 'asc' },
      });

      // Group by date
      const data = this.groupByDate(
        subscriptions.map(s => ({
          date: s.startDate.toISOString().split('T')[0],
          value: 1, // Count subscriptions
        })),
      );

      // Calculate projected revenue from sales opportunities
      // Use probability-weighted deal values for active opportunities
      const whereOpportunity: Prisma.SalesOpportunityWhereInput = {
        stage: {
          notIn: ['won', 'lost'],
        },
      };

      if (startDate || endDate) {
        whereOpportunity.createdAt = {};
        if (startDate) whereOpportunity.createdAt.gte = startDate;
        if (endDate) whereOpportunity.createdAt.lte = endDate;
      }

      const activeOpportunities = await this.prisma.salesOpportunity.findMany({
        where: whereOpportunity,
        select: {
          dealValue: true,
          probability: true,
        },
      });

      // Calculate weighted projected revenue
      const projectedRevenue = activeOpportunities.reduce((sum, opp) => {
        const dealValue = Number(opp.dealValue);
        const probability = opp.probability / 100;
        return sum + (dealValue * probability);
      }, 0);

      // Calculate conversion rate (subscriptions / total users)
      const totalUsers = await this.prisma.user.count();
      const conversionRate = totalUsers > 0 ? (subscriptions.length / totalUsers) * 100 : 0;

      return {
        data,
        projectedRevenue,
        conversionRate,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch sales projections', error.stack);
      throw new InternalServerErrorException('Failed to fetch sales projections');
    }
  }

  /**
   * Helper method to group data points by date
   *
   * Aggregates multiple values for the same date by summing them.
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
