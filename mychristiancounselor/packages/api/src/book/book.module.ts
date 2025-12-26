import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { BookController } from './book.controller';
import { BookOrchestratorService } from './book-orchestrator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { VisibilityCheckerService } from './services/visibility-checker.service';
import { BookQueryService } from './services/book-query.service';
import { EvaluationScorerService } from './services/evaluation-scorer.service';
import { EvaluationOrchestratorService } from './services/evaluation-orchestrator.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { GoogleBooksProvider } from './providers/metadata/google-books.provider';
import { S3StorageProvider } from './providers/storage/s3-storage.provider';
import { StorageOrchestratorService } from './services/storage-orchestrator.service';
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
  controllers: [BookController],
  providers: [
    BookOrchestratorService,
    DuplicateDetectorService,
    VisibilityCheckerService,
    BookQueryService,
    EvaluationScorerService,
    EvaluationOrchestratorService,
    MetadataAggregatorService,
    GoogleBooksProvider,
    S3StorageProvider,
    StorageOrchestratorService,
    BookEvaluationProcessor,
  ],
  exports: [
    BookOrchestratorService,
    DuplicateDetectorService,
    VisibilityCheckerService,
    BookQueryService,
    EvaluationOrchestratorService,
  ],
})
export class BookModule {}
