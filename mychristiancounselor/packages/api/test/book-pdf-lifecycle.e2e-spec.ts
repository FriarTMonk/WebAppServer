import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookOrchestratorService } from '../src/book/book-orchestrator.service';
import { PdfMigrationProcessor } from '../src/book/processors/pdf-migration.processor';
import { BookEvaluationProcessor } from '../src/book/processors/book-evaluation.processor';
import { S3StorageProvider } from '../src/book/providers/storage/s3-storage.provider';
import { EvaluationOrchestratorService } from '../src/book/services/evaluation-orchestrator.service';
import { StorageOrchestratorService } from '../src/book/services/storage-orchestrator.service';
import { MetadataAggregatorService } from '../src/book/providers/metadata/metadata-aggregator.service';
import { DuplicateDetectorService } from '../src/book/services/duplicate-detector.service';
import { EvaluationScorerService } from '../src/book/services/evaluation-scorer.service';
import { getQueueToken } from '@nestjs/bullmq';
import { queueConfig } from '../src/config/queue.config';
import { resourcesConfig } from '../src/config/resources.config';
import * as fs from 'fs/promises';

/**
 * Integration Test: Book PDF Lifecycle
 *
 * This test verifies the complete PDF lifecycle from upload through storage tier management:
 * 1. Upload PDF → saved to temp disk storage
 * 2. Migration job runs → moves PDF to S3 active tier, deletes temp file
 * 3. Evaluation job runs → evaluates book
 * 4. If score < 70 → archival job runs → moves PDF to Glacier
 * 5. If score >= 70 → PDF stays in active tier
 *
 * Note: This is an integration test with mocked external services (S3, AI evaluation, Redis queues)
 * but real service orchestration and business logic.
 *
 * SETUP:
 * - Database connection configured in .env (DATABASE_URL)
 * - Test fixtures (user, organization) are created automatically in beforeAll()
 */
