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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
