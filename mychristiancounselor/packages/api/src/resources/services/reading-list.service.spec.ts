import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReadingListService } from './reading-list.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToReadingListDto } from '../dto/add-to-reading-list.dto';

describe('ReadingListService', () => {
  let service: ReadingListService;
  let prisma: PrismaService;

  const mockPrismaService = {
    book: {
      findUnique: jest.fn(),
    },
    userReadingList: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingListService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReadingListService>(ReadingListService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToReadingList', () => {
    const userId = 'user-123';
    const bookId = 'book-456';
    const mockBook = {
      id: bookId,
      title: 'Test Book',
      author: 'Test Author',
      genreTag: 'Christian Living',
    };

    it('should add book to reading list with default status', async () => {
      const dto: AddToReadingListDto = {
        bookId,
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.userReadingList.findUnique.mockResolvedValue(null);
      mockPrismaService.userReadingList.create.mockResolvedValue({
        id: 'reading-list-1',
        userId,
        bookId,
        status: 'want_to_read',
        progress: null,
        personalNotes: null,
        personalRating: null,
        dateStarted: null,
        dateFinished: null,
        addedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.addToReadingList(userId, dto);

      expect(prisma.book.findUnique).toHaveBeenCalledWith({
        where: { id: bookId },
      });
      expect(prisma.userReadingList.findUnique).toHaveBeenCalledWith({
        where: {
          userId_bookId: { userId, bookId },
        },
      });
      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: {
          userId,
          bookId,
          status: 'want_to_read',
          personalNotes: undefined,
          personalRating: undefined,
          dateStarted: null,
          dateFinished: null,
        },
      });
      expect(result).toBeDefined();
      expect(result.bookId).toBe(bookId);
    });

    it('should throw NotFoundException if book does not exist', async () => {
      const dto: AddToReadingListDto = {
        bookId,
      };

      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        `Book with ID ${bookId} not found`,
      );

      expect(prisma.book.findUnique).toHaveBeenCalledWith({
        where: { id: bookId },
      });
      expect(prisma.userReadingList.findUnique).not.toHaveBeenCalled();
      expect(prisma.userReadingList.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if book already in reading list', async () => {
      const dto: AddToReadingListDto = {
        bookId,
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.userReadingList.findUnique.mockResolvedValue({
        id: 'existing-reading-list-1',
        userId,
        bookId,
        status: 'want_to_read',
      });

      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        `Book with ID ${bookId} is already in your reading list`,
      );

      expect(prisma.book.findUnique).toHaveBeenCalledWith({
        where: { id: bookId },
      });
      expect(prisma.userReadingList.findUnique).toHaveBeenCalledWith({
        where: {
          userId_bookId: { userId, bookId },
        },
      });
      expect(prisma.userReadingList.create).not.toHaveBeenCalled();
    });

    it('should auto-set dateStarted when status is currently_reading', async () => {
      const dto: AddToReadingListDto = {
        bookId,
        status: 'currently_reading',
      };

      const mockCreatedEntry = {
        id: 'reading-list-2',
        userId,
        bookId,
        status: 'currently_reading',
        progress: null,
        personalNotes: null,
        personalRating: null,
        dateStarted: new Date(),
        dateFinished: null,
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.userReadingList.findUnique.mockResolvedValue(null);
      mockPrismaService.userReadingList.create.mockResolvedValue(mockCreatedEntry);

      const result = await service.addToReadingList(userId, dto);

      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          bookId,
          status: 'currently_reading',
          dateStarted: expect.any(Date),
          dateFinished: null,
        }),
      });
      expect(result.dateStarted).toBeDefined();
    });

    it('should auto-set dateFinished when status is finished', async () => {
      const dto: AddToReadingListDto = {
        bookId,
        status: 'finished',
      };

      const mockCreatedEntry = {
        id: 'reading-list-3',
        userId,
        bookId,
        status: 'finished',
        progress: null,
        personalNotes: null,
        personalRating: null,
        dateStarted: null,
        dateFinished: new Date(),
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.userReadingList.findUnique.mockResolvedValue(null);
      mockPrismaService.userReadingList.create.mockResolvedValue(mockCreatedEntry);

      const result = await service.addToReadingList(userId, dto);

      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          bookId,
          status: 'finished',
          dateStarted: null,
          dateFinished: expect.any(Date),
        }),
      });
      expect(result.dateFinished).toBeDefined();
    });

    it('should use provided dateStarted instead of auto-setting', async () => {
      const providedDate = '2024-01-01T00:00:00.000Z';
      const dto: AddToReadingListDto = {
        bookId,
        status: 'currently_reading',
        dateStarted: providedDate,
      };

      const mockCreatedEntry = {
        id: 'reading-list-4',
        userId,
        bookId,
        status: 'currently_reading',
        progress: null,
        personalNotes: null,
        personalRating: null,
        dateStarted: new Date(providedDate),
        dateFinished: null,
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.userReadingList.findUnique.mockResolvedValue(null);
      mockPrismaService.userReadingList.create.mockResolvedValue(mockCreatedEntry);

      await service.addToReadingList(userId, dto);

      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          bookId,
          status: 'currently_reading',
          dateStarted: new Date(providedDate),
          dateFinished: null,
        }),
      });
    });
  });

  describe('getReadingList', () => {
    const userId = 'user-123';
    const mockBook = {
      id: 'book-1',
      title: 'Test Book',
      author: 'Test Author',
      coverImageUrl: 'https://example.com/cover.jpg',
      biblicalAlignmentScore: 85,
      genreTag: 'Christian Living',
      matureContent: false,
    };

    it('should return all reading list items when status is all', async () => {
      const query = { status: 'all' as const };

      const mockItems = [
        {
          id: 'item-1',
          userId,
          bookId: 'book-1',
          status: 'want_to_read',
          progress: null,
          personalNotes: 'Looking forward to this',
          personalRating: null,
          dateStarted: null,
          dateFinished: null,
          addedAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          book: mockBook,
        },
        {
          id: 'item-2',
          userId,
          bookId: 'book-2',
          status: 'currently_reading',
          progress: 50,
          personalNotes: null,
          personalRating: null,
          dateStarted: new Date('2024-01-15'),
          dateFinished: null,
          addedAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-15'),
          book: { ...mockBook, id: 'book-2', title: 'Second Book' },
        },
      ];

      mockPrismaService.userReadingList.findMany.mockResolvedValue(mockItems);
      mockPrismaService.userReadingList.count.mockResolvedValue(2);

      const result = await service.getReadingList(userId, query);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].bookId).toBe('book-1');
      expect(result.items[0].notes).toBe('Looking forward to this');
      expect(result.items[1].progress).toBe(50);
    });

    it('should filter by status when specified', async () => {
      const query = { status: 'currently_reading' as const };

      const mockItems = [
        {
          id: 'item-1',
          userId,
          bookId: 'book-1',
          status: 'currently_reading',
          progress: 75,
          personalNotes: null,
          personalRating: null,
          dateStarted: new Date('2024-01-01'),
          dateFinished: null,
          addedAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10'),
          book: mockBook,
        },
      ];

      mockPrismaService.userReadingList.findMany.mockResolvedValue(mockItems);
      mockPrismaService.userReadingList.count.mockResolvedValue(1);

      await service.getReadingList(userId, query);

      expect(prisma.userReadingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: 'currently_reading',
          }),
        }),
      );
    });

    it('should sort currently_reading by progress DESC', async () => {
      const query = { status: 'currently_reading' as const };

      mockPrismaService.userReadingList.findMany.mockResolvedValue([]);
      mockPrismaService.userReadingList.count.mockResolvedValue(0);

      await service.getReadingList(userId, query);

      expect(prisma.userReadingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { progress: 'desc' },
        }),
      );
    });
  });
});
