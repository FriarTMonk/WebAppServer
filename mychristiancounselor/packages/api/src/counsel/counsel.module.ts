import { Module } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { AssignmentService } from './assignment.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { WellbeingAnalysisScheduler } from './wellbeing-analysis.scheduler';
import { CounselController } from './counsel.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ScriptureModule } from '../scripture/scripture.module';
import { SafetyModule } from '../safety/safety.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    ScriptureModule,
    SafetyModule,
    SubscriptionModule,
  ],
  controllers: [CounselController],
  providers: [
    CounselService,
    CounselExportService,
    AssignmentService,
    WellbeingAnalysisService,
    WellbeingAnalysisScheduler,
  ],
  exports: [
    CounselService,
    AssignmentService,
    WellbeingAnalysisService,
  ],
})
export class CounselModule {}
