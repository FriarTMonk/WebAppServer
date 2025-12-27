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
    // Stub for now - will implement in next task
    this.logger.log(`Getting reading list for user ${userId}`);
    return [];
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
