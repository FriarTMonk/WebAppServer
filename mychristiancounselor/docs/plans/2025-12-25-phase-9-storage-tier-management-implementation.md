# Phase 9: Storage Tier Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement automated PDF storage lifecycle with intelligent S3 tier placement based on biblical alignment scores.

**Architecture:** Background jobs migrate PDFs from temp disk → S3 active tier → S3 Glacier (if <70% aligned). Upload validation prevents gaming via hash and date comparison. Score-based conditional archival optimizes costs while maintaining instant access for viewable books.

**Tech Stack:** NestJS, BullMQ, AWS SDK S3, Prisma, pdf-parse, crypto (SHA-256)

---

## Task 1: Database Migration - Add PDF Validation Fields

**Files:**
- Create: `packages/api/prisma/migrations/20251225140000_add_pdf_validation_fields/migration.sql`
- Modify: `packages/api/prisma/schema.prisma`

**⚠️ IMPORTANT: Follow PRISMA-SAFE-PROCESS.md - NEVER drop tables!**

**Step 1: Add fields to Book model in schema**

Edit `packages/api/prisma/schema.prisma`, find the Book model and add:

```prisma
model Book {
  // ... existing fields

  pdfFileHash       String?  // SHA-256 hash for duplicate detection
  pdfMetadataYear   Int?     // Year extracted from PDF metadata
}
```

**Step 2: Create migration (WITHOUT applying)**

Run: `npx prisma migrate dev --name add_pdf_validation_fields --create-only`

This creates the migration file WITHOUT applying it to the database.

**Step 3: CRITICAL - Review migration SQL for safety**

Open: `packages/api/prisma/migrations/20251225140000_add_pdf_validation_fields/migration.sql`

**Check for:**
- ✅ ALTER TABLE ADD COLUMN statements (safe)
- ❌ DROP TABLE statements (DANGEROUS - STOP if present)
- ❌ DROP COLUMN statements (DANGEROUS - STOP if present)

Expected migration content:
```sql
-- AlterTable
ALTER TABLE "Book" ADD COLUMN "pdfFileHash" TEXT;
ALTER TABLE "Book" ADD COLUMN "pdfMetadataYear" INTEGER;
```

**If you see any DROP statements, STOP and ask for approval!**

**Step 4: Apply migration (only if Step 3 passed)**

Run: `npx prisma migrate deploy`

Expected output: Migration applied successfully

**Step 5: Generate Prisma Client**

Run: `npx prisma generate`

Expected: Client generated with new fields

**Step 6: Verify fields exist in database**

Run: `psql -d <database> -c "\d \"Book\"" | grep -E "(pdfFileHash|pdfMetadataYear)"`
Expected: Both fields listed

**Step 7: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(db): add PDF validation fields for hash and metadata year

Following PRISMA-SAFE-PROCESS.md:
- Used --create-only to review before applying
- Verified no DROP statements in migration
- Only adds columns (safe operation)"
```

---

## Task 2: Queue Configuration - Add PDF Migration Queue

**Files:**
- Modify: `packages/api/src/config/queue.config.ts`

**Step 1: Add pdfMigrationQueue configuration**

Edit `packages/api/src/config/queue.config.ts`:

```typescript
export const queueConfig = {
  evaluationQueue: {
    // ... existing config
  },

  // NEW: PDF Migration Queue
  pdfMigrationQueue: {
    name: 'pdf-migration',
    concurrency: 3,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 500,
    },
  },

  defaultJobOptions: {
    // ... existing
  },
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p packages/api/tsconfig.json`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/api/src/config/queue.config.ts
git commit -m "feat(queue): add PDF migration queue configuration"
```

---

## Task 3: StorageOrchestratorService - PDF Metadata Extraction

**Files:**
- Create: `packages/api/src/book/services/storage-orchestrator.service.ts`
- Create: `packages/api/src/book/services/storage-orchestrator.service.spec.ts`

**Step 1: Write failing test for extractPdfMetadata()**

Create `packages/api/src/book/services/storage-orchestrator.service.spec.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts`
Expected: FAIL - "Cannot find module './storage-orchestrator.service'"

**Step 3: Create minimal service implementation**

