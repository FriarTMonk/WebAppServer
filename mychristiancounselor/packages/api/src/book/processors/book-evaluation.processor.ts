import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EvaluationOrchestratorService } from '../services/evaluation-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { queueConfig } from '../../config/queue.config';
import { resourcesConfig } from '../../config/resources.config';

interface BookEvaluationJobData {
  bookId: string;
  priority?: 'high' | 'normal' | 'low';
}

@Processor(queueConfig.evaluationQueue.name, {
  concurrency: queueConfig.evaluationQueue.concurrency.sonnet,
})
export class BookEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookEvaluationProcessor.name);

  constructor(
    private readonly evaluationOrchestrator: EvaluationOrchestratorService,
    private readonly prisma: PrismaService,
    @InjectQueue(queueConfig.pdfMigrationQueue.name)
    private readonly pdfMigrationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<BookEvaluationJobData>): Promise<void> {
    const { bookId } = job.data;

    this.logger.log(`Processing evaluation job for book ${bookId} (Job ID: ${job.id})`);

    try {
      // Update status to processing
      await this.prisma.book.update({
        where: { id: bookId },
        data: { evaluationStatus: 'processing' },
      });

      // Run evaluation
      await this.evaluationOrchestrator.evaluateBook(bookId);

      this.logger.log(`Evaluation completed for book ${bookId}`);

      // Conditional archival: Queue migration to Glacier if score < 70
      const book = await this.prisma.book.findUnique({
        where: { id: bookId },
        select: { biblicalAlignmentScore: true },
      });

      if (book?.biblicalAlignmentScore !== null && book?.biblicalAlignmentScore !== undefined) {
        const score = book.biblicalAlignmentScore;
        const threshold = resourcesConfig.evaluation.notAlignedThreshold;

        if (score < threshold) {
          // Not aligned - queue archival to Glacier
          await this.pdfMigrationQueue.add(
            'migrate-to-archived',
            { bookId },
            {
              priority: 2, // Lower priority than uploads (priority 1)
              attempts: queueConfig.pdfMigrationQueue.attempts,
              backoff: queueConfig.pdfMigrationQueue.backoff,
              removeOnComplete: queueConfig.pdfMigrationQueue.removeOnComplete,
              removeOnFail: queueConfig.pdfMigrationQueue.removeOnFail,
            }
          );
          this.logger.log(
            `Queued archival for not-aligned book ${bookId} (score: ${score}, threshold: ${threshold})`
          );
        } else {
          // Conceptually or globally aligned - stay in active tier
          this.logger.log(
            `Book ${bookId} will stay in active tier (score: ${score}, threshold: ${threshold})`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Evaluation failed for book ${bookId}:`, error);

      // Update status to failed if max retries exceeded
      if (job.attemptsMade >= queueConfig.defaultJobOptions.attempts) {
        await this.prisma.book.update({
          where: { id: bookId },
          data: { evaluationStatus: 'failed' },
        });
      }

      throw error; // Re-throw for BullMQ retry logic
    }
  }
}