describe('Book PDF Lifecycle (Integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bookOrchestrator: BookOrchestratorService;
  let pdfMigrationProcessor: PdfMigrationProcessor;
  let bookEvaluationProcessor: BookEvaluationProcessor;
  let storageOrchestrator: StorageOrchestratorService;
  let s3Provider: S3StorageProvider;
  let evaluationOrchestrator: EvaluationOrchestratorService;

  // Mock queues (no Redis needed)
  const mockPdfMigrationQueue = {
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
  };

  const mockEvaluationQueue = {
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
  };

  // Test book IDs (will be generated during test)
  let notAlignedBookId: string;
  let alignedBookId: string;

  // Mock S3 storage (in-memory)
  const mockS3Storage = new Map<string, Buffer>();

  beforeAll(async () => {
    // Initialize Prisma connection first
    const tempPrisma = new PrismaService();

    // Create test fixtures using upsert for idempotency
    await tempPrisma.user.upsert({
      where: { id: 'test-user-id' },
      create: {
        id: 'test-user-id',
        email: 'e2e-test-lifecycle@test.local',
        passwordHash: 'test-password-hash',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        isActive: true,
      },
      update: {
        passwordHash: 'test-password-hash',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        isActive: true,
      },
    });

    await tempPrisma.organization.upsert({
      where: { id: 'test-org-id' },
      create: {
        id: 'test-org-id',
        name: 'Test Organization',
      },
      update: {
        name: 'Test Organization',
      },
    });

    // Create or get owner role
    await tempPrisma.organizationRole.upsert({
      where: { id: 'test-role-id' },
      create: {
        id: 'test-role-id',
        organizationId: 'test-org-id',
        name: 'Owner',
        isSystemRole: true,
        permissions: [],
      },
      update: {
        name: 'Owner',
      },
    });

    await tempPrisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
        },
      },
      create: {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        roleId: 'test-role-id',
      },
      update: {
        roleId: 'test-role-id',
      },
    });

    moduleRef = await Test.createTestingModule({
      providers: [
        // Core services
        BookOrchestratorService,
        PdfMigrationProcessor,
        BookEvaluationProcessor,
        StorageOrchestratorService,
        EvaluationOrchestratorService,
        EvaluationScorerService,
        MetadataAggregatorService,
        DuplicateDetectorService,

        // Prisma (uses real database connection from env)
        PrismaService,

        // Mock queues
        {
          provide: getQueueToken(queueConfig.pdfMigrationQueue.name),
          useValue: mockPdfMigrationQueue,
        },
        {
          provide: getQueueToken(queueConfig.evaluationQueue.name),
          useValue: mockEvaluationQueue,
        },

        // Mock S3 provider
        {
          provide: S3StorageProvider,
          useValue: {
            upload: jest.fn().mockImplementation(async (bookId: string, buffer: Buffer, tier: string) => {
              const key = `${tier}/books/${bookId}.pdf`;
              mockS3Storage.set(key, buffer);
              return key;
            }),
            move: jest.fn().mockImplementation(async (bookId: string, fromTier: string, toTier: string) => {
              const fromKey = `${fromTier}/books/${bookId}.pdf`;
              const toKey = `${toTier}/books/${bookId}.pdf`;
              const buffer = mockS3Storage.get(fromKey);
              if (buffer) {
                mockS3Storage.set(toKey, buffer);
                mockS3Storage.delete(fromKey);
              }
            }),
            delete: jest.fn().mockImplementation(async (key: string) => {
              mockS3Storage.delete(key);
            }),
            exists: jest.fn().mockImplementation(async (key: string) => {
              return mockS3Storage.has(key);
            }),
          },
        },
      ],
    }).compile();

    // Get services
    prisma = moduleRef.get(PrismaService);
    bookOrchestrator = moduleRef.get(BookOrchestratorService);
    pdfMigrationProcessor = moduleRef.get(PdfMigrationProcessor);
    bookEvaluationProcessor = moduleRef.get(BookEvaluationProcessor);
    storageOrchestrator = moduleRef.get(StorageOrchestratorService);
    s3Provider = moduleRef.get(S3StorageProvider);
    evaluationOrchestrator = moduleRef.get(EvaluationOrchestratorService);

    // Mock evaluation orchestrator to return controlled scores
    jest.spyOn(evaluationOrchestrator, 'evaluateBook').mockImplementation(async (bookId: string) => {
      // Determine score based on book title
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { title: true },
      });

      let score = 80; // Default: aligned
      if (book?.title.includes('Not Aligned')) {
        score = 65; // Below threshold (70)
      } else if (book?.title.includes('Globally Aligned')) {
        score = 95; // Above globally aligned threshold (90)
      }

      // Update book with evaluation results
      await prisma.book.update({
        where: { id: bookId },
        data: {
          evaluationStatus: 'completed',
          biblicalAlignmentScore: score,
          visibilityTier: score >= 90 ? 'globally_aligned' : score >= 70 ? 'conceptually_aligned' : 'not_aligned',
          theologicalStrengths: [`Mock strength for ${book?.title}`],
          theologicalConcerns: score < 70 ? ['Mock concern'] : [],
          scoringReasoning: `Mock evaluation for ${book?.title}`,
        },
      });
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (notAlignedBookId) {
      await prisma.book.delete({ where: { id: notAlignedBookId } }).catch(() => {});
    }
    if (alignedBookId) {
      await prisma.book.delete({ where: { id: alignedBookId } }).catch(() => {});
    }

    // Cleanup test fixtures
    await prisma.organizationMember.deleteMany({
      where: { userId: 'test-user-id' },
    }).catch(() => {});

    await prisma.organizationRole.delete({
      where: { id: 'test-role-id' },
    }).catch(() => {});

    await prisma.organization.delete({
      where: { id: 'test-org-id' },
    }).catch(() => {});

    await prisma.user.delete({
      where: { id: 'test-user-id' },
    }).catch(() => {});

    // Close module
    await moduleRef.close();

    // Clear mock storage
    mockS3Storage.clear();
  });

  beforeEach(() => {
    // Clear mock call history between tests
    mockPdfMigrationQueue.add.mockClear();
    mockEvaluationQueue.add.mockClear();
  });

  describe('PDF Lifecycle: Upload → Active → Evaluation → Archive (Not Aligned)', () => {
    it('should complete full lifecycle for not-aligned book (score < 70)', async () => {
      // Step 1: Create book
      const bookData = {
        title: 'Test Book Not Aligned',
        author: 'Test Author',
        publisher: 'Test Publisher',
        publicationYear: 2023,
      };

      const book = await prisma.book.create({
        data: {
          ...bookData,
          submittedByOrganizationId: 'test-org-id',
          submittedById: 'test-user-id',
          evaluationStatus: 'pending',
          evaluationVersion: '1.0.0',
          aiModel: 'claude-sonnet-4-20250514',
          genreTag: 'theology',
          visibilityTier: 'not_aligned',
          analysisLevel: 'full_text',
        },
      });

      notAlignedBookId = book.id;

      // Step 2: Upload PDF (saves to temp storage)
      const pdfBuffer = Buffer.from('%PDF-1.4\nTest PDF content for not aligned book\n%%EOF');
      const mockFile = {
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        originalname: 'test-not-aligned.pdf',
      } as Express.Multer.File;

      await bookOrchestrator.uploadPdf(
        notAlignedBookId,
        mockFile,
        'test-user-id',
        'test-org-id',
        undefined
      );

      // Verify temp file was created
      const bookAfterUpload = await prisma.book.findUnique({
        where: { id: notAlignedBookId },
        select: { pdfFilePath: true, pdfFileHash: true, pdfStorageTier: true },
      });

      expect(bookAfterUpload?.pdfFilePath).toBeTruthy();
      expect(bookAfterUpload?.pdfFileHash).toBeTruthy();
      expect(bookAfterUpload?.pdfStorageTier).toBeNull();

      // Verify temp file exists on disk
      const tempFilePath = bookAfterUpload!.pdfFilePath!;
      await expect(fs.access(tempFilePath)).resolves.not.toThrow();

      // Step 3: Process migration job (Temp → S3 Active)
      const migrationJob = {
        name: 'migrate-to-active',
        id: 'test-migration-job-1',
        data: { bookId: notAlignedBookId },
        attemptsMade: 0,
      } as any;

      await pdfMigrationProcessor.process(migrationJob);

      // Verify migration to active tier
      const bookAfterMigration = await prisma.book.findUnique({
        where: { id: notAlignedBookId },
        select: { pdfStorageTier: true, pdfStoragePath: true },
      });

      expect(bookAfterMigration?.pdfStorageTier).toBe('active');
      expect(bookAfterMigration?.pdfStoragePath).toContain('active/books');
      expect(mockS3Storage.has(`active/books/${notAlignedBookId}.pdf`)).toBe(true);

      // Verify temp file was deleted
      await expect(fs.access(tempFilePath)).rejects.toThrow();

      // Step 4: Process evaluation job
      const evaluationJob = {
        name: 'evaluate-book',
        id: 'test-evaluation-job-1',
        data: { bookId: notAlignedBookId },
        attemptsMade: 0,
      } as any;

      await bookEvaluationProcessor.process(evaluationJob);

      // Verify evaluation completed with score < 70
      const bookAfterEvaluation = await prisma.book.findUnique({
        where: { id: notAlignedBookId },
        select: {
          evaluationStatus: true,
          biblicalAlignmentScore: true,
          visibilityTier: true,
        },
      });

      expect(bookAfterEvaluation?.evaluationStatus).toBe('completed');
      expect(bookAfterEvaluation?.biblicalAlignmentScore).toBeLessThan(70);
      expect(bookAfterEvaluation?.visibilityTier).toBe('not_aligned');

      // Verify archival job was queued
      expect(mockPdfMigrationQueue.add).toHaveBeenCalledWith(
        'migrate-to-archived',
        { bookId: notAlignedBookId },
        expect.any(Object)
      );

      // Step 5: Process archival job (Active → Archived/Glacier)
      const archivalJob = {
        name: 'migrate-to-archived',
        id: 'test-archival-job-1',
        data: { bookId: notAlignedBookId },
        attemptsMade: 0,
      } as any;

      await pdfMigrationProcessor.process(archivalJob);

      // Verify migration to archived tier
      const bookAfterArchival = await prisma.book.findUnique({
        where: { id: notAlignedBookId },
        select: { pdfStorageTier: true },
      });

      expect(bookAfterArchival?.pdfStorageTier).toBe('archived');
      expect(mockS3Storage.has(`archived/books/${notAlignedBookId}.pdf`)).toBe(true);
      expect(mockS3Storage.has(`active/books/${notAlignedBookId}.pdf`)).toBe(false);
    }, 30000);
  });

  describe('PDF Lifecycle: Upload → Active → Evaluation → Stay Active (Aligned)', () => {
    it('should keep PDF in active tier for aligned book (score >= 70)', async () => {
      // Step 1: Create book
      const bookData = {
        title: 'Test Book Globally Aligned',
        author: 'Test Author',
        publisher: 'Test Publisher',
        publicationYear: 2023,
      };

      const book = await prisma.book.create({
        data: {
          ...bookData,
          submittedByOrganizationId: 'test-org-id',
          submittedById: 'test-user-id',
          evaluationStatus: 'pending',
          evaluationVersion: '1.0.0',
          aiModel: 'claude-sonnet-4-20250514',
          genreTag: 'theology',
          visibilityTier: 'not_aligned',
          analysisLevel: 'full_text',
        },
      });

      alignedBookId = book.id;

      // Step 2: Upload PDF
      const pdfBuffer = Buffer.from('%PDF-1.4\nTest PDF content for aligned book\n%%EOF');
      const mockFile = {
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        originalname: 'test-aligned.pdf',
      } as Express.Multer.File;

      await bookOrchestrator.uploadPdf(
        alignedBookId,
        mockFile,
        'test-user-id',
        'test-org-id',
        undefined
      );

      // Verify temp file was created
      const bookAfterUpload = await prisma.book.findUnique({
        where: { id: alignedBookId },
        select: { pdfFilePath: true, pdfStorageTier: true },
      });

      const tempFilePath = bookAfterUpload!.pdfFilePath!;
      expect(tempFilePath).toBeTruthy();

      // Step 3: Process migration job (Temp → S3 Active)
      const migrationJob = {
        name: 'migrate-to-active',
        id: 'test-migration-job-2',
        data: { bookId: alignedBookId },
        attemptsMade: 0,
      } as any;

      await pdfMigrationProcessor.process(migrationJob);

      // Verify migration to active tier
      const bookAfterMigration = await prisma.book.findUnique({
        where: { id: alignedBookId },
        select: { pdfStorageTier: true },
      });

      expect(bookAfterMigration?.pdfStorageTier).toBe('active');

      // Verify temp file was deleted after migration
      await expect(fs.access(tempFilePath)).rejects.toThrow();

      // Step 4: Process evaluation job
      const evaluationJob = {
        name: 'evaluate-book',
        id: 'test-evaluation-job-2',
        data: { bookId: alignedBookId },
        attemptsMade: 0,
      } as any;

      // Clear previous queue calls
      mockPdfMigrationQueue.add.mockClear();

      await bookEvaluationProcessor.process(evaluationJob);

      // Verify evaluation completed with score >= 70
      const bookAfterEvaluation = await prisma.book.findUnique({
        where: { id: alignedBookId },
        select: {
          evaluationStatus: true,
          biblicalAlignmentScore: true,
          visibilityTier: true,
          pdfStorageTier: true,
        },
      });

      expect(bookAfterEvaluation?.evaluationStatus).toBe('completed');
      expect(bookAfterEvaluation?.biblicalAlignmentScore).toBeGreaterThanOrEqual(70);
      expect(bookAfterEvaluation?.visibilityTier).toBe('globally_aligned');
      expect(bookAfterEvaluation?.pdfStorageTier).toBe('active');

      // Verify archival job was NOT queued
      expect(mockPdfMigrationQueue.add).not.toHaveBeenCalledWith(
        'migrate-to-archived',
        expect.any(Object),
        expect.any(Object)
      );

      // Verify PDF stayed in active tier (NOT archived)
      expect(mockS3Storage.has(`active/books/${alignedBookId}.pdf`)).toBe(true);
      expect(mockS3Storage.has(`archived/books/${alignedBookId}.pdf`)).toBe(false);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle missing PDF gracefully during migration', async () => {
      const book = await prisma.book.create({
        data: {
          title: 'Book Without PDF',
          author: 'Test Author',
          submittedByOrganizationId: 'test-org-id',
          submittedById: 'test-user-id',
          evaluationStatus: 'pending',
          pdfFilePath: '/nonexistent/path/file.pdf',
          evaluationVersion: '1.0.0',
          aiModel: 'claude-sonnet-4-20250514',
          genreTag: 'theology',
          visibilityTier: 'not_aligned',
          analysisLevel: 'full_text',
        },
      });

      const migrationJob = {
        name: 'migrate-to-active',
        id: 'test-migration-job-error',
        data: { bookId: book.id },
        attemptsMade: 0,
      } as any;

      await expect(pdfMigrationProcessor.process(migrationJob)).rejects.toThrow();

      // Cleanup
      await prisma.book.delete({ where: { id: book.id } }).catch(() => {});
    });

    it('should skip archival if book has no PDF', async () => {
      const book = await prisma.book.create({
        data: {
          title: 'Book Without PDF for Archival',
          author: 'Test Author',
          submittedByOrganizationId: 'test-org-id',
          submittedById: 'test-user-id',
          evaluationStatus: 'completed',
          biblicalAlignmentScore: 50,
          pdfStorageTier: null,
          evaluationVersion: '1.0.0',
          aiModel: 'claude-sonnet-4-20250514',
          genreTag: 'theology',
          visibilityTier: 'not_aligned',
          analysisLevel: 'full_text',
        },
      });

      const archivalJob = {
        name: 'migrate-to-archived',
        id: 'test-archival-job-no-pdf',
        data: { bookId: book.id },
        attemptsMade: 0,
      } as any;

      // Should not throw - just logs and returns
      await expect(pdfMigrationProcessor.process(archivalJob)).resolves.not.toThrow();

      // Cleanup
      await prisma.book.delete({ where: { id: book.id } }).catch(() => {});
    });

    it('should not re-archive already archived PDF', async () => {
      const book = await prisma.book.create({
        data: {
          title: 'Already Archived Book',
          author: 'Test Author',
          submittedByOrganizationId: 'test-org-id',
          submittedById: 'test-user-id',
          evaluationStatus: 'completed',
          biblicalAlignmentScore: 50,
          pdfStorageTier: 'archived',
          pdfStoragePath: 's3://archived/books/test.pdf',
          evaluationVersion: '1.0.0',
          aiModel: 'claude-sonnet-4-20250514',
          genreTag: 'theology',
          visibilityTier: 'not_aligned',
          analysisLevel: 'full_text',
        },
      });

      const archivalJob = {
        name: 'migrate-to-archived',
        id: 'test-archival-job-already-archived',
        data: { bookId: book.id },
        attemptsMade: 0,
      } as any;

      await expect(pdfMigrationProcessor.process(archivalJob)).resolves.not.toThrow();

      // Verify tier unchanged
      const bookAfter = await prisma.book.findUnique({
        where: { id: book.id },
        select: { pdfStorageTier: true },
      });

      expect(bookAfter?.pdfStorageTier).toBe('archived');

      // Cleanup
      await prisma.book.delete({ where: { id: book.id } }).catch(() => {});
    });
  });
});
