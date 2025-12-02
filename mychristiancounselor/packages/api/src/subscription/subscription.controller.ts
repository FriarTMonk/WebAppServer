import { Controller, Post, Get, Request, UseGuards, Body, RawBodyRequest, Req, Headers, BadRequestException, Logger } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('subscriptions')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req) {
    return this.subscriptionService.getSubscriptionStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createSubscription(
    @Request() req,
    @Body() body: { tier?: 'basic' | 'premium' }
  ) {
    return this.subscriptionService.createSubscription(
      req.user.id,
      body.tier || 'basic'
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancelSubscription(@Request() req) {
    await this.subscriptionService.cancelSubscription(req.user.id);
    return { message: 'Subscription canceled' };
  }

  /**
   * Create Stripe Checkout Session
   * Returns URL to redirect user to Stripe Checkout
   * POST /subscriptions/create-checkout-session
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Request() req,
    @Body() body: {
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    return this.subscriptionService.createCheckoutSession(
      req.user.id,
      body.priceId,
      body.successUrl,
      body.cancelUrl
    );
  }

  /**
   * Create Stripe Customer Portal Session
   * Returns URL to redirect user to Stripe Customer Portal
   * POST /subscriptions/create-portal-session
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-portal-session')
  async createPortalSession(
    @Request() req,
    @Body() body: {
      returnUrl: string;
    }
  ) {
    return this.subscriptionService.createPortalSession(
      req.user.id,
      body.returnUrl
    );
  }

  /**
   * Stripe webhook handler
   * Handles subscription lifecycle events and sends appropriate emails
   *
   * IMPORTANT: This endpoint requires raw body parsing for signature verification
   * Make sure your NestJS app is configured to preserve raw body for this route
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // The raw body is needed for signature verification
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Raw body required for webhook signature verification');
      }

      await this.subscriptionService.handleStripeWebhook(rawBody, signature);
      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }
}
