import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageOrchestratorService } from '../services/storage-orchestrator.service';
import { queueConfig } from '../../config/queue.config';

interface PdfMigrationJobData {
  bookId: string;
}

@Processor(queueConfig.pdfMigrationQueue.name, {
  concurrency: queueConfig.pdfMigrationQueue.concurrency,
})
export class PdfMigrationProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfMigrationProcessor.name);

  constructor(
    private readonly storageOrchestrator: StorageOrchestratorService,
  ) {
    super();
  }

  async process(job: Job<PdfMigrationJobData, any, string>): Promise<void> {
    const jobName = job.name as string;

    try {
      // Validate job data
      if (!job.data) {
        throw new Error('Job data is missing');
      }

      const { bookId } = job.data;

      // Validate bookId
      if (!bookId || typeof bookId !== 'string' || bookId.trim() === '') {
        throw new Error('Invalid or missing bookId in job data');
      }

      this.logger.log(`Processing ${jobName} job ${job.id} for book ${bookId}`);

      // Route to handler
      if (jobName === 'migrate-to-active') {
        await this.handleMigrateToActive(job);
      } else if (jobName === 'migrate-to-archived') {
        await this.handleMigrateToArchived(job);
      } else {
        throw new Error(`Unknown job name: ${jobName}`);
      }

      this.logger.log(`Completed ${jobName} job ${job.id} for book ${bookId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process ${jobName} job ${job.id}: ${error?.message || error}`,
        error?.stack,
      );
      throw error; // Re-throw for BullMQ retry
    }
  }

  /**
   * Handle migrate-to-active job
   * Temp → S3 active tier
   */
  private async handleMigrateToActive(job: Job<PdfMigrationJobData>): Promise<void> {
    const { bookId } = job.data;
    await this.storageOrchestrator.migratePdfToActiveTier(bookId);
  }

  /**
   * Handle migrate-to-archived job
   * S3 active → S3 archived (Glacier)
   */
  private async handleMigrateToArchived(job: Job<PdfMigrationJobData>): Promise<void> {
    const { bookId } = job.data;
    await this.storageOrchestrator.migratePdfToArchivedTier(bookId);
  }
}
