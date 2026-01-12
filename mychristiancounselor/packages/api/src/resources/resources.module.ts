import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ResourcesController } from './resources.controller';
import { WellnessChartsController } from './controllers/wellness-charts.controller';
import { OrganizationBrowseService } from './services/organization-browse.service';
import { ExternalOrganizationService } from './services/external-organization.service';
import { ReadingListService } from './services/reading-list.service';
import { ReadingRecommendationsService } from './services/reading-recommendations.service';
import { WellnessChartsService } from './services/wellness-charts.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ResourcesController, WellnessChartsController],
  providers: [OrganizationBrowseService, ExternalOrganizationService, ReadingListService, ReadingRecommendationsService, WellnessChartsService],
  exports: [],
})
export class ResourcesModule {}
