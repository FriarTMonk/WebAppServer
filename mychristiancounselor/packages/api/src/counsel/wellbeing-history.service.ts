import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WellbeingStatus, WellbeingTrajectory } from '@prisma/client';

export interface RecordStatusChangeDto {
  memberId: string;
  status: WellbeingStatus;
  summary: string;
  trajectory?: WellbeingTrajectory;
  overriddenBy?: string;
}

export interface GetHistoryOptions {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class WellbeingHistoryService {
  private readonly logger = new Logger(WellbeingHistoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a wellbeing status change to history
   */
  async recordStatusChange(dto: RecordStatusChangeDto) {
    this.logger.log(
      `Recording status change for member ${dto.memberId}: ${dto.status}`,
    );

    return this.prisma.memberWellbeingHistory.create({
      data: {
        memberId: dto.memberId,
        status: dto.status,
        summary: dto.summary,
        trajectory: dto.trajectory,
        overriddenBy: dto.overriddenBy,
      },
    });
  }

  /**
   * Get wellbeing history for a member
   */
  async getHistory(memberId: string, options: GetHistoryOptions = {}) {
    const { limit = 10, startDate, endDate } = options;

    this.logger.log(
      `Retrieving history for member ${memberId} (limit: ${limit})`,
    );

    return this.prisma.memberWellbeingHistory.findMany({
      where: {
        memberId,
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recent history for trajectory calculation
   */
  async getRecentHistory(memberId: string, count: number = 3) {
    this.logger.log(
      `Retrieving recent ${count} history entries for member ${memberId}`,
    );

    return this.prisma.memberWellbeingHistory.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
  }

  /**
   * Convert wellbeing history to CSV format
   * @param memberId - The member's ID
   * @param options - Optional filters (startDate, endDate)
   * @returns CSV string
   */
  async convertToCSV(
    memberId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<string> {
    this.logger.log(`Converting wellbeing history to CSV for member ${memberId}`);

    // Fetch history data
    const history = await this.getHistory(memberId, options);

    // CSV header
    const header = 'Date,Overall Score,Anxiety,Depression,Stress,Notes\n';

    // CSV rows
    const rows = history.map((entry) => {
      const date = new Date(entry.date).toISOString().split('T')[0]; // YYYY-MM-DD
      const overallScore = entry.overallScore ?? '';
      const anxiety = entry.anxietyScore ?? '';
      const depression = entry.depressionScore ?? '';
      const stress = entry.stressScore ?? '';
      const notes = (entry.notes || '').replace(/"/g, '""'); // Escape quotes
      return `${date},"${overallScore}","${anxiety}","${depression}","${stress}","${notes}"`;
    }).join('\n');

    return header + rows;
  }
}
