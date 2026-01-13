import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ResourcesController } from './resources.controller';
import { WellnessChartsController } from './controllers/wellness-charts.controller';
import { WellnessEntryController } from './controllers/wellness-entry.controller';
import { OrganizationBrowseService } from './services/organization-browse.service';
import { ExternalOrganizationService } from './services/external-organization.service';
import { ReadingListService } from './services/reading-list.service';
import { ReadingRecommendationsService } from './services/reading-recommendations.service';
import { WellnessChartsService } from './services/wellness-charts.service';
import { WellnessEntryService } from './services/wellness-entry.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ResourcesController, WellnessChartsController, WellnessEntryController],
  providers: [OrganizationBrowseService, ExternalOrganizationService, ReadingListService, ReadingRecommendationsService, WellnessChartsService, WellnessEntryService],
  exports: [],
})
export class ResourcesModule {}
