import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { StorageOrchestratorService } from './services/storage-orchestrator.service';
import { queueConfig } from '../config/queue.config';
import { BookMetadata } from '@mychristiancounselor/shared';
import { PdfLicenseType, BookEvaluationStatus } from '@prisma/client';

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

interface PdfUploadResult {
  id: string;
  status: 'uploaded' | 'queued_for_evaluation';
  message: string;
  pdfFileSize?: number;
  pdfUploadedAt?: Date;
}

@Injectable()
export class BookOrchestratorService {
  private readonly logger = new Logger(BookOrchestratorService.name);

  constructor(
    private readonly metadataService: MetadataAggregatorService,
    private readonly duplicateDetector: DuplicateDetectorService,
    private readonly storageOrchestrator: StorageOrchestratorService,
    @InjectQueue(queueConfig.evaluationQueue.name)
    private readonly evaluationQueue: Queue,
    @InjectQueue(queueConfig.pdfMigrationQueue.name)
    private readonly pdfMigrationQueue: Queue,
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

    // Pipe 5: Queue evaluation job
    // User gets immediate response, evaluation happens via job processor
    await this.evaluationQueue.add(
      'evaluate-book',
      { bookId: book.id },
      {
        priority: 2, // Normal priority
        attempts: queueConfig.defaultJobOptions.attempts,
        backoff: queueConfig.defaultJobOptions.backoff,
      }
    );

    this.logger.log(`Evaluation job queued for book ${book.id}`);

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

  /**
   * Upload PDF file for a book.
   * Validates file, checks permissions, stores file, updates metadata,
   * and triggers re-evaluation if needed.
   */
  async uploadPdf(
    bookId: string,
    file: Express.Multer.File | undefined,
    userId: string,
    organizationId: string,
    pdfLicenseType?: string,
  ): Promise<PdfUploadResult> {
    this.logger.log(`Uploading PDF for book ${bookId} by user ${userId}, org ${organizationId}`);

    // Validate file exists
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    // Validate file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('PDF file must be less than 100MB');
    }

    // Validate file type
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // Check PDF magic number (first 4 bytes should be %PDF)
    if (file.buffer.slice(0, 4).toString() !== '%PDF') {
      throw new BadRequestException('File is not a valid PDF');
    }

    // Validate pdfLicenseType if provided
    let validatedLicenseType: PdfLicenseType | undefined = undefined;
    if (pdfLicenseType) {
      const validLicenseTypes = Object.values(PdfLicenseType);
      if (!validLicenseTypes.includes(pdfLicenseType as PdfLicenseType)) {
        throw new BadRequestException(
          `Invalid pdfLicenseType. Must be one of: ${validLicenseTypes.join(', ')}`
        );
      }
      validatedLicenseType = pdfLicenseType as PdfLicenseType;
    }

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        submittedByOrganizationId: true,
        evaluationStatus: true,
        pdfFilePath: true,
        pdfFileHash: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Check authorization: only org admins from submitting org can upload
    if (book.submittedByOrganizationId !== organizationId) {
      throw new ForbiddenException('Only organization admins from the submitting organization can upload PDFs');
    }

    // Step 1: Validate and extract metadata BEFORE any file operations
    // This ensures we don't modify the filesystem if validation/extraction fails
    let metadata: { hash: string; year: number | null };
    try {
      // Validate if replacing existing PDF
      if (book.pdfFileHash) {
        await this.storageOrchestrator.validatePdfUpload(bookId, file.buffer);
      }

      // Extract metadata
      metadata = await this.storageOrchestrator.extractPdfMetadata(file.buffer);
    } catch (error) {
      // Re-throw validation/extraction errors without modifying filesystem
      this.logger.error(`PDF validation or metadata extraction failed: ${error.message}`);
      throw error;
    }

    // Step 2: Now that validation passed, perform file operations
    // Delete old PDF file if it exists
    if (book.pdfFilePath) {
      try {
        await fs.unlink(book.pdfFilePath);
        this.logger.log(`Deleted old PDF file: ${book.pdfFilePath}`);
      } catch (error) {
        this.logger.warn(`Failed to delete old PDF file: ${error.message}`);
      }
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'uploads', 'temp', 'pdfs');
    try {
      await fs.mkdir(tempDir, { recursive: true });
      this.logger.log(`Ensured PDF directory exists: ${tempDir}`);
    } catch (error) {
      this.logger.error(`Failed to create PDF directory: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to prepare storage directory for PDF');
    }

    // Generate filename: {bookId}-{timestamp}.pdf
    const timestamp = Date.now();
    const filename = `${bookId}-${timestamp}.pdf`;
    const filePath = path.join(tempDir, filename);

    // Write file to disk
    try {
      await fs.writeFile(filePath, file.buffer);
      this.logger.log(`Saved PDF to: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to write PDF file: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to save PDF file');
    }

    // Determine if we need to re-evaluate
    const needsReEvaluation = book.evaluationStatus === BookEvaluationStatus.completed;
    const newStatus: BookEvaluationStatus = needsReEvaluation
      ? BookEvaluationStatus.pending
      : book.evaluationStatus;

    // Update book record with PDF metadata
    const uploadedAt = new Date();
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        pdfFilePath: filePath,
        pdfFileSize: file.size,
        pdfUploadedAt: uploadedAt,
        pdfLicenseType: validatedLicenseType,
        pdfFileHash: metadata.hash,
        pdfMetadataYear: metadata.year,
        evaluationStatus: newStatus,
      },
    });

    // Queue migration to active tier (high priority)
    await this.pdfMigrationQueue.add(
      'migrate-to-active',
      { bookId },
      { priority: 1 }
    );
    this.logger.log(`PDF migration job queued for book ${bookId}`);

    // Queue re-evaluation if needed
    if (needsReEvaluation) {
      await this.evaluationQueue.add(
        'evaluate-book',
        { bookId: book.id },
        {
          priority: 2, // Normal priority
          attempts: queueConfig.defaultJobOptions.attempts,
          backoff: queueConfig.defaultJobOptions.backoff,
        }
      );
      this.logger.log(`Re-evaluation job queued for book ${book.id}`);

      return {
        id: bookId,
        status: 'queued_for_evaluation',
        message: 'PDF uploaded successfully and queued for re-evaluation',
        pdfFileSize: file.size,
        pdfUploadedAt: uploadedAt,
      };
    }

    return {
      id: bookId,
      status: 'uploaded',
      message: 'PDF uploaded successfully',
      pdfFileSize: file.size,
      pdfUploadedAt: uploadedAt,
    };
  }
}
