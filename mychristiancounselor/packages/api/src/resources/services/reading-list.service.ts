import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToReadingListDto } from '../dto/add-to-reading-list.dto';
import { UpdateReadingListDto } from '../dto/update-reading-list.dto';
import { ReadingListQueryDto } from '../dto/reading-list-query.dto';

@Injectable()
export class ReadingListService {
  private readonly logger = new Logger(ReadingListService.name);

  constructor(private prisma: PrismaService) {}

  async addToReadingList(userId: string, dto: AddToReadingListDto) {
    this.logger.log(
      `Adding book ${dto.bookId} to reading list for user ${userId}`,
    );

    // 1. Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${dto.bookId} not found`);
    }

    // 2. Check if book is already in reading list
    const existingEntry = await this.prisma.userReadingList.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId,
        },
      },
    });

    if (existingEntry) {
      throw new ConflictException(
        `Book with ID ${dto.bookId} is already in your reading list`,
      );
    }

    // 3. Auto-date logic for dateStarted and dateFinished
    let dateStarted: Date | null = null;
    let dateFinished: Date | null = null;

    if (dto.dateStarted) {
      // Use provided dateStarted
      dateStarted = new Date(dto.dateStarted);
    } else if (dto.status === 'currently_reading') {
      // Auto-set dateStarted for currently_reading
      dateStarted = new Date();
    }

    if (dto.dateFinished) {
      // Use provided dateFinished
      dateFinished = new Date(dto.dateFinished);
    } else if (dto.status === 'finished') {
      // Auto-set dateFinished for finished
      dateFinished = new Date();
    }

    // 4. Create the reading list entry
    const readingListEntry = await this.prisma.userReadingList.create({
      data: {
        userId,
        bookId: dto.bookId,
        status: dto.status || 'want_to_read',
        personalNotes: dto.notes, // Map DTO 'notes' to DB 'personalNotes'
        personalRating: dto.rating, // Map DTO 'rating' to DB 'personalRating'
        dateStarted,
        dateFinished,
      },
    });

    this.logger.log(
      `Successfully added book ${dto.bookId} to reading list for user ${userId}`,
    );

    return readingListEntry;
  }

  async getReadingList(userId: string, query: ReadingListQueryDto) {
    this.logger.log(`Getting reading list for user ${userId} with status: ${query.status}`);

    // 1. Build where clause
    const where: any = { userId };
    if (query.status !== 'all') {
      where.status = query.status;
    }

    // 2. Smart sorting logic based on status
    let orderBy: any;
    if (query.status === 'currently_reading') {
      // Sort by progress DESC (furthest along first)
      orderBy = { progress: 'desc' };
    } else if (query.status === 'want_to_read') {
      // Sort by addedAt DESC (most recent first)
      orderBy = { addedAt: 'desc' };
    } else if (query.status === 'finished') {
      // Sort by dateFinished DESC (most recent first)
      orderBy = { dateFinished: 'desc' };
    } else {
      // Default for 'all' status
      orderBy = { addedAt: 'desc' };
    }

    // 3. Execute findMany and count in parallel
    const [items, total] = await Promise.all([
      this.prisma.userReadingList.findMany({
        where,
        orderBy,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImageUrl: true,
              biblicalAlignmentScore: true,
              genreTag: true,
              matureContent: true,
            },
          },
        },
      }),
      this.prisma.userReadingList.count({ where }),
    ]);

    // 4. Transform to DTOs with proper field mapping
    const dtoItems = items.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      status: item.status,
      progress: item.progress,
      notes: item.personalNotes, // Map DB personalNotes to DTO notes
      rating: item.personalRating, // Map DB personalRating to DTO rating
      dateStarted: item.dateStarted ? item.dateStarted.toISOString() : null,
      dateFinished: item.dateFinished ? item.dateFinished.toISOString() : null,
      addedAt: item.addedAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      book: {
        id: item.book.id,
        title: item.book.title,
        author: item.book.author,
        coverImageUrl: item.book.coverImageUrl,
        biblicalAlignmentScore: item.book.biblicalAlignmentScore,
        genreTag: item.book.genreTag,
        matureContent: item.book.matureContent,
      },
    }));

    this.logger.log(`Found ${total} reading list items for user ${userId}`);

    return {
      items: dtoItems,
      total,
    };
  }

  async updateReadingListItem(
    userId: string,
    itemId: string,
    dto: UpdateReadingListDto,
  ) {
    // Stub for now - will implement in next task
    this.logger.log(
      `Updating reading list item ${itemId} for user ${userId}`,
    );
    return null;
  }

  async removeFromReadingList(userId: string, itemId: string) {
    // Stub for now - will implement in next task
    this.logger.log(
      `Removing reading list item ${itemId} for user ${userId}`,
    );
    return null;
  }
}
