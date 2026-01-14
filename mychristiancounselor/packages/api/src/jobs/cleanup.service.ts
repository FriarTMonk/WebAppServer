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

  /**
   * Hard delete user accounts that have been marked for deletion for 30+ days
   *
   * GDPR Compliance:
   * - Implements "Right to Erasure" (Article 17)
   * - 30-day grace period allows users to cancel deletion
   * - After 30 days, permanent deletion of all user data
   *
   * HIPAA Compliance:
   * - Ensures PHI is permanently deleted when requested
   * - Cascade delete removes all related data (sessions, notes, etc.)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteExpiredAccounts() {
    this.logger.log('Running expired account cleanup job...');

    try {
      // Calculate 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find users marked for deletion 30+ days ago
      const expiredUsers = await this.prisma.user.findMany({
        where: {
          isActive: false,
          deletionRequestedAt: {
            lte: thirtyDaysAgo,
          },
        },
        select: {
          id: true,
          email: true,
          deletionRequestedAt: true,
        },
      });

      if (expiredUsers.length === 0) {
        this.logger.log('No expired accounts to delete');
        return;
      }

      this.logger.log(`Found ${expiredUsers.length} expired accounts to delete`);

      // Delete each user (cascade delete will handle related data)
      let successCount = 0;
      let errorCount = 0;

      for (const user of expiredUsers) {
        try {
          await this.prisma.user.delete({
            where: { id: user.id },
          });

          this.logger.log(
            `Hard deleted user ${user.email} (requested: ${user.deletionRequestedAt?.toISOString()})`
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to delete user ${user.email}: ${error.message}`
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Account cleanup complete: ${successCount} deleted, ${errorCount} errors`
      );
    } catch (error) {
      this.logger.error('Error during account cleanup job:', error);
    }
  }

  /**
   * Delete expired refresh tokens to prevent table bloat
   *
   * Performance Impact:
   * - Prevents RefreshToken table from growing unbounded
   * - Improves query performance on metrics endpoints that join with RefreshToken
   * - Reduces storage overhead
   *
   * Runs daily at 1 AM to clean up tokens that have expired
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteExpiredRefreshTokens() {
    this.logger.log('Running expired refresh token cleanup job...');

    try {
      const now = new Date();

      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Error during refresh token cleanup job:', error);
    }
  }
}
