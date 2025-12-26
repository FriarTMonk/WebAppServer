import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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

    // PDF date format per ISO 32000-1:2008 spec: D:YYYYMMDDHHmmSSOHH'mm'
    // We extract only the year (YYYY) as that's sufficient for publication date validation
    const dateMatch = pdfString.match(/\/(?:CreationDate|ModDate)\(D:(\d{4})/);
    if (dateMatch) {
      const parsedYear = parseInt(dateMatch[1], 10);
      // Validate year is reasonable (PDF format introduced in 1993)
      if (parsedYear >= 1990 && parsedYear <= 2100) {
        year = parsedYear;
      }
    }

    return { hash, year };
  }

  /**
   * Validate PDF upload against existing PDF (prevents gaming)
   * Checks: Hash duplication, publication date comparison
   */
  async validatePdfUpload(bookId: string, newPdfBuffer: Buffer): Promise<void> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { pdfFileHash: true, pdfMetadataYear: true },
    });

    if (!book) {
      throw new NotFoundException(`Book not found: ${bookId}`);
    }

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

    try {
      // Update database with S3 path and tier
      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          pdfStoragePath: `s3://${s3Key}`,
          pdfStorageTier: 'active',
        },
      });

      // Delete temp file (with error handling)
      try {
        await fs.unlink(book.pdfFilePath);
      } catch (unlinkError) {
        this.logger.warn(`Failed to delete temp file ${book.pdfFilePath}: ${unlinkError.message}`);
        // Continue - DB is consistent, just have orphaned temp file
      }

      this.logger.log(`PDF migrated to active tier: ${s3Key}`);
    } catch (dbError) {
      // DB update failed - delete the S3 file to maintain consistency
      this.logger.error(`DB update failed after S3 upload, rolling back S3 file: ${dbError.message}`);
      try {
        await this.s3Provider.delete(s3Key);
      } catch (deleteError) {
        this.logger.error(`Failed to rollback S3 file ${s3Key}: ${deleteError.message}`);
      }
      throw dbError; // Re-throw to signal failure
    }
  }

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

    if (!book) {
      throw new NotFoundException(`Book not found: ${bookId}`);
    }

    // Already archived - skip
    if (book.pdfStorageTier === 'archived') {
      this.logger.log(`PDF already in archived tier for book ${bookId}`);
      return;
    }

    // Move from active to archived in S3
    await this.s3Provider.move(bookId, 'active', 'archived');

    try {
      // Update database
      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          pdfStorageTier: 'archived',
        },
      });

      this.logger.log(`PDF migrated to archived tier for book ${bookId}`);
    } catch (dbError) {
      // DB update failed - rollback S3 move
      this.logger.error(`DB update failed after S3 move, rolling back: ${dbError?.message || dbError}`);
      try {
        await this.s3Provider.move(bookId, 'archived', 'active');
      } catch (rollbackError) {
        this.logger.error(`Failed to rollback S3 move: ${rollbackError?.message || rollbackError}`);
      }
      throw dbError;
    }
  }
}
