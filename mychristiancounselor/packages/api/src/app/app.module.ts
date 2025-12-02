import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { configValidationSchema } from '../config/config.validation';

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
    PrismaModule,
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
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
