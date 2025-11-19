import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitResult } from './interfaces/email-config.interface';

/**
 * Service for rate limiting email operations
 * Prevents abuse of verification resend and password reset features
 * Implements dual-layer protection (IP + email address)
 */
@Injectable()
export class EmailRateLimitService {
  constructor(private prisma: PrismaService) {}

  // Rate limit configurations
  private readonly LIMITS = {
    verification_resend: {
      email: { count: 1, windowMinutes: 60 }, // 1 per hour per email
      ip: { count: 5, windowMinutes: 60 }, // 5 per hour per IP
    },
    password_reset: {
      email: { count: 3, windowMinutes: 60 }, // 3 per hour per email
      ip: { count: 10, windowMinutes: 60 }, // 10 per hour per IP
    },
  };

  /**
   * Check if an operation is rate limited (checks both email and IP)
   * Returns allowed: false if EITHER email OR IP is rate limited
   */
  async checkRateLimit(
    email: string,
    ipAddress: string,
    operation: 'verification_resend' | 'password_reset',
  ): Promise<RateLimitResult> {
    const limits = this.LIMITS[operation];

    // Check email rate limit
    const emailCheck = await this.checkSingleRateLimit(email, 'email', operation, limits.email);
    if (!emailCheck.allowed) {
      return emailCheck;
    }

    // Check IP rate limit
    const ipCheck = await this.checkSingleRateLimit(ipAddress, 'ip', operation, limits.ip);
    if (!ipCheck.allowed) {
      return ipCheck;
    }

    return { allowed: true };
  }

  /**
   * Check rate limit for a single identifier (email or IP)
   */
  private async checkSingleRateLimit(
    identifier: string,
    identifierType: 'email' | 'ip',
    operation: string,
    limit: { count: number; windowMinutes: number },
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - limit.windowMinutes * 60 * 1000);

    // Find or create rate limit record
    const existing = await this.prisma.emailRateLimit.findUnique({
      where: {
        identifier_identifierType_operation: {
          identifier: identifier.toLowerCase(),
          identifierType,
          operation,
        },
      },
    });

    // If no existing record, operation is allowed
    if (!existing) {
      return { allowed: true };
    }

    // If existing record has expired, operation is allowed
    if (existing.expiresAt < now) {
      // Clean up expired record
      await this.prisma.emailRateLimit.delete({
        where: { id: existing.id },
      });
      return { allowed: true };
    }

    // Check if within rate limit
    if (existing.attemptCount >= limit.count) {
      const retryAfter = Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        retryAfter,
        currentCount: existing.attemptCount,
        limit: limit.count,
      };
    }

    return { allowed: true, currentCount: existing.attemptCount, limit: limit.count };
  }

  /**
   * Increment rate limit counter for an operation
   * Call this AFTER checking rate limit and confirming operation is allowed
   */
  async incrementRateLimit(
    email: string,
    ipAddress: string,
    operation: 'verification_resend' | 'password_reset',
  ): Promise<void> {
    const limits = this.LIMITS[operation];
    const now = new Date();

    // Increment email counter
    await this.incrementSingleCounter(email, 'email', operation, limits.email.windowMinutes);

    // Increment IP counter
    await this.incrementSingleCounter(ipAddress, 'ip', operation, limits.ip.windowMinutes);
  }

  /**
   * Increment counter for a single identifier
   */
  private async incrementSingleCounter(
    identifier: string,
    identifierType: 'email' | 'ip',
    operation: string,
    windowMinutes: number,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

    await this.prisma.emailRateLimit.upsert({
      where: {
        identifier_identifierType_operation: {
          identifier: identifier.toLowerCase(),
          identifierType,
          operation,
        },
      },
      update: {
        attemptCount: { increment: 1 },
      },
      create: {
        identifier: identifier.toLowerCase(),
        identifierType,
        operation,
        attemptCount: 1,
        windowStart: now,
        expiresAt,
      },
    });
  }

  /**
   * Clean up expired rate limit records (run periodically)
   */
  async cleanupExpiredRecords(): Promise<number> {
    const result = await this.prisma.emailRateLimit.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  /**
   * Reset rate limit for a specific user/IP (admin action)
   */
  async resetRateLimit(
    identifier: string,
    identifierType: 'email' | 'ip',
    operation: 'verification_resend' | 'password_reset',
  ): Promise<void> {
    await this.prisma.emailRateLimit.deleteMany({
      where: {
        identifier: identifier.toLowerCase(),
        identifierType,
        operation,
      },
    });
  }

  /**
   * Get rate limit status for admin dashboard
   */
  async getRateLimitStatus(email: string, ipAddress: string) {
    const [verificationEmail, verificationIp, passwordResetEmail, passwordResetIp] = await Promise.all([
      this.getSingleStatus(email, 'email', 'verification_resend'),
      this.getSingleStatus(ipAddress, 'ip', 'verification_resend'),
      this.getSingleStatus(email, 'email', 'password_reset'),
      this.getSingleStatus(ipAddress, 'ip', 'password_reset'),
    ]);

    return {
      verificationResend: {
        email: verificationEmail,
        ip: verificationIp,
      },
      passwordReset: {
        email: passwordResetEmail,
        ip: passwordResetIp,
      },
    };
  }

  /**
   * Get status for a single rate limit record
   */
  private async getSingleStatus(identifier: string, identifierType: 'email' | 'ip', operation: string) {
    const record = await this.prisma.emailRateLimit.findUnique({
      where: {
        identifier_identifierType_operation: {
          identifier: identifier.toLowerCase(),
          identifierType,
          operation,
        },
      },
    });

    if (!record || record.expiresAt < new Date()) {
      return { limited: false, attempts: 0 };
    }

    const limit = this.LIMITS[operation as keyof typeof this.LIMITS][identifierType].count;

    return {
      limited: record.attemptCount >= limit,
      attempts: record.attemptCount,
      limit,
      expiresAt: record.expiresAt,
    };
  }
}
