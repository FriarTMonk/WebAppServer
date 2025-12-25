import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { BookOrchestratorService } from './book-orchestrator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { VisibilityCheckerService } from './services/visibility-checker.service';
import { EvaluationScorerService } from './services/evaluation-scorer.service';
import { EvaluationOrchestratorService } from './services/evaluation-orchestrator.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { GoogleBooksProvider } from './providers/metadata/google-books.provider';
import { BookEvaluationProcessor } from './processors/book-evaluation.processor';
import { queueConfig } from '../config/queue.config';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({
      name: queueConfig.evaluationQueue.name,
    }),
  ],
  providers: [
    BookOrchestratorService,
    DuplicateDetectorService,
    VisibilityCheckerService,
    EvaluationScorerService,
    EvaluationOrchestratorService,
    MetadataAggregatorService,
    GoogleBooksProvider,
    BookEvaluationProcessor,
  ],
  exports: [
    BookOrchestratorService,
    DuplicateDetectorService,
    VisibilityCheckerService,
    EvaluationOrchestratorService,
  ],
})
export class BookModule {}
