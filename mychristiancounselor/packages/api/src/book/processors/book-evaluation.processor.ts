import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvaluationOrchestratorService } from '../services/evaluation-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { queueConfig } from '../../config/queue.config';

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
