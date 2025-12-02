import { Module } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { AssignmentService } from './assignment.service';
import { ObservationService } from './observation.service';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';
import { WellbeingAnalysisScheduler } from './wellbeing-analysis.scheduler';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { NoteService } from './note.service';
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
    AssignmentService,
    ObservationService,
    WellbeingAnalysisService,
    WellbeingAnalysisScheduler,
    ScriptureEnrichmentService,
    SessionService,
    NoteService,
  ],
  exports: [
    CounselService,
    AssignmentService,
    ObservationService,
    WellbeingAnalysisService,
    SessionService,
    ScriptureEnrichmentService,
    NoteService,
  ],
})
export class CounselModule {}
