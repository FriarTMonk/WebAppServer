import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { BookMetadata } from '@mychristiancounselor/shared';

interface CreateBookInput {
  isbn?: string;
  lookupUrl?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
}

interface BookCreationResult {
  id: string;
  status: 'pending' | 'existing';
  message: string;
}

@Injectable()
export class BookOrchestratorService {
  private readonly logger = new Logger(BookOrchestratorService.name);

  constructor(
    private readonly metadataService: MetadataAggregatorService,
    private readonly duplicateDetector: DuplicateDetectorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Unix philosophy: Compose small services via pipeline
   * Input → Metadata Lookup → Duplicate Check → Storage → Endorsement → Queue
   */
  async createBook(
    userId: string,
    organizationId: string,
    input: CreateBookInput,
  ): Promise<BookCreationResult> {
    this.logger.log(`Creating book for user ${userId}, org ${organizationId}`);

    // Pipe 1: Get metadata
    const metadata = await this.getMetadata(input);

    // Pipe 2: Check duplicates
    const duplicateId = await this.duplicateDetector.findDuplicate(metadata);
    if (duplicateId) {
      await this.addEndorsement(duplicateId, organizationId, userId);
      return {
        id: duplicateId,
        status: 'existing',
        message: 'This book already exists. Your organization has been added as an endorser.',
      };
    }

    // Pipe 3: Store book
    const book = await this.prisma.book.create({
      data: {
        title: metadata.title,
        author: metadata.author,
        isbn: metadata.isbn,
        publisher: metadata.publisher,
        publicationYear: metadata.publicationYear,
        description: metadata.description,
        coverImageUrl: metadata.coverImageUrl,
        evaluationStatus: 'pending',
        submittedById: userId,
        submittedByOrganizationId: organizationId,
      },
    });

    // Pipe 4: Add endorsement
    await this.addEndorsement(book.id, organizationId, userId);

    // Pipe 5: Queue for evaluation (next task)
    // TODO: Queue evaluation job

    return {
      id: book.id,
      status: 'pending',
      message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
    };
  }

  private async getMetadata(input: CreateBookInput): Promise<BookMetadata> {
    if (input.isbn) {
      const metadata = await this.metadataService.lookup(input.isbn);
      if (!metadata) {
        throw new BadRequestException('ISBN not found');
      }
      return metadata;
    }

    if (input.lookupUrl) {
      const metadata = await this.metadataService.lookup(input.lookupUrl);
      if (!metadata) {
        throw new BadRequestException('Could not extract book info from URL');
      }
      return metadata;
    }

    if (input.title && input.author) {
      return {
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        publisher: input.publisher,
        publicationYear: input.publicationYear,
        description: input.description,
        coverImageUrl: input.coverImageUrl,
      };
    }

    throw new BadRequestException('Must provide ISBN, URL, or title+author');
  }

  private async addEndorsement(
    bookId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.prisma.bookEndorsement.findUnique({
      where: {
        bookId_organizationId: { bookId, organizationId },
      },
    });

    if (existing) {
      this.logger.log(`Organization ${organizationId} already endorses book ${bookId}`);
      return;
    }

    await this.prisma.bookEndorsement.create({
      data: { bookId, organizationId, endorsedById: userId },
    });
  }
}
