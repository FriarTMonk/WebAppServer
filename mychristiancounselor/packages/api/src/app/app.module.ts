import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { configValidationSchema } from '../config/config.validation';
import { winstonConfig } from '../common/logging/winston.config';

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
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests
      },
      {
        name: 'strict', // Stricter limit for auth endpoints
        ttl: 60000,
        limit: 10,
      },
    ]),
    // Winston logging
    WinstonModule.forRoot(winstonConfig),
    PrismaModule,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Rate limiting (prevent abuse)
    },
  ],
})
export class AppModule {}