Create `packages/api/src/book/services/storage-orchestrator.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { S3StorageProvider } from '../providers/storage/s3-storage.provider';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

@Injectable()
export class StorageOrchestratorService {
  private readonly logger = new Logger(StorageOrchestratorService.name);

  constructor(
    private readonly s3Provider: S3StorageProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Extract SHA-256 hash and publication year from PDF
   */
  async extractPdfMetadata(buffer: Buffer): Promise<{ hash: string; year?: number }> {
    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Extract year from PDF metadata
    let year: number | undefined;

    // Convert buffer to string to search for CreationDate or ModDate
    const pdfString = buffer.toString('binary');

    // Match PDF date format: D:YYYYMMDDHHmmSS
    const dateMatch = pdfString.match(/\/(?:CreationDate|ModDate)\(D:(\d{4})/);
    if (dateMatch) {
      year = parseInt(dateMatch[1], 10);
    }

    return { hash, year };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/api/src/book/services/storage-orchestrator.service.ts packages/api/src/book/services/storage-orchestrator.service.spec.ts
git commit -m "feat(storage): add PDF metadata extraction (hash + year)"
```

---

## Task 4: StorageOrchestratorService - PDF Upload Validation

**Files:**
- Modify: `packages/api/src/book/services/storage-orchestrator.service.ts`
- Modify: `packages/api/src/book/services/storage-orchestrator.service.spec.ts`

**Step 1: Write failing tests for validatePdfUpload()**

Add to `storage-orchestrator.service.spec.ts`:

```typescript
describe('validatePdfUpload', () => {
  const mockBook = {
    id: 'book-123',
    pdfFileHash: 'existing-hash',
    pdfMetadataYear: 2020,
  };

  beforeEach(() => {
    prisma.book.findUnique.mockResolvedValue(mockBook as any);
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
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts -t validatePdfUpload`
Expected: FAIL - "service.validatePdfUpload is not a function"

**Step 3: Implement validatePdfUpload()**

Add to `storage-orchestrator.service.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';

/**
 * Validate PDF upload against existing PDF (prevents gaming)
 * Checks: Hash duplication, publication date comparison
 */
async validatePdfUpload(bookId: string, newPdfBuffer: Buffer): Promise<void> {
  const book = await this.prisma.book.findUnique({
    where: { id: bookId },
    select: { pdfFileHash: true, pdfMetadataYear: true },
  });

  // No existing PDF - always accept
  if (!book.pdfFileHash) {
    return;
  }

  // Extract metadata from new PDF
  const newMetadata = await this.extractPdfMetadata(newPdfBuffer);

  // Step 1: Hash check (fast rejection)
  if (newMetadata.hash === book.pdfFileHash) {
    throw new BadRequestException('This PDF is identical to the existing file');
  }

  // Step 2: Date comparison
  const existingYear = book.pdfMetadataYear;
  const newYear = newMetadata.year;

  if (!existingYear && !newYear) {
    // Both undated - hash should have caught duplicate, but reject anyway
    throw new BadRequestException('Cannot determine publication year from PDF metadata');
  }

  if (!existingYear && newYear) {
    // New has date, existing doesn't - accept dated version
    return;
  }

  if (existingYear && !newYear) {
    // Existing has date, new doesn't - reject
    throw new BadRequestException('Cannot replace dated PDF with undated PDF');
  }

  if (existingYear && newYear) {
    if (newYear > existingYear) {
      // Newer edition - accept
      return;
    } else {
      // Same or older edition - reject
      throw new BadRequestException(
        `Only newer editions can replace existing PDFs (uploaded: ${newYear}, current: ${existingYear})`
      );
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add packages/api/src/book/services/storage-orchestrator.service.ts packages/api/src/book/services/storage-orchestrator.service.spec.ts
git commit -m "feat(storage): add PDF upload validation logic"
```

---

## Task 5: StorageOrchestratorService - Migrate to Active Tier

**Files:**
- Modify: `packages/api/src/book/services/storage-orchestrator.service.ts`
- Modify: `packages/api/src/book/services/storage-orchestrator.service.spec.ts`

**Step 1: Write failing tests for migratePdfToActiveTier()**

Add to `storage-orchestrator.service.spec.ts`:

```typescript
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
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts -t migratePdfToActiveTier`
Expected: FAIL - "service.migratePdfToActiveTier is not a function"

**Step 3: Implement migratePdfToActiveTier()**

Add to `storage-orchestrator.service.ts`:

