import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CostAnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  frameworkVersion?: string;
}

export interface CostAnalyticsResult {
  totalCost: number;
  totalEvaluations: number;
  averageCostPerBook: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costByModel: {
    modelUsed: string;
    count: number;
    totalCost: number;
    averageCost: number;
  }[];
  costByFramework: {
    frameworkVersion: string;
    count: number;
    totalCost: number;
    averageCost: number;
  }[];
  mostExpensiveBooks: {
    bookId: string;
    title?: string;
    author?: string;
    totalCost: number;
    evaluatedAt: Date;
  }[];
  dailyCostTrend: {
    date: string;
    cost: number;
    count: number;
  }[];
}

@Injectable()
export class CostAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(query: CostAnalyticsQuery = {}): Promise<CostAnalyticsResult> {
    const { startDate, endDate, frameworkVersion } = query;

    // Build where clause
    const where: any = {};
    if (startDate || endDate) {
      where.evaluatedAt = {};
      if (startDate) where.evaluatedAt.gte = startDate;
      if (endDate) where.evaluatedAt.lte = endDate;
    }
    if (frameworkVersion) {
      where.frameworkVersion = frameworkVersion;
    }

    // Get all cost logs for the period
    const costLogs = await this.prisma.evaluationCostLog.findMany({
      where,
      include: {
        book: {
          select: {
            title: true,
            author: true,
          },
        },
      },
      orderBy: { evaluatedAt: 'desc' },
    });

    // Calculate aggregate metrics
    const totalCost = costLogs.reduce((sum, log) => sum + log.totalCost, 0);
    const totalEvaluations = costLogs.length;
    const averageCostPerBook = totalEvaluations > 0 ? totalCost / totalEvaluations : 0;
    const totalInputTokens = costLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalOutputTokens = costLogs.reduce((sum, log) => sum + log.outputTokens, 0);

    // Group by model
    const modelGroups = new Map<string, { count: number; totalCost: number }>();
    costLogs.forEach((log) => {
      const existing = modelGroups.get(log.modelUsed) || { count: 0, totalCost: 0 };
      modelGroups.set(log.modelUsed, {
        count: existing.count + 1,
        totalCost: existing.totalCost + log.totalCost,
      });
    });

    const costByModel = Array.from(modelGroups.entries()).map(([modelUsed, data]) => ({
      modelUsed,
      count: data.count,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.count,
    }));

    // Group by framework
    const frameworkGroups = new Map<string, { count: number; totalCost: number }>();
    costLogs.forEach((log) => {
      const existing = frameworkGroups.get(log.frameworkVersion) || { count: 0, totalCost: 0 };
      frameworkGroups.set(log.frameworkVersion, {
        count: existing.count + 1,
        totalCost: existing.totalCost + log.totalCost,
      });
    });

    const costByFramework = Array.from(frameworkGroups.entries()).map(([frameworkVersion, data]) => ({
      frameworkVersion,
      count: data.count,
      totalCost: data.totalCost,
      averageCost: data.totalCost / data.count,
    }));

    // Most expensive books (top 10)
    const mostExpensiveBooks = costLogs
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map((log) => ({
        bookId: log.bookId,
        title: log.book?.title,
        author: log.book?.author,
        totalCost: log.totalCost,
        evaluatedAt: log.evaluatedAt,
      }));

    // Daily cost trend (last 30 days or query period)
    const dailyGroups = new Map<string, { cost: number; count: number }>();
    costLogs.forEach((log) => {
      const date = log.evaluatedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = dailyGroups.get(date) || { cost: 0, count: 0 };
      dailyGroups.set(date, {
        cost: existing.cost + log.totalCost,
        count: existing.count + 1,
      });
    });

    const dailyCostTrend = Array.from(dailyGroups.entries())
      .map(([date, data]) => ({
        date,
        cost: data.cost,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCost,
      totalEvaluations,
      averageCostPerBook,
      totalInputTokens,
      totalOutputTokens,
      costByModel,
      costByFramework,
      mostExpensiveBooks,
      dailyCostTrend,
    };
  }
}
