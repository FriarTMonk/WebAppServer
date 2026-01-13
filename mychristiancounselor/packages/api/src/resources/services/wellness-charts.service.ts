import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * NOTE: This service references a WellnessEntry Prisma model that does not yet exist.
 * The model needs to be added to the Prisma schema before these endpoints will function.
 * Expected schema:
 *
 * model WellnessEntry {
 *   id              String   @id @default(uuid())
 *   userId          String
 *   date            DateTime
 *   moodRating      Int?
 *   sleepHours      Float?
 *   exerciseMinutes Int?
 *   createdAt       DateTime @default(now())
 *
 *   user User @relation(fields: [userId], references: [id])
 *   @@index([userId, date])
 * }
 */

// Response interfaces matching frontend expectations
export interface MoodTrendData {
  trend: Array<{ date: string; moodRating: number }>;
  averageMood: number;
}

export interface SleepTrendData {
  trend: Array<{ date: string; sleepHours: number }>;
  averageSleep: number;
}

export interface ExerciseTrendData {
  trend: Array<{ date: string; exerciseMinutes: number }>;
  totalExercise: number;
}

export interface CorrelationData {
  correlation: number;
  interpretation: string;
}

@Injectable()
export class WellnessChartsService {
  private readonly logger = new Logger(WellnessChartsService.name);

  constructor(private prisma: PrismaService) {}

  async getMoodTrend(userId: string, startDate?: Date, endDate?: Date): Promise<MoodTrendData> {
    try {
      this.logger.log(`Fetching mood trend for user ${userId}`);

      // NOTE: WellnessEntry model does not exist in schema yet
      // Returning empty data until model is created
      // TODO: Once WellnessEntry model is added, uncomment the query below
      /*
      const where: any = { userId };

      if (startDate) {
        where.date = { ...where.date, gte: startDate };
      }
      if (endDate) {
        where.date = { ...where.date, lte: endDate };
      }

      const entries = await this.prisma.wellnessEntry.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          moodRating: true,
        },
      });

      const data = entries
        .filter(e => e.moodRating !== null)
        .map(e => ({
          date: e.date.toISOString().split('T')[0],
          value: e.moodRating!,
        }));

      const average = data.length > 0
        ? data.reduce((sum, d) => sum + d.value, 0) / data.length
        : 0;
      */

      // Return empty data structure
      return { trend: [], averageMood: 0 };
    } catch (error) {
      this.logger.error(`Failed to fetch mood trend for user ${userId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch mood trend data');
    }
  }

  async getSleepTrend(userId: string, startDate?: Date, endDate?: Date): Promise<SleepTrendData> {
    try {
      this.logger.log(`Fetching sleep trend for user ${userId}`);

      // NOTE: WellnessEntry model does not exist in schema yet
      // Returning empty data until model is created
      // TODO: Once WellnessEntry model is added, uncomment the query below
      /*
      const where: any = { userId };

      if (startDate) {
        where.date = { ...where.date, gte: startDate };
      }
      if (endDate) {
        where.date = { ...where.date, lte: endDate };
      }

      const entries = await this.prisma.wellnessEntry.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          sleepHours: true,
        },
      });

      const data = entries
        .filter(e => e.sleepHours !== null)
        .map(e => ({
          date: e.date.toISOString().split('T')[0],
          value: e.sleepHours!,
        }));

      const averageHours = data.length > 0
        ? data.reduce((sum, d) => sum + d.value, 0) / data.length
        : 0;
      */

      // Return empty data structure
      return { trend: [], averageSleep: 0 };
    } catch (error) {
      this.logger.error(`Failed to fetch sleep trend for user ${userId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch sleep trend data');
    }
  }

  async getExerciseTrend(userId: string, startDate?: Date, endDate?: Date): Promise<ExerciseTrendData> {
    try {
      this.logger.log(`Fetching exercise trend for user ${userId}`);

      // NOTE: WellnessEntry model does not exist in schema yet
      // Returning empty data until model is created
      // TODO: Once WellnessEntry model is added, uncomment the query below
      /*
      const where: any = { userId };

      if (startDate) {
        where.date = { ...where.date, gte: startDate };
      }
      if (endDate) {
        where.date = { ...where.date, lte: endDate };
      }

      const entries = await this.prisma.wellnessEntry.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          exerciseMinutes: true,
        },
      });

      const data = entries
        .filter(e => e.exerciseMinutes !== null)
        .map(e => ({
          date: e.date.toISOString().split('T')[0],
          value: e.exerciseMinutes!,
        }));

      const totalMinutes = data.reduce((sum, d) => sum + d.value, 0);
      */

      // Return empty data structure
      return { trend: [], totalExercise: 0 };
    } catch (error) {
      this.logger.error(`Failed to fetch exercise trend for user ${userId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch exercise trend data');
    }
  }

  async getCorrelation(
    userId: string,
    metric1: 'mood' | 'sleep' | 'exercise',
    metric2: 'mood' | 'sleep' | 'exercise',
    startDate?: Date,
    endDate?: Date,
  ): Promise<CorrelationData> {
    try {
      this.logger.log(`Fetching correlation between ${metric1} and ${metric2} for user ${userId}`);

      if (metric1 === metric2) {
        throw new BadRequestException('Cannot correlate a metric with itself');
      }

      // NOTE: WellnessEntry model does not exist in schema yet
      // Returning empty data until model is created
      // TODO: Once WellnessEntry model is added, uncomment the query below
      /*
      const where: any = { userId };

      if (startDate) {
        where.date = { ...where.date, gte: startDate };
      }
      if (endDate) {
        where.date = { ...where.date, lte: endDate };
      }

      const entries = await this.prisma.wellnessEntry.findMany({
        where,
        select: {
          moodRating: true,
          sleepHours: true,
          exerciseMinutes: true,
        },
      });

      const getMetricValue = (entry: any, metric: string) => {
        switch (metric) {
          case 'mood': return entry.moodRating;
          case 'sleep': return entry.sleepHours;
          case 'exercise': return entry.exerciseMinutes;
          default: return null;
        }
      };

      const data = entries
        .map(e => ({
          x: getMetricValue(e, metric1),
          y: getMetricValue(e, metric2),
        }))
        .filter(d => d.x !== null && d.y !== null) as Array<{ x: number; y: number }>;

      const correlation = this.calculateCorrelation(
        data.map(d => d.x),
        data.map(d => d.y),
      );
      */

      // Return empty data structure
      return {
        correlation: 0,
        interpretation: 'No data available yet',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to fetch correlation for user ${userId}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch correlation data');
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }
}
