import { Test, TestingModule } from '@nestjs/testing';
import { BookQueryService } from './book-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityCheckerService } from './visibility-checker.service';

describe('BookQueryService', () => {
  let service: BookQueryService;
  let prisma: jest.Mocked<PrismaService>;
  let visibilityChecker: jest.Mocked<VisibilityCheckerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookQueryService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: VisibilityCheckerService,
          useValue: {
            canAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookQueryService>(BookQueryService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    visibilityChecker = module.get(VisibilityCheckerService) as jest.Mocked<VisibilityCheckerService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBooks', () => {
    describe('anonymous users', () => {
      it('should return only globally aligned books without mature content', async () => {
        const mockBooks = [
          {
            id: '1',
            title: 'Book 1',
            author: 'Author 1',
            publisher: 'Publisher 1',
            publicationYear: 2023,
            description: 'Description 1',
            coverImageUrl: 'http://example.com/cover1.jpg',
            biblicalAlignmentScore: 95,
            visibilityTier: 'globally_aligned',
            genreTag: 'theology',
            matureContent: false,
            _count: { endorsements: 5 },
            endorsements: [],
          },
          {
            id: '2',
            title: 'Book 2',
            author: 'Author 2',
            publisher: null,
            publicationYear: null,
            description: null,
            coverImageUrl: null,
            biblicalAlignmentScore: 92,
            visibilityTier: 'globally_aligned',
            genreTag: null,
            matureContent: true, // Should be filtered out
            _count: { endorsements: 3 },
            endorsements: [],
          },
          {
            id: '3',
            title: 'Book 3',
            author: 'Author 3',
            publisher: 'Publisher 3',
            publicationYear: 2022,
            description: 'Description 3',
            coverImageUrl: 'http://example.com/cover3.jpg',
            biblicalAlignmentScore: 85,
            visibilityTier: 'conceptually_aligned', // Should be filtered out
            genreTag: 'devotional',
            matureContent: false,
            _count: { endorsements: 2 },
            endorsements: [{ organizationId: 'org1' }],
          },
        ];

        (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
        (prisma.book.count as jest.Mock).mockResolvedValue(3);

        const result = await service.findBooks({}, undefined);

        expect(result.books).toHaveLength(1);
        expect(result.books[0].id).toBe('1');
        expect(result.books[0].visibilityTier).toBe('globally_aligned');
        expect(result.books[0].matureContent).toBe(false);
        expect(result.total).toBe(3); // Returns database count, not filtered count
      });

      it('should filter by search term', async () => {
        const mockBooks = [
          {
            id: '1',
            title: 'Mere Christianity',
            author: 'C.S. Lewis',
            publisher: 'HarperOne',
            publicationYear: 1952,
            description: 'Classic Christian apologetics',
            coverImageUrl: 'http://example.com/mere.jpg',
            biblicalAlignmentScore: 95,
            visibilityTier: 'globally_aligned',
            genreTag: 'apologetics',
            matureContent: false,
            _count: { endorsements: 10 },
            endorsements: [],
          },
        ];

        (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
        (prisma.book.count as jest.Mock).mockResolvedValue(1);

        const result = await service.findBooks({ search: 'Lewis' }, undefined);

        expect(prisma.book.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  OR: [
                    { title: { contains: 'Lewis', mode: 'insensitive' } },
                    { author: { contains: 'Lewis', mode: 'insensitive' } },
                  ],
                }),
              ]),
            }),
          }),
        );
        expect(result.books).toHaveLength(1);
      });

      it('should apply pagination', async () => {
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        await service.findBooks({ skip: 10, take: 5 }, undefined);

        expect(prisma.book.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 5,
          }),
        );
      });
    });

    describe('authenticated users', () => {
      it('should return books user has access to via batch filtering', async () => {
        const userId = 'user-123';
        const mockUser = {
          id: userId,
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [
            {
              organizationId: 'org1',
              organization: {
                matureContentAccountTypeThreshold: 'teen',
              },
            },
          ],
        };
        const mockBooks = [
          {
            id: '1',
            title: 'Global Book',
            author: 'Author 1',
            publisher: 'Publisher 1',
            publicationYear: 2023,
            description: 'Description 1',
            coverImageUrl: 'http://example.com/cover1.jpg',
            biblicalAlignmentScore: 95,
            visibilityTier: 'globally_aligned',
            genreTag: 'theology',
            matureContent: false,
            _count: { endorsements: 5 },
            endorsements: [],
          },
          {
            id: '2',
            title: 'Org Book',
            author: 'Author 2',
            publisher: 'Publisher 2',
            publicationYear: 2023,
            description: 'Description 2',
            coverImageUrl: 'http://example.com/cover2.jpg',
            biblicalAlignmentScore: 85,
            visibilityTier: 'conceptually_aligned',
            genreTag: 'devotional',
            matureContent: false,
            _count: { endorsements: 2 },
            endorsements: [{ organizationId: 'org1' }],
          },
          {
            id: '3',
            title: 'No Access Book',
            author: 'Author 3',
            publisher: 'Publisher 3',
            publicationYear: 2023,
            description: 'Description 3',
            coverImageUrl: 'http://example.com/cover3.jpg',
            biblicalAlignmentScore: 80,
            visibilityTier: 'conceptually_aligned',
            genreTag: 'pastoral',
            matureContent: false,
            _count: { endorsements: 1 },
            endorsements: [{ organizationId: 'org2' }],
          },
        ];

        (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
        (prisma.book.count as jest.Mock).mockResolvedValue(3);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        const result = await service.findBooks({}, userId);

        expect(result.books).toHaveLength(2);
        expect(result.books[0].id).toBe('1');
        expect(result.books[1].id).toBe('2');
        expect(result.total).toBe(3); // Database count
        // Verify no N+1 queries - visibilityChecker.canAccess should not be called
        expect(visibilityChecker.canAccess).not.toHaveBeenCalled();
        // User is fetched twice: once for mature content check, once for batch filtering
        // This is still much better than N+1 (which would be 2 + N calls)
        expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
      });

      it('should respect visibilityTier filter', async () => {
        const userId = 'user-123';
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        await service.findBooks({ visibilityTier: 'globally_aligned' }, userId);

        expect(prisma.book.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                { visibilityTier: 'globally_aligned' },
              ]),
            }),
          }),
        );
      });

      it('should filter by genre', async () => {
        const userId = 'user-123';
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        await service.findBooks({ genre: 'theology' }, userId);

        expect(prisma.book.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                { genreTag: 'theology' },
              ]),
            }),
          }),
        );
      });

      describe('mature content filtering', () => {
        it('should hide mature content for child accounts', async () => {
          const userId = 'user-child';
          const mockUser = {
            accountType: 'child',
            birthDate: new Date('2015-01-01'),
            organizationMembers: [],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({}, userId);

          expect(prisma.book.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                AND: expect.arrayContaining([
                  { matureContent: false },
                ]),
              }),
            }),
          );
        });

        it('should hide mature content for teen accounts by default', async () => {
          const userId = 'user-teen';
          const mockUser = {
            accountType: 'teen',
            birthDate: new Date('2010-01-01'),
            organizationMembers: [],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({}, userId);

          expect(prisma.book.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                AND: expect.arrayContaining([
                  { matureContent: false },
                ]),
              }),
            }),
          );
        });

        it('should show mature content for adult accounts by default', async () => {
          const userId = 'user-adult';
          const mockUser = {
            accountType: 'adult',
            birthDate: new Date('1990-01-01'),
            organizationMembers: [
              {
                organization: {
                  matureContentAccountTypeThreshold: 'teen',
                },
              },
            ],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({}, userId);

          // Should NOT have matureContent: false filter
          const callArgs = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
          const hasMatureContentFilter = callArgs.where.AND.some(
            (filter: any) => filter.matureContent === false,
          );
          expect(hasMatureContentFilter).toBe(false);
        });

        it('should respect explicit showMatureContent=false', async () => {
          const userId = 'user-adult';
          const mockUser = {
            accountType: 'adult',
            birthDate: new Date('1990-01-01'),
            organizationMembers: [],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({ showMatureContent: false }, userId);

          expect(prisma.book.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                AND: expect.arrayContaining([
                  { matureContent: false },
                ]),
              }),
            }),
          );
        });

        it('should respect explicit showMatureContent=true for eligible users', async () => {
          const userId = 'user-adult';
          const mockUser = {
            accountType: 'adult',
            birthDate: new Date('1990-01-01'),
            organizationMembers: [
              {
                organization: {
                  matureContentAccountTypeThreshold: 'teen',
                },
              },
            ],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({ showMatureContent: true }, userId);

          // Should NOT have matureContent: false filter
          const callArgs = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
          const hasMatureContentFilter = callArgs.where.AND.some(
            (filter: any) => filter.matureContent === false,
          );
          expect(hasMatureContentFilter).toBe(false);
        });

        it('should deny mature content for teens even with showMatureContent=true', async () => {
          const userId = 'user-teen';
          const mockUser = {
            accountType: 'teen',
            birthDate: new Date('2010-01-01'),
            organizationMembers: [
              {
                organization: {
                  matureContentAccountTypeThreshold: 'adult',
                },
              },
            ],
          };

          (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
          (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
          (prisma.book.count as jest.Mock).mockResolvedValue(0);

          await service.findBooks({ showMatureContent: true }, userId);

          expect(prisma.book.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                AND: expect.arrayContaining([
                  { matureContent: false },
                ]),
              }),
            }),
          );
        });
      });
    });

    describe('combined filters', () => {
      it('should apply multiple filters together', async () => {
        const userId = 'user-123';
        const mockUser = {
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [],
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        await service.findBooks(
          {
            search: 'theology',
            visibilityTier: 'globally_aligned',
            genre: 'systematic',
            showMatureContent: false,
            skip: 5,
            take: 10,
          },
          userId,
        );

        expect(prisma.book.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                { evaluationStatus: 'completed' },
                { visibilityTier: { not: 'not_aligned' } },
                {
                  OR: [
                    { title: { contains: 'theology', mode: 'insensitive' } },
                    { author: { contains: 'theology', mode: 'insensitive' } },
                  ],
                },
                { visibilityTier: 'globally_aligned' },
                { genreTag: 'systematic' },
                { matureContent: false },
              ]),
            }),
            skip: 5,
            take: 10,
          }),
        );
      });
    });

    describe('pagination', () => {
      it('should use default pagination values', async () => {
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        const result = await service.findBooks({}, undefined);

        expect(result.skip).toBe(0);
        expect(result.take).toBe(20);
      });

      it('should return correct pagination metadata', async () => {
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        const result = await service.findBooks({ skip: 10, take: 5 }, undefined);

        expect(result.skip).toBe(10);
        expect(result.take).toBe(5);
      });
    });
  });
});
