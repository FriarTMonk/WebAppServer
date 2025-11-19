import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiScheduler {
  private readonly logger = new Logger(AiScheduler.name);

  constructor(
    private aiService: AiService,
    private prisma: PrismaService
  ) {}

  /**
   * Weekly batch job: Run historical similarity analysis
   * Runs every Sunday at 2:00 AM
   */
  @Cron('0 2 * * 0', {
    name: 'weeklyHistoricalSimilarity',
    timeZone: 'America/New_York', // Adjust to your timezone
  })
  async runWeeklyHistoricalSimilarity() {
    this.logger.log('Starting scheduled weekly historical similarity job');

    try {
      await this.aiService.processWeeklySimilarityBatch();
      this.logger.log('Weekly historical similarity job completed successfully');
    } catch (error) {
      this.logger.error('Weekly historical similarity job failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Daily cleanup job: Delete expired similarity records
   * Runs every day at 3:00 AM
   */
  @Cron('0 3 * * *', {
    name: 'dailyCleanupExpiredSimilarity',
    timeZone: 'America/New_York', // Adjust to your timezone
  })
  async cleanupExpiredSimilarityRecords() {
    this.logger.log('Starting daily cleanup of expired similarity records');

    try {
      const result = await this.prisma.ticketSimilarity.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(
        `Daily cleanup completed: deleted ${result.count} expired similarity records`
      );
    } catch (error) {
      this.logger.error('Daily cleanup job failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Manual trigger for weekly batch (for testing/emergency runs)
   */
  async triggerWeeklyBatch() {
    this.logger.log('Manually triggered weekly historical similarity batch');
    await this.runWeeklyHistoricalSimilarity();
  }
}
