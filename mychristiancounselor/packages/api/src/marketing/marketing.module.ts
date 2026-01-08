import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ProspectsController } from './prospects.controller';
import { ProspectsService } from './prospects.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignExecutionService } from './campaign-execution.service';
import { ConversionController } from './conversion.controller';
import { OptOutService } from './opt-out.service';
import { IsSalesRepGuard } from './guards/is-sales-rep.guard';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ProspectsController, CampaignsController, ConversionController],
  providers: [
    ProspectsService,
    CampaignsService,
    CampaignExecutionService,
    OptOutService,
    IsSalesRepGuard,
  ],
  exports: [
    ProspectsService,
    CampaignsService,
    CampaignExecutionService,
    OptOutService,
  ],
})
export class MarketingModule {}
