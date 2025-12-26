import { Test, TestingModule } from '@nestjs/testing';
import { StorageOrchestratorService } from './storage-orchestrator.service';
import { S3StorageProvider } from '../providers/storage/s3-storage.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

describe('StorageOrchestratorService', () => {
  let service: StorageOrchestratorService;
  let s3Provider: jest.Mocked<S3StorageProvider>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageOrchestratorService,
        {
          provide: S3StorageProvider,
          useValue: {
            upload: jest.fn(),
            download: jest.fn(),
            move: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            book: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageOrchestratorService>(StorageOrchestratorService);
    s3Provider = module.get(S3StorageProvider);
    prisma = module.get(PrismaService);
  });

  describe('extractPdfMetadata', () => {
    it('should extract SHA-256 hash from PDF buffer', async () => {
      const testBuffer = Buffer.from('test pdf content');
      const expectedHash = crypto.createHash('sha256').update(testBuffer).digest('hex');

      const result = await service.extractPdfMetadata(testBuffer);

      expect(result.hash).toBe(expectedHash);
    });

    it('should extract publication year from PDF metadata', async () => {
      // PDF with /CreationDate metadata: D:20230515120000
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<</CreationDate(D:20230515120000)>>\nendobj\n');

      const result = await service.extractPdfMetadata(pdfBuffer);

      expect(result.year).toBe(2023);
    });

    it('should return undefined year if no date in PDF metadata', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<</Title(Test)>>\nendobj\n');

      const result = await service.extractPdfMetadata(pdfBuffer);

      expect(result.year).toBeUndefined();
    });

    it('should return undefined for unreasonable years in PDF metadata', async () => {
      // PDF with unreasonable year (year 0500)
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<</CreationDate(D:05001231120000)>>\nendobj\n');

      const result = await service.extractPdfMetadata(pdfBuffer);

      expect(result.year).toBeUndefined();
    });
  });

  describe('validatePdfUpload', () => {
    const mockBook = {
      id: 'book-123',
      pdfFileHash: 'existing-hash',
      pdfMetadataYear: 2020,
    };

    beforeEach(() => {
      prisma.book.findUnique.mockResolvedValue(mockBook as any);
    });

    it('should throw NotFoundException if book does not exist', async () => {
      prisma.book.findUnique.mockResolvedValue(null);
      const newPdf = Buffer.from('new pdf');

      await expect(service.validatePdfUpload('nonexistent-id', newPdf))
        .rejects.toThrow(NotFoundException);
    });

    it('should accept upload if no existing PDF', async () => {
      prisma.book.findUnique.mockResolvedValue({ id: 'book-123', pdfFileHash: null } as any);
      const newPdf = Buffer.from('new pdf');

      await expect(service.validatePdfUpload('book-123', newPdf)).resolves.not.toThrow();
    });

    it('should reject if hash matches existing PDF', async () => {
      const existingHash = crypto.createHash('sha256').update(Buffer.from('same')).digest('hex');
      prisma.book.findUnique.mockResolvedValue({ pdfFileHash: existingHash } as any);
      const newPdf = Buffer.from('same');

      await expect(service.validatePdfUpload('book-123', newPdf))
        .rejects.toThrow('This PDF is identical to the existing file');
    });

    it('should accept if new PDF has date and existing does not', async () => {
      prisma.book.findUnique.mockResolvedValue({
        pdfFileHash: 'different-hash',
        pdfMetadataYear: null
      } as any);
      const newPdf = Buffer.from('%PDF-1.4\n<</CreationDate(D:20230515)>>');

      await expect(service.validatePdfUpload('book-123', newPdf)).resolves.not.toThrow();
    });

    it('should reject if existing has date but new does not', async () => {
      prisma.book.findUnique.mockResolvedValue({
        pdfFileHash: 'different-hash',
        pdfMetadataYear: 2020
      } as any);
      const newPdf = Buffer.from('%PDF-1.4\n<</Title(Test)>>');

      await expect(service.validatePdfUpload('book-123', newPdf))
        .rejects.toThrow('Cannot replace dated PDF with undated PDF');
    });

    it('should accept if new year > existing year', async () => {
      prisma.book.findUnique.mockResolvedValue({
        pdfFileHash: 'different-hash',
        pdfMetadataYear: 2020
      } as any);
      const newPdf = Buffer.from('%PDF-1.4\n<</CreationDate(D:20230515)>>');

      await expect(service.validatePdfUpload('book-123', newPdf)).resolves.not.toThrow();
    });

    it('should reject if new year <= existing year', async () => {
      prisma.book.findUnique.mockResolvedValue({
        pdfFileHash: 'different-hash',
        pdfMetadataYear: 2023
      } as any);
      const newPdf = Buffer.from('%PDF-1.4\n<</CreationDate(D:20200515)>>');

      await expect(service.validatePdfUpload('book-123', newPdf))
        .rejects.toThrow('Only newer editions can replace existing PDFs');
    });
  });

  describe('migratePdfToActiveTier', () => {
    const bookId = 'book-123';
    const tempFilePath = `/path/to/temp/${bookId}-1234567890.pdf`;

    beforeEach(() => {
      prisma.book.findUnique.mockResolvedValue({
        id: bookId,
        pdfFilePath: tempFilePath,
      } as any);

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('pdf content') as any);
      jest.spyOn(fs, 'unlink').mockResolvedValue(undefined as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should read PDF from temp, upload to S3 active tier', async () => {
      s3Provider.upload.mockResolvedValue(`active/books/${bookId}.pdf`);

      await service.migratePdfToActiveTier(bookId);

      expect(fs.readFile).toHaveBeenCalledWith(tempFilePath);
      expect(s3Provider.upload).toHaveBeenCalledWith(
        bookId,
        expect.any(Buffer),
        'active'
      );
    });

    it('should update database with S3 path and tier', async () => {
      const s3Path = `s3://bucket/active/books/${bookId}.pdf`;
      s3Provider.upload.mockResolvedValue(`active/books/${bookId}.pdf`);

      await service.migratePdfToActiveTier(bookId);

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: {
          pdfStoragePath: expect.stringContaining('active/books'),
          pdfStorageTier: 'active',
        },
      });
    });

    it('should delete temp file after successful S3 upload', async () => {
      s3Provider.upload.mockResolvedValue(`active/books/${bookId}.pdf`);

      await service.migratePdfToActiveTier(bookId);

      expect(fs.unlink).toHaveBeenCalledWith(tempFilePath);
    });

    it('should not delete temp file if S3 upload fails', async () => {
      s3Provider.upload.mockRejectedValue(new Error('S3 error'));

      await expect(service.migratePdfToActiveTier(bookId)).rejects.toThrow('S3 error');

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should rollback S3 upload if database update fails', async () => {
      const s3Key = `active/books/${bookId}.pdf`;
      s3Provider.upload.mockResolvedValue(s3Key);
      prisma.book.update.mockRejectedValue(new Error('DB error'));

      await expect(service.migratePdfToActiveTier(bookId)).rejects.toThrow('DB error');

      expect(s3Provider.delete).toHaveBeenCalledWith(s3Key);
      expect(fs.unlink).not.toHaveBeenCalled(); // Should not delete temp file if DB fails
    });

    it('should log warning if temp file deletion fails but continue', async () => {
      const s3Key = `active/books/${bookId}.pdf`;
      s3Provider.upload.mockResolvedValue(s3Key);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Unlink error'));

      await expect(service.migratePdfToActiveTier(bookId)).resolves.not.toThrow();

      expect(prisma.book.update).toHaveBeenCalled(); // DB update should succeed
      // Migration should complete successfully despite unlink failure
    });
  });

  describe('migratePdfToArchivedTier', () => {
    const bookId = 'book-123';

    beforeEach(() => {
      prisma.book.findUnique.mockResolvedValue({
        id: bookId,
        pdfStorageTier: 'active',
      } as any);
    });

    it('should move PDF from active to archived tier in S3', async () => {
      await service.migratePdfToArchivedTier(bookId);

      expect(s3Provider.move).toHaveBeenCalledWith(bookId, 'active', 'archived');
    });

    it('should update database with archived tier', async () => {
      await service.migratePdfToArchivedTier(bookId);

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: {
          pdfStorageTier: 'archived',
        },
      });
    });

    it('should handle already archived PDFs gracefully', async () => {
      prisma.book.findUnique.mockResolvedValue({
        id: bookId,
        pdfStorageTier: 'archived',
      } as any);

      await service.migratePdfToArchivedTier(bookId);

      expect(s3Provider.move).not.toHaveBeenCalled();
    });
  });
});
