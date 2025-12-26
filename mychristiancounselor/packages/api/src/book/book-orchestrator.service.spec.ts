import { Test } from '@nestjs/testing';
import { BookOrchestratorService } from './book-orchestrator.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { StorageOrchestratorService } from './services/storage-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { queueConfig } from '../config/queue.config';

describe('BookOrchestratorService', () => {
  let orchestrator: BookOrchestratorService;
  let metadataService: MetadataAggregatorService;
  let duplicateDetector: DuplicateDetectorService;
  let storageOrchestrator: jest.Mocked<StorageOrchestratorService>;
  let evaluationQueue: any;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BookOrchestratorService,
        {
          provide: MetadataAggregatorService,
          useValue: { lookup: jest.fn() },
        },
        {
          provide: DuplicateDetectorService,
          useValue: { findDuplicate: jest.fn() },
        },
        {
          provide: StorageOrchestratorService,
          useValue: {
            validatePdfUpload: jest.fn().mockResolvedValue(undefined),
            extractPdfMetadata: jest.fn().mockResolvedValue({ hash: 'new-hash', year: 2023 }),
          },
        },
        {
          provide: `BullQueue_${queueConfig.evaluationQueue.name}`,
          useValue: {
            add: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            book: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
            bookEndorsement: { create: jest.fn(), findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    orchestrator = module.get<BookOrchestratorService>(BookOrchestratorService);
    metadataService = module.get<MetadataAggregatorService>(MetadataAggregatorService);
    duplicateDetector = module.get<DuplicateDetectorService>(DuplicateDetectorService);
    storageOrchestrator = module.get(StorageOrchestratorService);
    evaluationQueue = module.get(`BullQueue_${queueConfig.evaluationQueue.name}`);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should orchestrate book creation flow', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'C.S. Lewis',
      isbn: '9780060652920',
    };

    jest.spyOn(metadataService, 'lookup').mockResolvedValue(metadata);
    jest.spyOn(duplicateDetector, 'findDuplicate').mockResolvedValue(null);
    jest.spyOn(prisma.book, 'create').mockResolvedValue({
      id: 'new-book-id',
      ...metadata,
    } as any);
    jest.spyOn(prisma.bookEndorsement, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.bookEndorsement, 'create').mockResolvedValue({} as any);

    const result = await orchestrator.createBook(
      'user-id',
      'org-id',
      { isbn: '9780060652920' },
    );

    expect(result.id).toBe('new-book-id');
    expect(result.status).toBe('pending');
    expect(metadataService.lookup).toHaveBeenCalledWith('9780060652920');
    expect(duplicateDetector.findDuplicate).toHaveBeenCalledWith(metadata);
    expect(prisma.book.create).toHaveBeenCalled();
    expect(evaluationQueue.add).toHaveBeenCalledWith(
      'evaluate-book',
      { bookId: 'new-book-id' },
      expect.objectContaining({
        priority: 2,
        attempts: 3,
        backoff: expect.objectContaining({
          type: 'exponential',
          delay: 1000,
        }),
      })
    );
  });

  it('should handle duplicate books', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'C.S. Lewis',
      isbn: '9780060652920',
    };

    jest.spyOn(metadataService, 'lookup').mockResolvedValue(metadata);
    jest.spyOn(duplicateDetector, 'findDuplicate').mockResolvedValue('existing-book-id');
    jest.spyOn(prisma.bookEndorsement, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.bookEndorsement, 'create').mockResolvedValue({} as any);

    const result = await orchestrator.createBook(
      'user-id',
      'org-id',
      { isbn: '9780060652920' },
    );

    expect(result.id).toBe('existing-book-id');
    expect(result.status).toBe('existing');
    expect(result.message).toContain('already exists');
  });

  describe('uploadPdf with validation', () => {
    it('should validate PDF if book already has pdfFileHash', async () => {
      const existingBook = {
        id: 'book-123',
        submittedByOrganizationId: 'org-123',
        evaluationStatus: 'pending',
        pdfFilePath: null,
        pdfFileHash: 'existing-hash',
        pdfMetadataYear: 2020,
      };
      prisma.book.findUnique.mockResolvedValue(existingBook as any);
      prisma.book.update.mockResolvedValue({} as any);

      const file = {
        buffer: Buffer.from('%PDF-1.4 new pdf content'),
        size: 1000,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await orchestrator.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

      expect(storageOrchestrator.validatePdfUpload).toHaveBeenCalledWith('book-123', file.buffer);
    });

    it('should not validate if book has no existing PDF', async () => {
      const newBook = {
        id: 'book-123',
        submittedByOrganizationId: 'org-123',
        evaluationStatus: 'pending',
        pdfFilePath: null,
        pdfFileHash: null,
      };
      prisma.book.findUnique.mockResolvedValue(newBook as any);
      prisma.book.update.mockResolvedValue({} as any);

      const file = {
        buffer: Buffer.from('%PDF-1.4 pdf content'),
        size: 1000,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await orchestrator.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

      expect(storageOrchestrator.validatePdfUpload).not.toHaveBeenCalled();
    });

    it('should extract metadata and save to database', async () => {
      const book = {
        id: 'book-123',
        submittedByOrganizationId: 'org-123',
        evaluationStatus: 'pending',
        pdfFilePath: null,
        pdfFileHash: null,
      };
      prisma.book.findUnique.mockResolvedValue(book as any);
      prisma.book.update.mockResolvedValue({} as any);

      const file = {
        buffer: Buffer.from('%PDF-1.4 pdf content'),
        size: 1000,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      const metadata = { hash: 'sha256-hash', year: 2023 };
      storageOrchestrator.extractPdfMetadata.mockResolvedValue(metadata);

      await orchestrator.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

      expect(prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pdfFileHash: 'sha256-hash',
            pdfMetadataYear: 2023,
          }),
        })
      );
    });

    it('should not perform file operations if validation fails', async () => {
      const existingBook = {
        id: 'book-123',
        submittedByOrganizationId: 'org-123',
        evaluationStatus: 'pending',
        pdfFilePath: null,
        pdfFileHash: 'existing-hash',
        pdfMetadataYear: 2020,
      };
      prisma.book.findUnique.mockResolvedValue(existingBook as any);

      // Mock validation to reject (e.g., older edition)
      const validationError = new Error('Older edition rejected');
      storageOrchestrator.validatePdfUpload.mockRejectedValue(validationError);

      const file = {
        buffer: Buffer.from('%PDF-1.4 new pdf'),
        size: 1000,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await expect(
        orchestrator.uploadPdf('book-123', file, 'user-123', 'org-123', undefined)
      ).rejects.toThrow('Older edition rejected');

      // Verify database was not updated
      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it('should not perform file operations if metadata extraction fails', async () => {
      const book = {
        id: 'book-123',
        submittedByOrganizationId: 'org-123',
        evaluationStatus: 'pending',
        pdfFilePath: '/uploads/temp/pdfs/book-123-old.pdf',
        pdfFileHash: null,
      };
      prisma.book.findUnique.mockResolvedValue(book as any);

      // Mock metadata extraction to fail
      const extractionError = new Error('Malformed PDF');
      storageOrchestrator.extractPdfMetadata.mockRejectedValue(extractionError);

      const file = {
        buffer: Buffer.from('%PDF-1.4 corrupted content'),
        size: 1000,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await expect(
        orchestrator.uploadPdf('book-123', file, 'user-123', 'org-123', undefined)
      ).rejects.toThrow('Malformed PDF');

      // Verify database was not updated (old file should still exist)
      expect(prisma.book.update).not.toHaveBeenCalled();
    });
  });
});
