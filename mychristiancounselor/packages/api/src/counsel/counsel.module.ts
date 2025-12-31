import { Module } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { CounselProcessingService } from './counsel-processing.service';
import { AssignmentService } from './assignment.service';
import { ObservationService } from './observation.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { WellbeingAnalysisScheduler } from './wellbeing-analysis.scheduler';
import { WellbeingHistoryService } from './wellbeing-history.service';
import { SessionSummaryService } from './session-summary.service';
import { TrajectoryCalculationService } from './trajectory-calculation.service';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { SessionLimitService } from './session-limit.service';
import { NoteService } from './note.service';
import { PermissionService } from './permission.service';
import { CrisisAlertService } from './crisis-alert.service';
import { AssessmentService } from './assessment.service';
import { CounselController } from './counsel.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ScriptureModule } from '../scripture/scripture.module';
import { SafetyModule } from '../safety/safety.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    ScriptureModule,
    SafetyModule,
    SubscriptionModule,
    EmailModule,
  ],
  controllers: [CounselController],
  providers: [
    CounselService,
    CounselExportService,
    CounselProcessingService,
    AssignmentService,
    ObservationService,
    WellbeingAnalysisService,
    WellbeingAnalysisScheduler,
    WellbeingHistoryService,
    SessionSummaryService,
    TrajectoryCalculationService,
    ScriptureEnrichmentService,
    SessionService,
    SessionLimitService,
    NoteService,
    PermissionService,
    CrisisAlertService,
    AssessmentService,
  ],
  exports: [
    CounselService,
    CounselProcessingService,
    AssignmentService,
    ObservationService,
    WellbeingAnalysisService,
    WellbeingHistoryService,
    SessionSummaryService,
    TrajectoryCalculationService,
    SessionService,
    SessionLimitService,
    ScriptureEnrichmentService,
    NoteService,
    PermissionService,
    CrisisAlertService,
    AssessmentService,
  ],
})
export class CounselModule {}
