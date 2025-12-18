import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Session limit configuration
 * Can be moved to environment variables or config service if needed
 */
const DAILY_SESSION_LIMIT_TRIAL = 6; // Trial period: 6 sessions/day (3 hours)
const DAILY_SESSION_LIMIT_FREE = 3; // Post-trial: 3 sessions/day (90 minutes)
const TRIAL_PERIOD_DAYS = 21; // 3 weeks trial period

/**
 * Result of checking session limits
 */
export interface SessionLimitStatus {
  used: number;
  limit: number;
  remaining: number;
  isLimited: boolean;
  resetTime: Date;
  isInTrialPeriod?: boolean; // True if user is in trial period (first 21 days)
  trialDaysRemaining?: number; // Days remaining in trial period
}

/**
 * Service responsible for enforcing daily session limits for free users
 * Follows Single Responsibility Principle - only handles rate limiting logic
 */
@Injectable()
export class SessionLimitService {
  private readonly logger = new Logger(SessionLimitService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get the start of today in UTC
   */
  private getStartOfToday(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Get the start of tomorrow in UTC
   */
  private getStartOfTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Calculate trial period status based on user creation date
   * @param userCreatedAt - User's account creation date
   * @returns Trial status with isInTrialPeriod and daysRemaining
   */
  private calculateTrialStatus(userCreatedAt: Date): { isInTrialPeriod: boolean; daysRemaining: number } {
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const isInTrialPeriod = daysSinceCreation <= TRIAL_PERIOD_DAYS;
    const daysRemaining = Math.max(0, TRIAL_PERIOD_DAYS - daysSinceCreation);

    this.logger.debug(`User created ${daysSinceCreation} days ago. Trial status: ${isInTrialPeriod}, days remaining: ${daysRemaining}`);

    return { isInTrialPeriod, daysRemaining };
  }

  /**
   * Count sessions created today for a user
   * Counts ALL login sessions (Session records) created today
   * Each login session counts against the daily limit
   * @param userId - User ID to check
   * @returns Number of sessions created today
   */
  async countTodaysSessions(userId: string): Promise<number> {
    const startOfToday = this.getStartOfToday();
    const startOfTomorrow = this.getStartOfTomorrow();

    const count = await this.prisma.session.count({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    });

    this.logger.debug(`User ${userId} has created ${count} sessions today`);
    return count;
  }

  /**
   * Check current session limit status for a user
   * @param userId - User ID to check
   * @param hasSubscription - Whether user has an active subscription
   * @returns Session limit status with usage information
   */
  async checkLimit(userId: string, hasSubscription: boolean): Promise<SessionLimitStatus> {
    // Subscribed users have unlimited sessions
    if (hasSubscription) {
      return {
        used: 0,
        limit: -1, // -1 indicates unlimited
        remaining: -1,
        isLimited: false,
        resetTime: this.getStartOfTomorrow(),
      };
    }

    // Fetch user's creation date to calculate trial status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Calculate trial status based on account age
    const { isInTrialPeriod, daysRemaining } = this.calculateTrialStatus(user.createdAt);

    // Use graduated limit: 6 sessions during trial, 3 sessions after
    const limit = isInTrialPeriod ? DAILY_SESSION_LIMIT_TRIAL : DAILY_SESSION_LIMIT_FREE;

    // Count today's sessions for free users
    const used = await this.countTodaysSessions(userId);
    const remaining = Math.max(0, limit - used);

    this.logger.log(`User ${userId} session status: ${used}/${limit} (trial: ${isInTrialPeriod}, days remaining: ${daysRemaining})`);

    return {
      used,
      limit,
      remaining,
      isLimited: used >= limit,
      resetTime: this.getStartOfTomorrow(),
      isInTrialPeriod,
      trialDaysRemaining: daysRemaining,
    };
  }

  /**
   * Enforce session limit - throw exception if limit exceeded
   * @param userId - User ID to check
   * @param hasSubscription - Whether user has an active subscription
   * @throws ForbiddenException if limit is exceeded
   */
  async enforceLimit(userId: string, hasSubscription: boolean): Promise<void> {
    const status = await this.checkLimit(userId, hasSubscription);

    if (status.isLimited) {
      this.logger.warn(`User ${userId} has reached daily session limit (${status.used}/${status.limit})`);
      throw new ForbiddenException({
        message: 'Daily session limit reached',
        limit: status.limit,
        used: status.used,
        resetTime: status.resetTime,
      });
    }

    this.logger.debug(`User ${userId} within session limit (${status.used}/${status.limit})`);
  }
}
