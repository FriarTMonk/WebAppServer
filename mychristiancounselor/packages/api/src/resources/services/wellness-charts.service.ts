import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface MoodTrendData {
  data: ChartDataPoint[];
  average: number;
}

export interface SleepTrendData {
  data: ChartDataPoint[];
  averageHours: number;
}

export interface ExerciseTrendData {
  data: ChartDataPoint[];
  totalMinutes: number;
}

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  data: Array<{ x: number; y: number }>;
}

@Injectable()
export class WellnessChartsService {
  constructor(private prisma: PrismaService) {}

  async getMoodTrend(userId: string, startDate?: Date, endDate?: Date): Promise<MoodTrendData> {
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

    return { data, average };
  }

  async getSleepTrend(userId: string, startDate?: Date, endDate?: Date): Promise<SleepTrendData> {
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

    return { data, averageHours };
  }

  async getExerciseTrend(userId: string, startDate?: Date, endDate?: Date): Promise<ExerciseTrendData> {
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

    return { data, totalMinutes };
  }

  async getCorrelation(
    userId: string,
    metric1: 'mood' | 'sleep' | 'exercise',
    metric2: 'mood' | 'sleep' | 'exercise',
    startDate?: Date,
    endDate?: Date,
  ): Promise<CorrelationData> {
    if (metric1 === metric2) {
      throw new Error('Cannot correlate a metric with itself');
    }

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

    return {
      metric1,
      metric2,
      correlation,
      data,
    };
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
