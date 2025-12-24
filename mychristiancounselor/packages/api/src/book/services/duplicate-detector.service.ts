import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IDuplicateDetector, BookMetadata } from '@mychristiancounselor/shared';

@Injectable()
export class DuplicateDetectorService implements IDuplicateDetector {
  private readonly logger = new Logger(DuplicateDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findDuplicate(metadata: BookMetadata): Promise<string | null> {
    // Strategy 1: Exact ISBN match
    if (metadata.isbn) {
      const byISBN = await this.prisma.book.findUnique({
        where: { isbn: metadata.isbn },
      });

      if (byISBN) {
        this.logger.log(`Found duplicate by ISBN: ${byISBN.id}`);
        return byISBN.id;
      }
    }

    // Strategy 2: Fuzzy match on title + author
    const byTitleAuthor = await this.prisma.book.findFirst({
      where: {
        AND: [
          { title: { contains: metadata.title, mode: 'insensitive' } },
          { author: { contains: metadata.author, mode: 'insensitive' } },
        ],
      },
    });

    if (byTitleAuthor) {
      this.logger.log(`Found duplicate by title+author: ${byTitleAuthor.id}`);
      return byTitleAuthor.id;
    }

    return null;
  }
}
