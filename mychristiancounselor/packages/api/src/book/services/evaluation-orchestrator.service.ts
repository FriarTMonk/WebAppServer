import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvaluationScorerService } from './evaluation-scorer.service';
import { S3StorageProvider } from '../providers/storage/s3-storage.provider';
import { resourcesConfig } from '../../config/resources.config';

@Injectable()
export class EvaluationOrchestratorService {
  private readonly logger = new Logger(EvaluationOrchestratorService.name);

  constructor(
    private readonly scorer: EvaluationScorerService,
    private readonly prisma: PrismaService,
    private readonly storageProvider: S3StorageProvider,
  ) {}

  /**
   * Unix philosophy: Compose scorer service via pipeline
   * Pipeline: Get Book → Determine Content → Evaluate → Check Borderline → Escalate if needed → Save Results → Store PDF
   */
  async evaluateBook(bookId: string, pdfBuffer?: Buffer): Promise<void> {
    this.logger.log(`Starting evaluation for book ${bookId}`);

    // Pipe 1: Get book data
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    // Pipe 2: Determine content type (progressive analysis)
    const content = this.determineContent(book);

    // Pipe 3: Evaluate with Sonnet
    const sonnetResult = await this.scorer.evaluate({
      metadata: {
        title: book.title,
        author: book.author,
      },
      content: content.text,
      contentType: content.type,
      genre: book.genreTag, // Pass genre for fiction-aware evaluation
    });

    this.logger.log(`Sonnet evaluation: ${sonnetResult.score}%`);

    // Pipe 4: Check if borderline
    const isBorderline = this.isBorderlineScore(sonnetResult.score);

    let finalResult = sonnetResult;

    // Pipe 5: Escalate to Opus if borderline
    if (isBorderline) {
      this.logger.log(`Score ${sonnetResult.score} is borderline, escalating to Opus`);

      finalResult = await this.scorer.evaluate({
        metadata: {
          title: book.title,
          author: book.author,
        },
        content: content.text,
        contentType: content.type,
        genre: book.genreTag, // Pass genre for fiction-aware evaluation
        useEscalationModel: true, // Signal to use Opus
      });

      this.logger.log(`Opus evaluation: ${finalResult.score}%`);
    }

    // Pipe 6: Save results
    await this.saveEvaluationResults(bookId, finalResult);

    // Pipe 7: Store PDF if provided
    if (pdfBuffer) {
      const tier = finalResult.score >= resourcesConfig.evaluation.globallyAlignedThreshold
        ? 'active'
        : 'archived';

      this.logger.log(`Storing PDF for book ${bookId} in ${tier} tier`);

      const storagePath = await this.storageProvider.upload(bookId, pdfBuffer, tier);

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          pdfStoragePath: storagePath,
          pdfStorageTier: tier,
          pdfUploadedAt: new Date(),
        },
      });
    }

    // Pipe 8: Send notification (TODO: implement notification service)
    this.logger.log(`Evaluation complete for book ${bookId}`);
  }

  private determineContent(book: any): { text: string; type: 'description' | 'summary' | 'full_text' } {
    // Progressive analysis: Start with description
    // TODO: Implement PDF summary extraction when borderline
    // TODO: Implement full text extraction when borderline

    if (book.description) {
      return { text: book.description, type: 'description' };
    }

    // Fallback to title if no description
    return { text: book.title, type: 'description' };
  }

  private isBorderlineScore(score: number): boolean {
    const { notAlignedThreshold, globallyAlignedThreshold, borderlineRange } =
      resourcesConfig.evaluation;

    // Check if within 3% of either threshold
    const lowerBorderline = Math.abs(score - notAlignedThreshold) <= borderlineRange;
    const upperBorderline = Math.abs(score - globallyAlignedThreshold) <= borderlineRange;

    return lowerBorderline || upperBorderline;
  }

  private async saveEvaluationResults(bookId: string, result: any): Promise<void> {
    const { notAlignedThreshold, globallyAlignedThreshold } = resourcesConfig.evaluation;

    // Determine visibility tier
    let visibilityTier: string;
    if (result.score < notAlignedThreshold) {
      visibilityTier = 'not_aligned';
    } else if (result.score < globallyAlignedThreshold) {
      visibilityTier = 'conceptually_aligned';
    } else {
      visibilityTier = 'globally_aligned';
    }

    // Check if PDF tier migration is needed
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        pdfStoragePath: true,
        pdfStorageTier: true,
        biblicalAlignmentScore: true,
      },
    });

    if (book?.pdfStoragePath && book.pdfStorageTier) {
      const newTier = result.score >= globallyAlignedThreshold ? 'active' : 'archived';
      const currentTier = book.pdfStorageTier;

      // Check if tier change is needed
      if (newTier !== currentTier) {
        this.logger.log(`Migrating PDF for book ${bookId} from ${currentTier} to ${newTier}`);

        await this.storageProvider.move(
          bookId,
          currentTier as 'active' | 'archived',
          newTier as 'active' | 'archived',
        );

        // Update book with new tier
        await this.prisma.book.update({
          where: { id: bookId },
          data: {
            pdfStorageTier: newTier,
            pdfStoragePath: `${newTier === 'active' ? resourcesConfig.storage.activeTier.prefix : resourcesConfig.storage.archivedTier.prefix}${bookId}.pdf`,
          },
        });
      }
    }

    // Update book
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        biblicalAlignmentScore: result.score,
        visibilityTier,
        genreTag: result.genreTag, // Save AI-detected genre
        theologicalSummary: result.summary,
        denominationalTags: result.denominationalTags,
        matureContent: result.matureContent,
        matureContentReason: result.matureContentReason,
        scriptureComparisonNotes: result.scripture,
        theologicalStrengths: result.strengths,
        theologicalConcerns: result.concerns,
        scoringReasoning: result.reasoning,
        analysisLevel: result.analysisLevel,
        aiModel: result.modelUsed,
        evaluationStatus: 'completed',
        evaluationVersion: resourcesConfig.evaluation.currentVersion,
      },
    });

    // Create evaluation record
    await this.prisma.bookEvaluation.create({
      data: {
        bookId,
        version: resourcesConfig.evaluation.currentVersion,
        score: result.score,
        evaluatedAt: new Date(),
        aiModel: result.modelUsed,
        analysisLevel: result.analysisLevel,
      },
    });

    // Save doctrine scores
    if (result.doctrineCategoryScores?.length > 0) {
      await this.prisma.doctrineCategoryScore.createMany({
        data: result.doctrineCategoryScores.map((cat: any) => ({
          bookId,
          category: cat.category,
          score: cat.score,
          notes: cat.notes,
        })),
        skipDuplicates: true,
      });
    }
  }
}
