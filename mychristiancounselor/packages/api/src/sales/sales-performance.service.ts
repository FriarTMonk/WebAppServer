import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesStage } from '@prisma/client';

interface SalesMetrics {
  pipelineValue: number;
  activeOpportunities: number;
  avgDealSize: number;
  winRate: number;
  avgSalesCycle: number;
  forecastedRevenue: number;
}

interface RepPerformance {
  repId: string;
  repName: string;
  assignedOpportunities: number;
  wonDeals: number;
  lostDeals: number;
  totalRevenue: number;
  avgDealSize: number;
  winRate: number;
  avgSalesCycle: number;
}

@Injectable()
export class SalesPerformanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get overall sales metrics for the platform
   */
  async getSalesMetrics(): Promise<SalesMetrics> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Active opportunities (prospect, qualified, proposal, negotiation)
    const activeOpportunities = await this.prisma.salesOpportunity.count({
      where: {
        stage: {
          in: [
            SalesStage.prospect,
            SalesStage.qualified,
            SalesStage.proposal,
            SalesStage.negotiation,
          ],
        },
      },
    });

    // Pipeline value: Sum of (dealValue × probability) for qualified+ deals
    const pipelineOpps = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: {
          in: [SalesStage.qualified, SalesStage.proposal, SalesStage.negotiation],
        },
      },
      select: {
        dealValue: true,
        probability: true,
      },
    });

    const pipelineValue = pipelineOpps.reduce((sum, opp) => {
      return sum + Number(opp.dealValue) * (opp.probability / 100);
    }, 0);

    // Won deals in last 90 days
    const wonDeals = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: SalesStage.won,
        wonAt: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        dealValue: true,
        createdAt: true,
        wonAt: true,
      },
    });

    // Lost deals in last 90 days
    const lostCount = await this.prisma.salesOpportunity.count({
      where: {
        stage: SalesStage.lost,
        lostAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    // Calculate avg deal size (last 90 days)
    const avgDealSize =
      wonDeals.length > 0
        ? wonDeals.reduce((sum, deal) => sum + Number(deal.dealValue), 0) / wonDeals.length
        : 0;

    // Calculate win rate (last 90 days)
    const totalClosedDeals = wonDeals.length + lostCount;
    const winRate = totalClosedDeals > 0 ? (wonDeals.length / totalClosedDeals) * 100 : 0;

    // Calculate avg sales cycle (last 90 days)
    const salesCycles = wonDeals
      .filter((deal) => deal.wonAt && deal.createdAt)
      .map((deal) => {
        const daysDiff =
          (deal.wonAt!.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff;
      });

    const avgSalesCycle =
      salesCycles.length > 0
        ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length
        : 0;

    // Forecasted revenue: Sum of (dealValue × probability) for deals closing this month
    const forecastOpps = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: {
          in: [SalesStage.qualified, SalesStage.proposal, SalesStage.negotiation],
        },
        estimatedCloseDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      select: {
        dealValue: true,
        probability: true,
      },
    });

    const forecastedRevenue = forecastOpps.reduce((sum, opp) => {
      return sum + Number(opp.dealValue) * (opp.probability / 100);
    }, 0);

    return {
      pipelineValue: Math.round(pipelineValue),
      activeOpportunities,
      avgDealSize: Math.round(avgDealSize),
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
      avgSalesCycle: Math.round(avgSalesCycle),
      forecastedRevenue: Math.round(forecastedRevenue),
    };
  }

  /**
   * Get performance stats for an individual sales rep
   */
  async getRepPerformance(repId: string, days: number = 90): Promise<RepPerformance> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get rep info
    const rep = await this.prisma.user.findUnique({
      where: { id: repId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!rep) {
      throw new Error('Sales rep not found');
    }

    // Get all assigned opportunities
    const assignedOpportunities = await this.prisma.salesOpportunity.count({
      where: {
        assignedToId: repId,
      },
    });

    // Get won deals in period
    const wonDeals = await this.prisma.salesOpportunity.findMany({
      where: {
        assignedToId: repId,
        stage: SalesStage.won,
        wonAt: {
          gte: startDate,
        },
      },
      select: {
        dealValue: true,
        createdAt: true,
        wonAt: true,
      },
    });

    // Get lost deals in period
    const lostDeals = await this.prisma.salesOpportunity.count({
      where: {
        assignedToId: repId,
        stage: SalesStage.lost,
        lostAt: {
          gte: startDate,
        },
      },
    });

    // Calculate total revenue
    const totalRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.dealValue), 0);

    // Calculate avg deal size
    const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

    // Calculate win rate
    const totalClosedDeals = wonDeals.length + lostDeals;
    const winRate = totalClosedDeals > 0 ? (wonDeals.length / totalClosedDeals) * 100 : 0;

    // Calculate avg sales cycle
    const salesCycles = wonDeals
      .filter((deal) => deal.wonAt && deal.createdAt)
      .map((deal) => {
        const daysDiff =
          (deal.wonAt!.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff;
      });

    const avgSalesCycle =
      salesCycles.length > 0
        ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length
        : 0;

    return {
      repId: rep.id,
      repName: `${rep.firstName} ${rep.lastName}`,
      assignedOpportunities,
      wonDeals: wonDeals.length,
      lostDeals,
      totalRevenue: Math.round(totalRevenue),
      avgDealSize: Math.round(avgDealSize),
      winRate: Math.round(winRate * 10) / 10,
      avgSalesCycle: Math.round(avgSalesCycle),
    };
  }
}
