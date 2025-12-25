import { Test, TestingModule } from '@nestjs/testing';
import { StorageOrchestratorService } from './storage-orchestrator.service';
import { S3StorageProvider } from '../providers/storage/s3-storage.provider';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

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
  });
});
