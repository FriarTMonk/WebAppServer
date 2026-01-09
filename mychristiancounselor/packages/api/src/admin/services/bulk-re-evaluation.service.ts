import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { queueConfig } from '../../config/queue.config';

export interface BulkReEvaluationOptions {
  scope: 'all' | 'pending' | 'failed' | 'completed';
  frameworkId?: string;
  triggeredBy: string;
}

export interface BulkReEvaluationResult {
  success: boolean;
  message: string;
  bookCount: number;
  estimatedCost: number;
  queuedJobIds: string[];
}

@Injectable()
export class BulkReEvaluationService {
  private readonly logger = new Logger(BulkReEvaluationService.name);

  // Estimated cost per evaluation (this is a rough average)
  private readonly ESTIMATED_COST_PER_BOOK = 0.15;

  constructor(
    private prisma: PrismaService,
    @InjectQueue(queueConfig.evaluationQueue.name)
    private readonly evaluationQueue: Queue,
  ) {}

  async triggerBulkReEvaluation(options: BulkReEvaluationOptions): Promise<BulkReEvaluationResult> {
    const { scope, frameworkId, triggeredBy } = options;

    this.logger.log(`Starting bulk re-evaluation with scope: ${scope}, triggered by: ${triggeredBy}`);

    // Get books based on scope
    const books = await this.getBooksByScope(scope);

    if (books.length === 0) {
      return {
        success: false,
        message: `No books found for scope: ${scope}`,
        bookCount: 0,
        estimatedCost: 0,
        queuedJobIds: [],
      };
    }

    // Queue evaluation jobs for each book
    const queuedJobIds: string[] = [];

    for (const book of books) {
      const job = await this.evaluationQueue.add(
        'evaluate-book',
        {
          bookId: book.id,
          frameworkId,
          triggeredBy,
          isReEvaluation: true,
        },
        {
          priority: 2, // Lower priority than manual single evaluations
          attempts: queueConfig.defaultJobOptions.attempts,
          backoff: queueConfig.defaultJobOptions.backoff,
        }
      );

      queuedJobIds.push(job.id);
    }

    const estimatedCost = books.length * this.ESTIMATED_COST_PER_BOOK;

    this.logger.log(
      `Queued ${books.length} books for re-evaluation. Estimated cost: $${estimatedCost.toFixed(2)}`
    );

    return {
      success: true,
      message: `Successfully queued ${books.length} books for re-evaluation`,
      bookCount: books.length,
      estimatedCost,
      queuedJobIds,
    };
  }

  private async getBooksByScope(scope: string) {
    const where: any = {};

    switch (scope) {
      case 'pending':
        where.evaluationStatus = 'pending';
        break;
      case 'failed':
        where.evaluationStatus = 'failed';
        break;
      case 'completed':
        where.evaluationStatus = 'completed';
        break;
      case 'all':
        // No filter - all books
        break;
      default:
        this.logger.warn(`Unknown scope: ${scope}, defaulting to 'all'`);
    }

    return this.prisma.book.findMany({
      where,
      select: {
        id: true,
        title: true,
        author: true,
        evaluationStatus: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
