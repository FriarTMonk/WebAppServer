import { Test } from '@nestjs/testing';
import { BookEvaluationProcessor } from './book-evaluation.processor';
import { EvaluationOrchestratorService } from '../services/evaluation-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';

describe('BookEvaluationProcessor', () => {
  let processor: BookEvaluationProcessor;
  let evaluationOrchestrator: EvaluationOrchestratorService;
  let prisma: PrismaService;

  beforeEach(async () => {
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
            },
          },
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
});
