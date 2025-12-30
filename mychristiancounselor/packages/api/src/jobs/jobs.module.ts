import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';
import { ScheduledCampaignsService } from './scheduled-campaigns.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, MarketingModule],
  providers: [CleanupService, ScheduledCampaignsService],
})
export class JobsModule {}