```typescript
/**
 * Migrate PDF from temp storage to S3 active tier
 * Temp → S3 Standard → Delete temp
 */
async migratePdfToActiveTier(bookId: string): Promise<void> {
  this.logger.log(`Migrating PDF to active tier for book ${bookId}`);

  // Get book with temp file path
  const book = await this.prisma.book.findUnique({
    where: { id: bookId },
    select: { pdfFilePath: true },
  });

  if (!book?.pdfFilePath) {
    throw new Error(`No PDF file path found for book ${bookId}`);
  }

  // Read PDF from temp storage
  const pdfBuffer = await fs.readFile(book.pdfFilePath);

  // Upload to S3 active tier
  const s3Key = await this.s3Provider.upload(bookId, pdfBuffer, 'active');

  // Update database with S3 path and tier
  await this.prisma.book.update({
    where: { id: bookId },
    data: {
      pdfStoragePath: `s3://${s3Key}`,
      pdfStorageTier: 'active',
    },
  });

  // Delete temp file
  await fs.unlink(book.pdfFilePath);

  this.logger.log(`PDF migrated to active tier: ${s3Key}`);
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts -t migratePdfToActiveTier`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/api/src/book/services/storage-orchestrator.service.ts packages/api/src/book/services/storage-orchestrator.service.spec.ts
git commit -m "feat(storage): implement PDF migration to S3 active tier"
```

---

## Task 6: StorageOrchestratorService - Migrate to Archived Tier

**Files:**
- Modify: `packages/api/src/book/services/storage-orchestrator.service.ts`
- Modify: `packages/api/src/book/services/storage-orchestrator.service.spec.ts`

**Step 1: Write failing tests for migratePdfToArchivedTier()**

Add to `storage-orchestrator.service.spec.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts -t migratePdfToArchivedTier`
Expected: FAIL - "service.migratePdfToArchivedTier is not a function"

**Step 3: Implement migratePdfToArchivedTier()**

Add to `storage-orchestrator.service.ts`:

```typescript
/**
 * Migrate PDF from S3 active tier to archived tier (Glacier)
 * Only for books <70% aligned
 */
async migratePdfToArchivedTier(bookId: string): Promise<void> {
  this.logger.log(`Migrating PDF to archived tier for book ${bookId}`);

  // Get current storage tier
  const book = await this.prisma.book.findUnique({
    where: { id: bookId },
    select: { pdfStorageTier: true },
  });

  // Already archived - skip
  if (book?.pdfStorageTier === 'archived') {
    this.logger.log(`PDF already in archived tier for book ${bookId}`);
    return;
  }

  // Move from active to archived in S3
  await this.s3Provider.move(bookId, 'active', 'archived');

  // Update database
  await this.prisma.book.update({
    where: { id: bookId },
    data: {
      pdfStorageTier: 'archived',
    },
  });

  this.logger.log(`PDF migrated to archived tier for book ${bookId}`);
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/services/storage-orchestrator.service.spec.ts -t migratePdfToArchivedTier`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/api/src/book/services/storage-orchestrator.service.ts packages/api/src/book/services/storage-orchestrator.service.spec.ts
git commit -m "feat(storage): implement PDF migration to S3 archived tier"
```

---

## Task 7: PdfMigrationProcessor - Queue Job Handlers

**Files:**
- Create: `packages/api/src/book/processors/pdf-migration.processor.ts`
- Create: `packages/api/src/book/processors/pdf-migration.processor.spec.ts`

**Step 1: Write failing tests for job handlers**

Create `packages/api/src/book/processors/pdf-migration.processor.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PdfMigrationProcessor } from './pdf-migration.processor';
import { StorageOrchestratorService } from '../services/storage-orchestrator.service';
import { Job } from 'bullmq';

