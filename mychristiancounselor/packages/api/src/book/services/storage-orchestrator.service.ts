import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { S3StorageProvider } from '../providers/storage/s3-storage.provider';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

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
}
