import { Test } from '@nestjs/testing';
import { BookEvaluationProcessor } from './book-evaluation.processor';
import { EvaluationOrchestratorService } from '../services/evaluation-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Job, Queue } from 'bullmq';
import { queueConfig } from '../../config/queue.config';

describe('BookEvaluationProcessor', () => {
  let processor: BookEvaluationProcessor;
  let evaluationOrchestrator: EvaluationOrchestratorService;
  let prisma: PrismaService;
  let pdfMigrationQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    pdfMigrationQueue = {
      add: jest.fn().mockResolvedValue({}),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        BookEvaluationProcessor,
        {
          provide: EvaluationOrchestratorService,
          useValue: {
            evaluateBook: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            book: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: 'BullQueue_pdf-migration',
          useValue: pdfMigrationQueue,
        },
      ],
    }).compile();

    processor = module.get<BookEvaluationProcessor>(BookEvaluationProcessor);
    evaluationOrchestrator = module.get<EvaluationOrchestratorService>(EvaluationOrchestratorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should process evaluation job successfully', async () => {
    const mockJob = {
      id: 'job-123',
      data: { bookId: 'book-123' },
      attemptsMade: 0,
    } as Job;

    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockResolvedValue();

    await processor.process(mockJob);

    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 'book-123' },
      data: { evaluationStatus: 'processing' },
    });
    expect(evaluationOrchestrator.evaluateBook).toHaveBeenCalledWith('book-123');
  });

  it('should mark book as failed after max retries', async () => {
    const mockJob = {
      id: 'job-123',
      data: { bookId: 'book-123' },
      attemptsMade: 3,
    } as Job;

    jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockRejectedValue(new Error('AI Error'));

    await expect(processor.process(mockJob)).rejects.toThrow('AI Error');

    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: 'book-123' },
      data: { evaluationStatus: 'failed' },
    });
  });

  describe('conditional archival', () => {
    beforeEach(() => {
      jest.spyOn(prisma.book, 'update').mockResolvedValue({} as any);
    });

    it('should queue migrate-to-archived if score < 70', async () => {
      const mockJob = {
        id: 'job-123',
        data: { bookId: 'book-123' },
        attemptsMade: 0,
      } as Job;

      // Mock book with score < 70 (not aligned)
      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
        id: 'book-123',
        biblicalAlignmentScore: 65,
        evaluationStatus: 'completed',
      } as any);

      jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockResolvedValue();

      await processor.process(mockJob);

      expect(pdfMigrationQueue.add).toHaveBeenCalledWith(
        'migrate-to-archived',
        { bookId: 'book-123' },
        expect.objectContaining({
          priority: 2,
          attempts: queueConfig.pdfMigrationQueue.attempts,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: queueConfig.pdfMigrationQueue.backoff.delay,
          }),
          removeOnComplete: queueConfig.pdfMigrationQueue.removeOnComplete,
          removeOnFail: queueConfig.pdfMigrationQueue.removeOnFail,
        })
      );
    });

    it('should NOT queue archival if score >= 70 (conceptually aligned)', async () => {
      const mockJob = {
        id: 'job-123',
        data: { bookId: 'book-123' },
        attemptsMade: 0,
      } as Job;

      // Mock book with score >= 70 but < 90
      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
        id: 'book-123',
        biblicalAlignmentScore: 85,
        evaluationStatus: 'completed',
      } as any);

      jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockResolvedValue();

      await processor.process(mockJob);

      expect(pdfMigrationQueue.add).not.toHaveBeenCalled();
    });

    it('should NOT queue archival if score >= 90 (globally aligned)', async () => {
      const mockJob = {
        id: 'job-123',
        data: { bookId: 'book-123' },
        attemptsMade: 0,
      } as Job;

      // Mock book with score >= 90
      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
        id: 'book-123',
        biblicalAlignmentScore: 95,
        evaluationStatus: 'completed',
      } as any);

      jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockResolvedValue();

      await processor.process(mockJob);

      expect(pdfMigrationQueue.add).not.toHaveBeenCalled();
    });

    it('should NOT queue archival if book has no score yet', async () => {
      const mockJob = {
        id: 'job-123',
        data: { bookId: 'book-123' },
        attemptsMade: 0,
      } as Job;

      // Mock book with null score (evaluation not completed yet)
      jest.spyOn(prisma.book, 'findUnique').mockResolvedValue({
        id: 'book-123',
        biblicalAlignmentScore: null,
        evaluationStatus: 'completed',
      } as any);

      jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockResolvedValue();

      await processor.process(mockJob);

      expect(pdfMigrationQueue.add).not.toHaveBeenCalled();
    });
  });
});
