import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deleteExpiredSessions() {
    this.logger.log('Running expired session cleanup job...');

    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          status: 'archived',
          deletedAt: {
            lte: new Date(),
          },
        },
      });

      this.logger.log(`Deleted ${result.count} expired archived sessions`);
    } catch (error) {
      this.logger.error('Error during cleanup job:', error);
    }
  }
}
