import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's subscription status and access limits
   */
  async getSubscriptionStatus(userId: string | undefined | null): Promise<SubscriptionStatusDto> {
    // Anonymous user (no userId)
    if (!userId) {
      return {
        subscriptionStatus: 'none',
        maxClarifyingQuestions: 0,
        hasHistoryAccess: false,
        hasSharingAccess: false,
        hasArchiveAccess: false,
      };
    }

    // Fetch user with subscription info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Determine limits based on subscription status
    const isSubscribed = user.subscriptionStatus === 'active';

    return {
      subscriptionStatus: user.subscriptionStatus as 'none' | 'active' | 'canceled' | 'past_due',
      subscriptionTier: user.subscriptionTier as 'basic' | 'premium' | undefined,
      maxClarifyingQuestions: isSubscribed ? 9 : 3,
      hasHistoryAccess: isSubscribed,
      hasSharingAccess: isSubscribed,
      hasArchiveAccess: isSubscribed,
    };
  }

  /**
   * Create or update subscription for a user (manual for now, Stripe later)
   */
  async createSubscription(userId: string, tier: 'basic' | 'premium' = 'basic') {
    return this.prisma.$transaction(async (tx) => {
      // Update user subscription status
      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'active',
          subscriptionTier: tier,
          subscriptionStart: new Date(),
        },
      });

      // Create subscription record
      return tx.subscription.create({
        data: {
          userId,
          status: 'active',
          tier,
          startDate: new Date(),
        },
      });
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionEnd: new Date(),
        },
      });

      // Update most recent active subscription
      const subscription = await tx.subscription.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'canceled', endDate: new Date() },
        });
      }
    });
  }
}
