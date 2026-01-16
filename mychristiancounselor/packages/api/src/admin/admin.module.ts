import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminStatusController } from './admin-status.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SalesModule } from '../sales/sales.module';
import { MarketingModule } from '../marketing/marketing.module';
import { MorphAuditMiddleware } from './middleware/morph-audit.middleware';
import { queueConfig } from '../config/queue.config';
import { EvaluationFrameworkService } from './services/evaluation-framework.service';
import { QueueMonitoringService } from './services/queue-monitoring.service';
import { CostAnalyticsService } from './services/cost-analytics.service';
import { BulkReEvaluationService } from './services/bulk-re-evaluation.service';
import { AnalyticsChartsService } from './services/analytics-charts.service';
import { MarketingChartsService } from './services/marketing-charts.service';
import { SalesChartsService } from './services/sales-charts.service';
import { SecurityStatsService } from './services/security-stats.service';
import { SecurityStatsController } from './controllers/security-stats.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EmailModule,
    SubscriptionModule,
    SalesModule,
    MarketingModule,
    BullModule.registerQueue({
      name: queueConfig.evaluationQueue.name,
    }),
  ],
  providers: [
    AdminService,
    EvaluationFrameworkService,
    QueueMonitoringService,
    CostAnalyticsService,
    BulkReEvaluationService,
    AnalyticsChartsService,
    MarketingChartsService,
    SalesChartsService,
    SecurityStatsService,
    MorphAuditMiddleware,
  ],
  controllers: [AdminController, AdminStatusController, SecurityStatsController],
  exports: [AdminService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply morph audit middleware to all routes
    // It will only log when user is morphed
    consumer.apply(MorphAuditMiddleware).forRoutes('*');
  }
}
