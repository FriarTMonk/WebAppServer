import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTrackingService } from './email-tracking.service';
import { EmailRateLimitService } from './email-rate-limit.service';
import { BillingCronService } from './billing-cron.service';
import { EmailMetricsService } from './email-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Email module - provides email sending capabilities
 * Includes Postmark integration, rate limiting, tracking, templates, metrics, and billing cron jobs
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    EmailService,
    EmailTemplatesService,
    EmailTrackingService,
    EmailRateLimitService,
    EmailMetricsService,
    BillingCronService,
  ],
  exports: [
    EmailService,
    EmailTemplatesService,
    EmailTrackingService,
    EmailRateLimitService,
    EmailMetricsService,
  ],
})
export class EmailModule {}
