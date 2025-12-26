import { Test, TestingModule } from '@nestjs/testing';
import { PdfMigrationProcessor } from './pdf-migration.processor';
import { StorageOrchestratorService } from '../services/storage-orchestrator.service';
import { Job } from 'bullmq';

describe('PdfMigrationProcessor', () => {
  let processor: PdfMigrationProcessor;
  let storageOrchestrator: jest.Mocked<StorageOrchestratorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfMigrationProcessor,
        {
          provide: StorageOrchestratorService,
          useValue: {
            migratePdfToActiveTier: jest.fn(),
            migratePdfToArchivedTier: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<PdfMigrationProcessor>(PdfMigrationProcessor);
    storageOrchestrator = module.get(StorageOrchestratorService);
  });

  describe('process', () => {
    describe('migrate-to-active job', () => {
      it('should call migratePdfToActiveTier with bookId', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-123',
          data: { bookId: 'book-123' },
        } as Job<{ bookId: string }>;

        await processor.process(job);

        expect(storageOrchestrator.migratePdfToActiveTier).toHaveBeenCalledWith('book-123');
      });

      it('should propagate errors for retry', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-123',
          data: { bookId: 'book-123' },
        } as Job<{ bookId: string }>;
        storageOrchestrator.migratePdfToActiveTier.mockRejectedValue(new Error('S3 error'));

        await expect(processor.process(job)).rejects.toThrow('S3 error');
      });
    });

    describe('migrate-to-archived job', () => {
      it('should call migratePdfToArchivedTier with bookId', async () => {
        const job = {
          name: 'migrate-to-archived',
          id: 'job-456',
          data: { bookId: 'book-456' },
        } as Job<{ bookId: string }>;

        await processor.process(job);

        expect(storageOrchestrator.migratePdfToArchivedTier).toHaveBeenCalledWith('book-456');
      });

      it('should propagate errors for retry', async () => {
        const job = {
          name: 'migrate-to-archived',
          id: 'job-456',
          data: { bookId: 'book-456' },
        } as Job<{ bookId: string }>;
        storageOrchestrator.migratePdfToArchivedTier.mockRejectedValue(new Error('Glacier error'));

        await expect(processor.process(job)).rejects.toThrow('Glacier error');
      });
    });

    describe('unknown job name', () => {
      it('should throw error for unknown job name', async () => {
        const job = {
          name: 'unknown-job',
          id: 'job-789',
          data: { bookId: 'book-789' },
        } as Job<{ bookId: string }>;

        await expect(processor.process(job)).rejects.toThrow('Unknown job name: unknown-job');
      });
    });

    describe('edge cases', () => {
      it('should throw error for missing job data', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-1',
        } as Job<{ bookId: string }, any, string>;

        await expect(processor.process(job)).rejects.toThrow('Job data is missing');
      });

      it('should throw error for null bookId', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-1',
          data: { bookId: null as any },
        } as Job<{ bookId: string }, any, string>;

        await expect(processor.process(job)).rejects.toThrow('Invalid or missing bookId');
      });

      it('should throw error for empty bookId', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-1',
          data: { bookId: '' },
        } as Job<{ bookId: string }, any, string>;

        await expect(processor.process(job)).rejects.toThrow('Invalid or missing bookId');
      });

      it('should throw error for whitespace-only bookId', async () => {
        const job = {
          name: 'migrate-to-active',
          id: 'job-1',
          data: { bookId: '   ' },
        } as Job<{ bookId: string }, any, string>;

        await expect(processor.process(job)).rejects.toThrow('Invalid or missing bookId');
      });
    });
  });
});
