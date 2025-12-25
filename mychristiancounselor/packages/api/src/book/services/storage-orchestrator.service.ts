import { Injectable, Logger } from '@nestjs/common';
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
}
