import { Test } from '@nestjs/testing';
import { BookOrchestratorService } from './book-orchestrator.service';
import { MetadataAggregatorService } from './providers/metadata/metadata-aggregator.service';
import { DuplicateDetectorService } from './services/duplicate-detector.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BookOrchestratorService', () => {
  let orchestrator: BookOrchestratorService;
  let metadataService: MetadataAggregatorService;
  let duplicateDetector: DuplicateDetectorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BookOrchestratorService,
        {
          provide: MetadataAggregatorService,
          useValue: { lookup: jest.fn() },
        },
        {
          provide: DuplicateDetectorService,
          useValue: { findDuplicate: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            book: { create: jest.fn() },
            bookEndorsement: { create: jest.fn(), findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    orchestrator = module.get<BookOrchestratorService>(BookOrchestratorService);
    metadataService = module.get<MetadataAggregatorService>(MetadataAggregatorService);
    duplicateDetector = module.get<DuplicateDetectorService>(DuplicateDetectorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should orchestrate book creation flow', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'C.S. Lewis',
      isbn: '9780060652920',
    };

    jest.spyOn(metadataService, 'lookup').mockResolvedValue(metadata);
    jest.spyOn(duplicateDetector, 'findDuplicate').mockResolvedValue(null);
    jest.spyOn(prisma.book, 'create').mockResolvedValue({
      id: 'new-book-id',
      ...metadata,
    } as any);
    jest.spyOn(prisma.bookEndorsement, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.bookEndorsement, 'create').mockResolvedValue({} as any);

    const result = await orchestrator.createBook(
      'user-id',
      'org-id',
      { isbn: '9780060652920' },
    );

    expect(result.id).toBe('new-book-id');
    expect(result.status).toBe('pending');
    expect(metadataService.lookup).toHaveBeenCalledWith('9780060652920');
    expect(duplicateDetector.findDuplicate).toHaveBeenCalledWith(metadata);
    expect(prisma.book.create).toHaveBeenCalled();
  });

  it('should handle duplicate books', async () => {
    const metadata = {
      title: 'Mere Christianity',
      author: 'C.S. Lewis',
      isbn: '9780060652920',
    };

    jest.spyOn(metadataService, 'lookup').mockResolvedValue(metadata);
    jest.spyOn(duplicateDetector, 'findDuplicate').mockResolvedValue('existing-book-id');
    jest.spyOn(prisma.bookEndorsement, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.bookEndorsement, 'create').mockResolvedValue({} as any);

    const result = await orchestrator.createBook(
      'user-id',
      'org-id',
      { isbn: '9780060652920' },
    );

    expect(result.id).toBe('existing-book-id');
    expect(result.status).toBe('existing');
    expect(result.message).toContain('already exists');
  });
});
