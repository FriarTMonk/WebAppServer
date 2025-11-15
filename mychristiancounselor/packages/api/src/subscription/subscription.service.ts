import { Injectable } from '@nestjs/common';
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
      throw new Error('User not found');
    }

    // Determine limits based on subscription status
    const isSubscribed = user.subscriptionStatus === 'active';

    return {
      subscriptionStatus: user.subscriptionStatus as any,
      subscriptionTier: user.subscriptionTier as any,
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
    // Update user subscription status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
        subscriptionTier: tier,
        subscriptionStart: new Date(),
      },
    });

    // Create subscription record
    return this.prisma.subscription.create({
      data: {
        userId,
        status: 'active',
        tier,
        startDate: new Date(),
      },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionEnd: new Date(),
      },
    });

    // Update most recent active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'canceled', endDate: new Date() },
      });
    }
  }
}
