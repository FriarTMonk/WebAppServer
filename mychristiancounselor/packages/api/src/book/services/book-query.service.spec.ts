import { Test, TestingModule } from '@nestjs/testing';
import { BookQueryService } from './book-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityCheckerService } from './visibility-checker.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

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
              findUnique: jest.fn(),
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
        expect(result.total).toBe(2); // Visible book count
        // Verify no N+1 queries - visibilityChecker.canAccess should not be called
        expect(visibilityChecker.canAccess).not.toHaveBeenCalled();
        // User is fetched three times: once for platform admin check, once for mature content check, once for batch filtering
        // This is still much better than N+1 (which would be 3 + N calls)
        expect(prisma.user.findUnique).toHaveBeenCalledTimes(3);
      });

      it('should allow platform admins to see all books including not_aligned', async () => {
        const userId = 'platform-admin-123';
        const mockPlatformAdmin = {
          id: userId,
          accountType: 'organization',
          birthDate: new Date('1990-01-01'),
          isPlatformAdmin: true,
          organizationMembers: [],
        };
        const mockBooks = [
          {
            id: '1',
            title: 'Globally Aligned Book',
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
            title: 'Not Aligned Book',
            author: 'Author 2',
            publisher: 'Publisher 2',
            publicationYear: 2023,
            description: 'Description 2',
            coverImageUrl: 'http://example.com/cover2.jpg',
            biblicalAlignmentScore: 40,
            visibilityTier: 'not_aligned',
            genreTag: 'devotional',
            matureContent: false,
            _count: { endorsements: 1 },
            endorsements: [],
          },
          {
            id: '3',
            title: 'Conceptually Aligned Book',
            author: 'Author 3',
            publisher: 'Publisher 3',
            publicationYear: 2023,
            description: 'Description 3',
            coverImageUrl: 'http://example.com/cover3.jpg',
            biblicalAlignmentScore: 85,
            visibilityTier: 'conceptually_aligned',
            genreTag: 'pastoral',
            matureContent: false,
            _count: { endorsements: 2 },
            endorsements: [{ organizationId: 'org1' }],
          },
        ];

        (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
        (prisma.book.count as jest.Mock).mockResolvedValue(3);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockPlatformAdmin);

        const result = await service.findBooks({}, userId);

        // Platform admin should see all 3 books including not_aligned
        expect(result.books).toHaveLength(3);
        expect(result.books[0].id).toBe('1');
        expect(result.books[1].id).toBe('2');
        expect(result.books[2].id).toBe('3');
        expect(result.total).toBe(3);

        // Verify not_aligned filter was not applied in WHERE clause
        const callArgs = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
        const hasNotAlignedFilter = callArgs.where.AND.some(
          (filter: any) => filter.visibilityTier?.not === 'not_aligned',
        );
        expect(hasNotAlignedFilter).toBe(false);
      });

      it('should respect visibilityTier filter', async () => {
        const userId = 'user-123';
        const mockUser = {
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [],
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
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
        const mockUser = {
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [],
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
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
        const mockUser = {
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [],
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        const result = await service.findBooks({}, 'user-123');

        expect(result.skip).toBe(0);
        expect(result.take).toBe(20);
      });

      it('should return correct pagination metadata', async () => {
        const mockUser = {
          accountType: 'adult',
          birthDate: new Date('1990-01-01'),
          organizationMembers: [],
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.book.count as jest.Mock).mockResolvedValue(0);

        const result = await service.findBooks({ skip: 10, take: 5 }, 'user-123');

        expect(result.skip).toBe(10);
        expect(result.take).toBe(5);
      });
    });
  });

  describe('findBookById', () => {
    const mockBookWithDetails = {
      id: 'book-123',
      title: 'Test Book',
      author: 'Test Author',
      isbn: '978-0-13-110362-7',
      publisher: 'Test Publisher',
      publicationYear: 2023,
      description: 'Test Description',
      coverImageUrl: 'http://example.com/cover.jpg',
      evaluationStatus: 'completed',
      biblicalAlignmentScore: 95,
      visibilityTier: 'globally_aligned',
      matureContent: false,
      theologicalSummary: 'Excellent theological content',
      scriptureComparisonNotes: 'Consistent with Scripture',
      denominationalTags: ['reformed', 'evangelical'],
      theologicalStrengths: ['Clear gospel', 'Biblical authority'],
      theologicalConcerns: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-15'),
      doctrineCategoryScores: [
        { category: 'soteriology', score: 95, notes: 'Excellent' },
        { category: 'christology', score: 98, notes: 'Very strong' },
      ],
      purchaseLinks: [
        { retailer: 'Amazon', url: 'https://amazon.com/book', isPrimary: true, price: null },
        { retailer: 'CBD', url: 'https://cbd.com/book', isPrimary: false, price: null },
      ],
      endorsements: [
        { organizationId: 'org1', organization: { name: 'Organization 1' } },
        { organizationId: 'org2', organization: { name: 'Organization 2' } }
      ],
      evaluationHistory: [{ evaluatedAt: new Date('2023-01-15') }],
      _count: { endorsements: 2 },
    };

    describe('book not found', () => {
      it('should throw NotFoundException when book does not exist', async () => {
        (prisma.book.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.findBookById('invalid-id', 'user-123')).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findBookById('invalid-id', 'user-123')).rejects.toThrow(
          'Book not found',
        );
      });

      it('should throw NotFoundException for invalid UUID format', async () => {
        (prisma.book.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.findBookById('invalid-uuid-format', 'user-123')).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findBookById('invalid-uuid-format', 'user-123')).rejects.toThrow(
          'Book not found',
        );
      });
    });

    describe('authenticated users', () => {
      it('should return globally_aligned book for authenticated user', async () => {
        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(mockBookWithDetails);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(true);

        const result = await service.findBookById('book-123', 'user-123');

        expect(result).toMatchObject({
          id: 'book-123',
          title: 'Test Book',
          visibilityTier: 'globally_aligned',
        });
        expect(visibilityChecker.canAccess).toHaveBeenCalledWith('user-123', 'book-123', 'book');
      });

      it('should allow org member to access conceptually_aligned book', async () => {
        const conceptuallyAlignedBook = {
          ...mockBookWithDetails,
          visibilityTier: 'conceptually_aligned',
          biblicalAlignmentScore: 85,
        };
        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(conceptuallyAlignedBook);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(true);

        const result = await service.findBookById('book-123', 'user-123');

        expect(result.visibilityTier).toBe('conceptually_aligned');
        expect(visibilityChecker.canAccess).toHaveBeenCalledWith('user-123', 'book-123', 'book');
      });

      it('should throw ForbiddenException when visibilityChecker denies access', async () => {
        const conceptuallyAlignedBook = {
          ...mockBookWithDetails,
          visibilityTier: 'conceptually_aligned',
        };
        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(conceptuallyAlignedBook);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(false);

        await expect(service.findBookById('book-123', 'user-123')).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('platform admins', () => {
      it('should allow platform admin to access not_aligned book', async () => {
        const notAlignedBook = {
          ...mockBookWithDetails,
          visibilityTier: 'not_aligned',
          biblicalAlignmentScore: 65,
        };
        const mockPlatformAdmin = {
          id: 'admin-123',
          isPlatformAdmin: true,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(notAlignedBook);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockPlatformAdmin);

        const result = await service.findBookById('book-123', 'admin-123');

        expect(result.visibilityTier).toBe('not_aligned');
        expect(result.biblicalAlignmentScore).toBe(65);
        // Platform admin bypasses visibility checker
        expect(visibilityChecker.canAccess).not.toHaveBeenCalled();
      });

      it('should allow platform admin to access all books regardless of tier', async () => {
        const mockPlatformAdmin = {
          id: 'admin-123',
          isPlatformAdmin: true,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(mockBookWithDetails);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockPlatformAdmin);

        const result = await service.findBookById('book-123', 'admin-123');

        expect(result.id).toBe('book-123');
        expect(visibilityChecker.canAccess).not.toHaveBeenCalled();
      });

      it('should allow platform admin to access mature content books', async () => {
        const matureBook = {
          ...mockBookWithDetails,
          matureContent: true,
        };
        const mockPlatformAdmin = {
          id: 'admin-123',
          isPlatformAdmin: true,
        };

        (prisma.book.findUnique as jest.Mock).mockResolvedValue(matureBook);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockPlatformAdmin);

        const result = await service.findBookById('book-123', 'admin-123');

        expect(result.matureContent).toBe(true);
        expect(visibilityChecker.canAccess).not.toHaveBeenCalled();
      });
    });

    describe('DTO mapping', () => {
      it('should correctly map all fields to BookDetailDto', async () => {
        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findUnique as jest.Mock).mockResolvedValue(mockBookWithDetails);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(true);

        const result = await service.findBookById('book-123', 'user-123');

        expect(result).toMatchObject({
          id: 'book-123',
          title: 'Test Book',
          author: 'Test Author',
          isbn: '978-0-13-110362-7',
          publisher: 'Test Publisher',
          publicationYear: 2023,
          description: 'Test Description',
          coverImageUrl: 'http://example.com/cover.jpg',
          evaluationStatus: 'completed',
          biblicalAlignmentScore: 95,
          visibilityTier: 'globally_aligned',
          matureContent: false,
          theologicalSummary: 'Excellent theological content',
          scriptureComparisonNotes: 'Consistent with Scripture',
          denominationalTags: ['reformed', 'evangelical'],
          theologicalStrengths: ['Clear gospel', 'Biblical authority'],
          theologicalConcerns: [],
          endorsementCount: 2,
        });

        expect(result.doctrineCategoryScores).toEqual([
          { category: 'soteriology', score: 95, notes: 'Excellent' },
          { category: 'christology', score: 98, notes: 'Very strong' },
        ]);

        expect(result.purchaseLinks).toEqual([
          { retailer: 'Amazon', url: 'https://amazon.com/book', isPrimary: true, price: undefined },
          { retailer: 'CBD', url: 'https://cbd.com/book', isPrimary: false, price: undefined },
        ]);

        expect(result.evaluatedAt).toEqual(new Date('2023-01-15'));
        expect(result.createdAt).toEqual(new Date('2023-01-01'));
        expect(result.updatedAt).toEqual(new Date('2023-01-15'));
      });

      it('should handle null optional fields correctly', async () => {
        const bookWithNulls = {
          ...mockBookWithDetails,
          isbn: null,
          publisher: null,
          publicationYear: null,
          description: null,
          coverImageUrl: null,
          biblicalAlignmentScore: null,
          theologicalSummary: null,
          scriptureComparisonNotes: null,
          doctrineCategoryScores: [],
          purchaseLinks: [],
          evaluationHistory: [],
        };

        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findUnique as jest.Mock).mockResolvedValue(bookWithNulls);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(true);

        const result = await service.findBookById('book-123', 'user-123');

        expect(result.isbn).toBeUndefined();
        expect(result.publisher).toBeUndefined();
        expect(result.publicationYear).toBeUndefined();
        expect(result.description).toBeUndefined();
        expect(result.coverImageUrl).toBeUndefined();
        expect(result.biblicalAlignmentScore).toBeUndefined();
        expect(result.theologicalSummary).toBeUndefined();
        expect(result.scriptureComparisonNotes).toBeUndefined();
        expect(result.evaluatedAt).toBeUndefined();
        expect(result.doctrineCategoryScores).toEqual([]);
        expect(result.purchaseLinks).toEqual([]);
      });
    });

    describe('database queries', () => {
      it('should fetch book with all required relations', async () => {
        const mockUser = {
          id: 'user-123',
          isPlatformAdmin: false,
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.book.findUnique as jest.Mock).mockResolvedValue(mockBookWithDetails);
        (visibilityChecker.canAccess as jest.Mock).mockResolvedValue(true);

        await service.findBookById('book-123', 'user-123');

        expect(prisma.book.findUnique).toHaveBeenCalledWith({
          where: { id: 'book-123' },
          include: {
            doctrineCategoryScores: expect.objectContaining({
              select: expect.any(Object),
              orderBy: { category: 'asc' },
            }),
            purchaseLinks: expect.objectContaining({
              select: expect.any(Object),
              orderBy: { isPrimary: 'desc' },
            }),
            endorsements: expect.objectContaining({
              select: { organizationId: true },
            }),
            evaluationHistory: expect.objectContaining({
              select: { evaluatedAt: true },
              orderBy: { evaluatedAt: 'desc' },
              take: 1,
            }),
            _count: expect.objectContaining({
              select: { endorsements: true },
            }),
          },
        });
      });
    });
  });
});
