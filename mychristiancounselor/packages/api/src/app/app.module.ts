import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { AdminModule } from '../admin/admin.module';
import { OrgAdminModule } from '../org-admin/org-admin.module';
import { ProfileModule } from '../profile/profile.module';
import { ShareModule } from '../share/share.module';
import { SupportModule } from '../support/support.module';
import { AiModule } from '../ai/ai.module';
import { SlaModule } from '../sla/sla.module';
import { HolidayModule } from '../holiday/holiday.module';
import { HealthModule } from '../health/health.module';
import { MetricsModule } from '../metrics/metrics.module';
import { MetricsMiddleware } from '../metrics/metrics.middleware';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SalesModule } from '../sales/sales.module';
import { MarketingModule } from '../marketing/marketing.module';
import { ContentModule } from '../content/content.module';
import { BookModule } from '../book/book.module';
import { ResourcesModule } from '../resources/resources.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { configValidationSchema } from '../config/config.validation';
import { winstonConfig } from '../common/logging/winston.config';
import { getBullModuleOptions } from '../config/queue.config';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ScheduleModule.forRoot(),
    // BullMQ job queue
    BullModule.forRoot(getBullModuleOptions()),
    // Rate limiting: Temporarily high limits for development
    // TODO: Restore to 100/10 for production deployment
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 1000, // High limit for dev to prevent throttle during hot-reload
      },
      {
        name: 'strict', // Stricter limit for auth endpoints
        ttl: 60000,
        limit: 100, // High limit for dev
      },
    ]),
    // Winston logging
    WinstonModule.forRoot(winstonConfig),
    EventsModule,
    PrismaModule,
    MetricsModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    CounselModule,
    AdminModule,
    OrgAdminModule,
    ProfileModule,
    ShareModule,
    SupportModule,
    AiModule,
    SlaModule,
    HolidayModule,
    WebhooksModule,
    SalesModule,
    MarketingModule,
    ContentModule,
    BookModule,
    ResourcesModule,
    WorkflowModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfGuard, // CSRF protection (validates origin/referer)
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Authentication (JWT validation)
    },
    // Temporarily disabled for development - re-enable for production!
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard, // Rate limiting (prevent abuse)
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
