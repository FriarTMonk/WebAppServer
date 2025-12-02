import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import Stripe from 'stripe';

/**
 * Subscription features that can be checked for access
 */
export enum SubscriptionFeature {
  /** Access to session history and persistence */
  HISTORY_ACCESS = 'HISTORY_ACCESS',
  /** Ability to create and view session notes */
  NOTE_ACCESS = 'NOTE_ACCESS',
  /** Ability to share sessions with others */
  SHARING_ACCESS = 'SHARING_ACCESS',
  /** Ability to archive sessions */
  ARCHIVE_ACCESS = 'ARCHIVE_ACCESS',
  /** Ability to export session data */
  EXPORT_ACCESS = 'EXPORT_ACCESS',
  /** Access to clarifying questions feature */
  CLARIFYING_QUESTIONS = 'CLARIFYING_QUESTIONS',
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe integration disabled');
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
      });
    }
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

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

    // Fetch user with subscription info and organization memberships
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionTier: true,
        organizationMemberships: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Determine limits based on subscription status
    // User is considered subscribed if:
    // 1. They have an active individual subscription, OR
    // 2. They are a member of any organization
    const hasIndividualSubscription = user.subscriptionStatus === 'active';
    const isOrganizationMember = user.organizationMemberships.length > 0;
    const isSubscribed = hasIndividualSubscription || isOrganizationMember;

    return {
      subscriptionStatus: user.subscriptionStatus as 'none' | 'active' | 'canceled' | 'past_due',
      subscriptionTier: user.subscriptionTier as 'basic' | 'premium' | undefined,
      maxClarifyingQuestions: isSubscribed ? 9 : 3,
      hasHistoryAccess: isSubscribed,
      hasSharingAccess: isSubscribed,
      hasArchiveAccess: isSubscribed,
    };
  }

  // ============================================================================
  // CENTRALIZED FEATURE ACCESS HELPERS
  // ============================================================================

  /**
   * Check if user can access a specific feature
   * Returns true if allowed, false otherwise
   */
  async canAccessFeature(
    userId: string | undefined | null,
    feature: SubscriptionFeature
  ): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);

    switch (feature) {
      case SubscriptionFeature.HISTORY_ACCESS:
        return status.hasHistoryAccess;
      case SubscriptionFeature.NOTE_ACCESS:
        return status.hasHistoryAccess; // Notes require history access
      case SubscriptionFeature.SHARING_ACCESS:
        return status.hasSharingAccess;
      case SubscriptionFeature.ARCHIVE_ACCESS:
        return status.hasArchiveAccess;
      case SubscriptionFeature.EXPORT_ACCESS:
        return status.hasHistoryAccess; // Export requires history access
      case SubscriptionFeature.CLARIFYING_QUESTIONS:
        return status.maxClarifyingQuestions > 0;
      default:
        return false;
    }
  }

  /**
   * Require that user has access to a specific feature
   * Throws ForbiddenException if user doesn't have access
   */
  async requireFeature(
    userId: string | undefined | null,
    feature: SubscriptionFeature,
    customMessage?: string
  ): Promise<void> {
    const hasAccess = await this.canAccessFeature(userId, feature);

    if (!hasAccess) {
      const defaultMessages: Record<SubscriptionFeature, string> = {
        [SubscriptionFeature.HISTORY_ACCESS]: 'Session history is only available to subscribed users',
        [SubscriptionFeature.NOTE_ACCESS]: 'Session notes are only available to subscribed users',
        [SubscriptionFeature.SHARING_ACCESS]: 'Session sharing is only available to subscribed users',
        [SubscriptionFeature.ARCHIVE_ACCESS]: 'Session archiving is only available to subscribed users',
        [SubscriptionFeature.EXPORT_ACCESS]: 'Session export is only available to subscribed users',
        [SubscriptionFeature.CLARIFYING_QUESTIONS]: 'Clarifying questions require an active subscription',
      };

      throw new ForbiddenException(customMessage || defaultMessages[feature]);
    }
  }

  /**
   * Convenience method: Require history access
   * Throws ForbiddenException if user doesn't have history access
   */
  async requireHistoryAccess(userId: string | undefined | null): Promise<void> {
    await this.requireFeature(userId, SubscriptionFeature.HISTORY_ACCESS);
  }

  /**
   * Convenience method: Require note access
   * Throws ForbiddenException if user doesn't have note access
   */
  async requireNoteAccess(userId: string | undefined | null): Promise<void> {
    await this.requireFeature(userId, SubscriptionFeature.NOTE_ACCESS);
  }

  /**
   * Convenience method: Require sharing access
   * Throws ForbiddenException if user doesn't have sharing access
   */
  async requireSharingAccess(userId: string | undefined | null): Promise<void> {
    await this.requireFeature(userId, SubscriptionFeature.SHARING_ACCESS);
  }

  /**
   * Convenience method: Require export access
   * Throws ForbiddenException if user doesn't have export access
   */
  async requireExportAccess(userId: string | undefined | null): Promise<void> {
    await this.requireFeature(userId, SubscriptionFeature.EXPORT_ACCESS);
  }

  /**
   * Get max clarifying questions for user
   * Returns the number of clarifying questions allowed
   */
  async getMaxClarifyingQuestions(userId: string | undefined | null): Promise<number> {
    const status = await this.getSubscriptionStatus(userId);
    return status.maxClarifyingQuestions;
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

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

  /**
   * Handle Stripe webhook events
   * Verifies signature and processes subscription lifecycle events
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      this.logger.error('No userId in subscription metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return;
    }

    // Determine plan based on price
    const priceId = subscription.items.data[0]?.price.id;
    const monthlyPriceId = this.configService.get('STRIPE_MONTHLY_PRICE_ID');
    const annualPriceId = this.configService.get('STRIPE_ANNUAL_PRICE_ID');
    const amount = priceId === monthlyPriceId ? 9.99 : 99;

    // Update user subscription status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
        subscriptionTier: 'basic',
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
      },
    });

    // Send welcome email
    await this.emailService.sendBillingEmail(
      user.email,
      {
        recipientName: user.firstName || undefined,
        emailSubType: 'subscription_started',
        amount,
        currency: 'USD',
        nextBillingDate: new Date(subscription.current_period_end * 1000),
      },
      userId,
    );

    this.logger.log(`Subscription created for user ${userId}`);
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
    if (!userId) {
      this.logger.warn('No userId in invoice metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return;
    }

    // Send payment confirmation email
    await this.emailService.sendBillingEmail(
      user.email,
      {
        recipientName: user.firstName || undefined,
        emailSubType: 'payment_succeeded',
        amount: invoice.amount_paid / 100, // Stripe amounts are in cents
        currency: invoice.currency.toUpperCase(),
        nextBillingDate: invoice.lines.data[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000)
          : undefined,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
      },
      userId,
    );

    this.logger.log(`Payment succeeded for user ${userId}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
    if (!userId) {
      this.logger.warn('No userId in invoice metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return;
    }

    // Update subscription status to past_due
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    // Send payment failed notification
    await this.emailService.sendBillingEmail(
      user.email,
      {
        recipientName: user.firstName || undefined,
        emailSubType: 'payment_failed',
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        gracePeriodDays: 7,
        updatePaymentUrl: `${this.configService.get('WEB_APP_URL')}/settings/billing`,
      },
      userId,
    );

    this.logger.warn(`Payment failed for user ${userId}`);
  }

  /**
   * Handle subscription deletion/cancellation
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      this.logger.error('No userId in subscription metadata');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return;
    }

    // Update user subscription status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionEnd: new Date(),
      },
    });

    // Send cancellation confirmation
    await this.emailService.sendBillingEmail(
      user.email,
      {
        recipientName: user.firstName || undefined,
        emailSubType: 'subscription_cancelled',
        nextBillingDate: new Date(subscription.current_period_end * 1000),
      },
      userId,
    );

    this.logger.log(`Subscription cancelled for user ${userId}`);
  }

  /**
   * Handle subscription updates
   * Used to send renewal reminders before the next billing date
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      return;
    }

    // Calculate days until renewal
    const renewalDate = new Date(subscription.current_period_end * 1000);
    const daysUntilRenewal = Math.ceil(
      (renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send renewal reminder if 3 days before renewal
    if (daysUntilRenewal === 3 && subscription.status === 'active') {
      const priceId = subscription.items.data[0]?.price.id;
      const monthlyPriceId = this.configService.get('STRIPE_MONTHLY_PRICE_ID');
      const amount = priceId === monthlyPriceId ? 9.99 : 99;

      await this.emailService.sendBillingEmail(
        user.email,
        {
          recipientName: user.firstName || undefined,
          emailSubType: 'renewal_reminder',
          amount,
          currency: 'USD',
          renewalDate,
        },
        userId,
      );

      this.logger.log(`Renewal reminder sent to user ${userId}`);
    }
  }

  /**
   * Create Stripe Checkout Session for new subscription
   * Returns checkout session URL for frontend to redirect to
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create or retrieve Stripe customer
    let customerId: string;

    // Check if user already has a Stripe customer ID
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (existingUser?.stripeCustomerId) {
      customerId = existingUser.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
    });

    this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Create Stripe Customer Portal Session
   * Allows users to manage their subscription (update payment, cancel, etc.)
   */
  async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // Get user's Stripe customer ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer account');
    }

    // Create portal session
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    this.logger.log(`Portal session created for user ${userId}`);

    return {
      url: session.url,
    };
  }

  /**
   * Suspend an active individual subscription (when user joins an organization)
   * Pauses billing but preserves remaining subscription time
   * Does NOT cancel in Stripe - just marks as suspended in our system
   */
  async suspendSubscription(userId: string, reason = 'joined_organization'): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Only suspend if user has an active subscription
    if (user.subscriptionStatus !== 'active') {
      this.logger.log(`User ${userId} has no active subscription to suspend`);
      return;
    }

    if (!user.stripeSubscriptionId) {
      this.logger.warn(`User ${userId} has active status but no Stripe subscription ID`);
      return;
    }

    // Pause the subscription in Stripe (billing stops, but subscription preserved)
    if (this.stripe) {
      try {
        await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'keep_as_draft', // Keep subscription but don't charge
          },
          metadata: {
            suspended_reason: reason,
            suspended_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        this.logger.error(`Failed to pause Stripe subscription for user ${userId}:`, err);
      }
    }

    // Update user subscription status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'suspended', // New status for suspended subs
      },
    });

    this.logger.log(`Subscription suspended for user ${userId}: ${reason}`);
  }

  /**
   * Reactivate a suspended subscription (when user leaves an organization)
   * Resumes billing from where it left off
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Only reactivate if user has a suspended subscription
    if (user.subscriptionStatus !== 'suspended') {
      this.logger.log(`User ${userId} has no suspended subscription to reactivate`);
      return;
    }

    if (!user.stripeSubscriptionId) {
      this.logger.warn(`User ${userId} has suspended status but no Stripe subscription ID`);
      return;
    }

    // Resume the subscription in Stripe
    if (this.stripe) {
      try {
        await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
          pause_collection: null, // Remove pause, resume billing
        });
      } catch (err) {
        this.logger.error(`Failed to resume Stripe subscription for user ${userId}:`, err);
      }
    }

    // Update user subscription status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
      },
    });

    this.logger.log(`Subscription reactivated for user ${userId}`);
  }
}