describe('PdfMigrationProcessor', () => {
  let processor: PdfMigrationProcessor;
  let storageOrchestrator: jest.Mocked<StorageOrchestratorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfMigrationProcessor,
        {
          provide: StorageOrchestratorService,
          useValue: {
            migratePdfToActiveTier: jest.fn(),
            migratePdfToArchivedTier: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<PdfMigrationProcessor>(PdfMigrationProcessor);
    storageOrchestrator = module.get(StorageOrchestratorService);
  });

  describe('handleMigrateToActive', () => {
    it('should call migratePdfToActiveTier with bookId', async () => {
      const job = {
        data: { bookId: 'book-123' },
      } as Job<{ bookId: string }>;

      await processor.handleMigrateToActive(job);

      expect(storageOrchestrator.migratePdfToActiveTier).toHaveBeenCalledWith('book-123');
    });

    it('should propagate errors for retry', async () => {
      const job = {
        data: { bookId: 'book-123' },
      } as Job<{ bookId: string }>;
      storageOrchestrator.migratePdfToActiveTier.mockRejectedValue(new Error('S3 error'));

      await expect(processor.handleMigrateToActive(job)).rejects.toThrow('S3 error');
    });
  });

  describe('handleMigrateToArchived', () => {
    it('should call migratePdfToArchivedTier with bookId', async () => {
      const job = {
        data: { bookId: 'book-456' },
      } as Job<{ bookId: string }>;

      await processor.handleMigrateToArchived(job);

      expect(storageOrchestrator.migratePdfToArchivedTier).toHaveBeenCalledWith('book-456');
    });

    it('should propagate errors for retry', async () => {
      const job = {
        data: { bookId: 'book-456' },
      } as Job<{ bookId: string }>;
      storageOrchestrator.migratePdfToArchivedTier.mockRejectedValue(new Error('Glacier error'));

      await expect(processor.handleMigrateToArchived(job)).rejects.toThrow('Glacier error');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/processors/pdf-migration.processor.spec.ts`
Expected: FAIL - "Cannot find module"

**Step 3: Implement processor**

Create `packages/api/src/book/processors/pdf-migration.processor.ts`:

```typescript
import { Processor, Process } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageOrchestratorService } from '../services/storage-orchestrator.service';
import { queueConfig } from '../../config/queue.config';

@Processor(queueConfig.pdfMigrationQueue.name)
export class PdfMigrationProcessor {
  private readonly logger = new Logger(PdfMigrationProcessor.name);

  constructor(
    private readonly storageOrchestrator: StorageOrchestratorService,
  ) {}

  /**
   * Handle migrate-to-active job
   * Temp → S3 active tier
   */
  @Process('migrate-to-active')
  async handleMigrateToActive(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    this.logger.log(`Processing migrate-to-active for book ${bookId}`);

    await this.storageOrchestrator.migratePdfToActiveTier(bookId);

    this.logger.log(`Completed migrate-to-active for book ${bookId}`);
  }

  /**
   * Handle migrate-to-archived job
   * S3 active → S3 archived (Glacier)
   */
  @Process('migrate-to-archived')
  async handleMigrateToArchived(job: Job<{ bookId: string }>): Promise<void> {
    const { bookId } = job.data;
    this.logger.log(`Processing migrate-to-archived for book ${bookId}`);

    await this.storageOrchestrator.migratePdfToArchivedTier(bookId);

    this.logger.log(`Completed migrate-to-archived for book ${bookId}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/processors/pdf-migration.processor.spec.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/api/src/book/processors/pdf-migration.processor.ts packages/api/src/book/processors/pdf-migration.processor.spec.ts
git commit -m "feat(queue): add PDF migration queue processor"
```

---

## Task 8: Register Components in BookModule

**Files:**
- Modify: `packages/api/src/book/book.module.ts`

**Step 1: Import and register new services and processor**

Edit `packages/api/src/book/book.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { queueConfig } from '../config/queue.config';
import { StorageOrchestratorService } from './services/storage-orchestrator.service';
import { PdfMigrationProcessor } from './processors/pdf-migration.processor';
// ... existing imports

@Module({
  imports: [
    // Existing evaluation queue
    BullModule.registerQueue({
      name: queueConfig.evaluationQueue.name,
    }),
    // NEW: PDF migration queue
    BullModule.registerQueue({
      name: queueConfig.pdfMigrationQueue.name,
    }),
  ],
  providers: [
    // ... existing providers
    StorageOrchestratorService, // NEW
    PdfMigrationProcessor,       // NEW
  ],
  exports: [
    // ... existing exports
    StorageOrchestratorService, // NEW
  ],
})
export class BookModule {}
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit -p packages/api/tsconfig.json`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/api/src/book/book.module.ts
git commit -m "feat(module): register storage orchestrator and PDF migration processor"
```

---

## Task 9: Enhance BookOrchestratorService - Add Validation

**Files:**
- Modify: `packages/api/src/book/book-orchestrator.service.ts`
- Modify: `packages/api/src/book/book-orchestrator.service.spec.ts`

**Step 1: Write failing test for PDF validation in uploadPdf()**

Add to `book-orchestrator.service.spec.ts`:

```typescript
describe('uploadPdf with validation', () => {
  it('should validate PDF if book already has pdfFileHash', async () => {
    const existingBook = {
      id: 'book-123',
      pdfFileHash: 'existing-hash',
      pdfMetadataYear: 2020,
    };
    prisma.book.findUnique.mockResolvedValue(existingBook as any);

    const storageOrchestrator = {
      validatePdfUpload: jest.fn().mockResolvedValue(undefined),
      extractPdfMetadata: jest.fn().mockResolvedValue({ hash: 'new-hash', year: 2023 }),
    };

    // Inject mocked storageOrchestrator
    // ... setup service with mock

    const file = {
      buffer: Buffer.from('new pdf'),
      size: 1000,
    } as Express.Multer.File;

    await service.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

    expect(storageOrchestrator.validatePdfUpload).toHaveBeenCalledWith('book-123', file.buffer);
  });

  it('should extract metadata and save to database', async () => {
    const file = {
      buffer: Buffer.from('pdf'),
      size: 1000,
    } as Express.Multer.File;

    const metadata = { hash: 'sha256-hash', year: 2023 };
    storageOrchestrator.extractPdfMetadata.mockResolvedValue(metadata);

    await service.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pdfFileHash: 'sha256-hash',
          pdfMetadataYear: 2023,
        }),
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/book-orchestrator.service.spec.ts -t "uploadPdf with validation"`
Expected: FAIL

**Step 3: Modify uploadPdf() to add validation**

Edit `packages/api/src/book/book-orchestrator.service.ts`:

```typescript
import { StorageOrchestratorService } from './services/storage-orchestrator.service';

@Injectable()
export class BookOrchestratorService {
  constructor(
    // ... existing dependencies
    private readonly storageOrchestrator: StorageOrchestratorService, // NEW
  ) {}

  async uploadPdf(
    bookId: string,
    file: Express.Multer.File,
    userId: string,
    organizationId: string,
    pdfLicenseType?: string,
  ): Promise<UploadPdfResponseDto> {
    // ... existing validation (file size, type, etc.)

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        // ... existing fields
        pdfFileHash: true, // NEW
      },
    });

    // NEW: Validate if replacing existing PDF
    if (book.pdfFileHash) {
      await this.storageOrchestrator.validatePdfUpload(bookId, file.buffer);
    }

    // NEW: Extract metadata
    const metadata = await this.storageOrchestrator.extractPdfMetadata(file.buffer);

    // ... existing: create temp directory, save file

    // Update database
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        pdfFilePath: filePath,
        pdfFileSize: file.size,
        pdfUploadedAt: new Date(),
        pdfLicenseType: validatedLicenseType,
        evaluationStatus: newStatus,
        pdfFileHash: metadata.hash,       // NEW
        pdfMetadataYear: metadata.year,   // NEW
      },
    });

    // ... existing: queue evaluation if needed
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/book-orchestrator.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/book/book-orchestrator.service.ts packages/api/src/book/book-orchestrator.service.spec.ts
git commit -m "feat(upload): add PDF validation and metadata extraction"
```

---

## Task 10: Enhance BookOrchestratorService - Queue Migration Job

**Files:**
- Modify: `packages/api/src/book/book-orchestrator.service.ts`
- Modify: `packages/api/src/book/book-orchestrator.service.spec.ts`

**Step 1: Write failing test for queuing migration job**

Add to `book-orchestrator.service.spec.ts`:

```typescript
describe('uploadPdf queues migration job', () => {
  it('should queue migrate-to-active job after upload', async () => {
    const file = {
      buffer: Buffer.from('pdf'),
      size: 1000,
    } as Express.Multer.File;

    await service.uploadPdf('book-123', file, 'user-123', 'org-123', undefined);

    expect(pdfMigrationQueue.add).toHaveBeenCalledWith(
      'migrate-to-active',
      { bookId: 'book-123' },
      { priority: 1 }
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/book-orchestrator.service.spec.ts -t "queues migration job"`
Expected: FAIL - "pdfMigrationQueue.add is not a function"

**Step 3: Inject PDF migration queue and add job**

Edit `packages/api/src/book/book-orchestrator.service.ts`:

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BookOrchestratorService {
  constructor(
    // ... existing dependencies
    @InjectQueue(queueConfig.pdfMigrationQueue.name) // NEW
    private readonly pdfMigrationQueue: Queue,
  ) {}

  async uploadPdf(...): Promise<UploadPdfResponseDto> {
    // ... existing logic (validation, save temp, update DB)

    // NEW: Queue migration to active tier (high priority)
    await this.pdfMigrationQueue.add(
      'migrate-to-active',
      { bookId },
      { priority: 1 }
    );

    // ... existing: return response
  }
}
```

**Step 4: Update test mocks**

Edit `book-orchestrator.service.spec.ts` to mock pdfMigrationQueue:

```typescript
let pdfMigrationQueue: jest.Mocked<Queue>;

beforeEach(async () => {
  pdfMigrationQueue = {
    add: jest.fn().mockResolvedValue({}),
  } as any;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      BookOrchestratorService,
      // ... existing providers
      {
        provide: 'BullQueue_pdf-migration',
        useValue: pdfMigrationQueue,
      },
    ],
  }).compile();
});
```

**Step 5: Run test to verify it passes**

Run: `npx jest packages/api/src/book/book-orchestrator.service.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/api/src/book/book-orchestrator.service.ts packages/api/src/book/book-orchestrator.service.spec.ts
git commit -m "feat(upload): queue PDF migration to active tier after upload"
```

---

## Task 11: Enhance BookEvaluationProcessor - Conditional Archival

**Files:**
- Modify: `packages/api/src/book/processors/book-evaluation.processor.ts`
- Modify: `packages/api/src/book/processors/book-evaluation.processor.spec.ts`

**Step 1: Write failing test for conditional archival**

Add to `book-evaluation.processor.spec.ts`:

```typescript
describe('handleEvaluateBook with conditional archival', () => {
  let pdfMigrationQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    pdfMigrationQueue = {
      add: jest.fn().mockResolvedValue({}),
    } as any;

    // Inject into processor
  });

  it('should queue migrate-to-archived if score < 70', async () => {
    const job = {
      data: { bookId: 'book-123' },
    } as Job<{ bookId: string }>;

    aiEvaluator.evaluate.mockResolvedValue({
      score: 65, // Not aligned
      // ... other fields
    });

    await processor.handleEvaluateBook(job);

    expect(pdfMigrationQueue.add).toHaveBeenCalledWith(
      'migrate-to-archived',
      { bookId: 'book-123' },
      { priority: 2 }
    );
  });

  it('should NOT queue archival if score >= 70', async () => {
    const job = {
      data: { bookId: 'book-123' },
    } as Job<{ bookId: string }>;

    aiEvaluator.evaluate.mockResolvedValue({
      score: 85, // Conceptually aligned
      // ... other fields
    });

    await processor.handleEvaluateBook(job);

    expect(pdfMigrationQueue.add).not.toHaveBeenCalled();
  });

  it('should NOT queue archival if score >= 90', async () => {
    const job = {
      data: { bookId: 'book-123' },
    } as Job<{ bookId: string }>;

    aiEvaluator.evaluate.mockResolvedValue({
      score: 95, // Globally aligned
      // ... other fields
    });

    await processor.handleEvaluateBook(job);

    expect(pdfMigrationQueue.add).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest packages/api/src/book/processors/book-evaluation.processor.spec.ts -t "conditional archival"`
Expected: FAIL

**Step 3: Inject PDF migration queue and add conditional logic**

Edit `packages/api/src/book/processors/book-evaluation.processor.ts`:

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { queueConfig } from '../../config/queue.config';

@Processor(queueConfig.evaluationQueue.name)
export class BookEvaluationProcessor {
  constructor(
    // ... existing dependencies
    @InjectQueue(queueConfig.pdfMigrationQueue.name) // NEW
    private readonly pdfMigrationQueue: Queue,
  ) {}

  @Process('evaluate-book')
  async handleEvaluateBook(job: Job<{ bookId: string }>): Promise<void> {
    // ... existing evaluation logic

    const score = evaluationResult.biblicalAlignmentScore;

    // ... existing: update book with evaluation results

    // NEW: Conditional archival based on score
    if (score < 70) {
      // Not aligned - move to Glacier
      await this.pdfMigrationQueue.add(
        'migrate-to-archived',
        { bookId },
        { priority: 2 }
      );
      this.logger.log(`Queued archival for not-aligned book ${bookId} (score: ${score})`);
    } else {
      // Conceptually or globally aligned - stay in active tier
      this.logger.log(`Book ${bookId} will stay in active tier (score: ${score})`);
    }

    // ... existing: email notification, etc.
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest packages/api/src/book/processors/book-evaluation.processor.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/book/processors/book-evaluation.processor.ts packages/api/src/book/processors/book-evaluation.processor.spec.ts
git commit -m "feat(evaluation): add conditional archival based on biblical alignment score"
```

---

## Task 12: Integration Test - End-to-End PDF Flow

**Files:**
- Create: `packages/api/test/book-pdf-lifecycle.e2e-spec.ts`

**Step 1: Write end-to-end test**

Create `packages/api/test/book-pdf-lifecycle.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs/promises';

describe('Book PDF Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should upload PDF → migrate to active → evaluate → archive if <70%', async () => {
    // Step 1: Create book
    const createBookRes = await request(app.getHttpServer())
      .post('/api/books')
      .set('Authorization', 'Bearer test-token')
      .send({ title: 'Test Book', author: 'Test Author' })
      .expect(202);

    const bookId = createBookRes.body.id;

    // Step 2: Upload PDF
    const pdfBuffer = Buffer.from('%PDF-1.4\ntest content');
    await request(app.getHttpServer())
      .post(`/api/books/${bookId}/pdf`)
      .set('Authorization', 'Bearer test-token')
      .attach('pdf', pdfBuffer, 'test.pdf')
      .expect(200);

    // Step 3: Verify temp file exists
    const book1 = await prisma.book.findUnique({ where: { id: bookId } });
    expect(book1.pdfFilePath).toBeTruthy();
    await expect(fs.access(book1.pdfFilePath)).resolves.not.toThrow();

    // Step 4: Wait for migration to active tier
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for job

    // Step 5: Verify S3 active tier and temp deleted
    const book2 = await prisma.book.findUnique({ where: { id: bookId } });
    expect(book2.pdfStorageTier).toBe('active');
    expect(book2.pdfStoragePath).toContain('active/books');
    await expect(fs.access(book1.pdfFilePath)).rejects.toThrow(); // Temp deleted

    // Step 6: Wait for evaluation (mocked to return <70%)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 7: Verify archived tier for not-aligned book
    const book3 = await prisma.book.findUnique({ where: { id: bookId } });
    expect(book3.biblicalAlignmentScore).toBeLessThan(70);
    expect(book3.pdfStorageTier).toBe('archived');
  }, 30000); // 30 second timeout

  it('should keep book in active tier if score >= 70', async () => {
    // Similar test but with mocked score >= 70
    // Verify pdfStorageTier stays 'active'
  });
});
```

**Step 2: Run test to verify integration**

Run: `npx jest packages/api/test/book-pdf-lifecycle.e2e-spec.ts`
Expected: PASS (or identify integration issues)

**Step 3: Commit**

```bash
git add packages/api/test/book-pdf-lifecycle.e2e-spec.ts
git commit -m "test(e2e): add PDF lifecycle integration test"
```

---

## Task 13: Documentation and Cleanup

**Step 1: Update README with environment variables**

Add to `packages/api/README.md`:

```markdown
## Phase 9: Storage Tier Management

### Environment Variables

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=mychristiancounselor-active

# Glacier Configuration
GLACIER_RESTORE_TIER=Standard
GLACIER_RESTORE_DAYS=7

# Cleanup
TEMP_FILE_RETENTION_DAYS=7
```

### PDF Storage Tiers

- **Active Tier (S3 Standard)**: Books with ≥70% alignment - instant access
- **Archived Tier (S3 Glacier)**: Books with <70% alignment - 3-5 hour restore
```

**Step 2: Run full test suite**

Run: `npx jest --projects packages/api`
Expected: All tests pass

**Step 3: Verify build succeeds**

Run: `npx nx run api:build`
Expected: Build successful

**Step 4: Final commit**

```bash
git add packages/api/README.md
git commit -m "docs(storage): add Phase 9 storage tier management documentation"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-12-25-phase-9-storage-tier-management-implementation.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with @superpowers:executing-plans, batch execution with checkpoints

Which approach?
