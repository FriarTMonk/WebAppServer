import { Controller, Post, Get, Request, UseGuards, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscriptions')
export class SubscriptionController {
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
}
