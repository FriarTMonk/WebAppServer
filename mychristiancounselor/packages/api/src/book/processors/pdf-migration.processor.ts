import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageOrchestratorService } from '../services/storage-orchestrator.service';
import { queueConfig } from '../../config/queue.config';

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

  async process(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    const jobName = job.name;

    this.logger.log(`Processing ${jobName} for book ${bookId} (Job ID: ${job.id})`);

    if (jobName === 'migrate-to-active') {
      await this.handleMigrateToActive(job);
    } else if (jobName === 'migrate-to-archived') {
      await this.handleMigrateToArchived(job);
    } else {
      throw new Error(`Unknown job name: ${jobName}`);
    }

    this.logger.log(`Completed ${jobName} for book ${bookId}`);
  }

  /**
   * Handle migrate-to-active job
   * Temp → S3 active tier
   */
  private async handleMigrateToActive(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    await this.storageOrchestrator.migratePdfToActiveTier(bookId);
  }

  /**
   * Handle migrate-to-archived job
   * S3 active → S3 archived (Glacier)
   */
  private async handleMigrateToArchived(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    await this.storageOrchestrator.migratePdfToArchivedTier(bookId);
  }
}
