import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { AdminModule } from '../admin/admin.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ProfileModule } from '../profile/profile.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    CounselModule,
    AdminModule,
    SubscriptionModule,
    ProfileModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
