import { Test } from '@nestjs/testing';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DuplicateDetectorService', () => {
  let service: DuplicateDetectorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DuplicateDetectorService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DuplicateDetectorService>(DuplicateDetectorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find duplicate by ISBN', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'C.S. Lewis',
      isbn: '9780060652920',
    };

    jest.spyOn(prisma.book, 'findFirst').mockResolvedValue({
      id: 'existing-book-id',
    } as any);

    const result = await service.findDuplicate(metadata);

    expect(result).toBe('existing-book-id');
    expect(prisma.book.findFirst).toHaveBeenCalledWith({
      where: { isbn: '9780060652920' },
    });
  });

  it('should find duplicate by title+author fuzzy match', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'CS Lewis',
    };

    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.book, 'findFirst').mockResolvedValue({
      id: 'existing-book-id',
    } as any);

    const result = await service.findDuplicate(metadata);

    expect(result).toBe('existing-book-id');
  });

  it('should return null if no duplicate found', async () => {
    jest.spyOn(prisma.book, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.book, 'findFirst').mockResolvedValue(null);

    const result = await service.findDuplicate({ title: 'New Book', author: 'New Author' });

    expect(result).toBeNull();
  });
});
