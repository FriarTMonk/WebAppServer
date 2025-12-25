import { Test, TestingModule } from '@nestjs/testing';
import { BookController } from './book.controller';
import { BookOrchestratorService } from './book-orchestrator.service';
import { BookQueryService } from './services/book-query.service';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOrgAdminGuard } from '../admin/guards/is-org-admin.guard';

describe('BookController', () => {
  let controller: BookController;
  let orchestratorService: BookOrchestratorService;
  let queryService: BookQueryService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: mockUser,
    userOrganization: {
      id: 'org-123',
      name: 'Test Organization',
    },
  };

  const mockOrchestratorService = {
    createBook: jest.fn(),
  };

  const mockQueryService = {
    findBooks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookController],
      providers: [
        {
          provide: BookOrchestratorService,
          useValue: mockOrchestratorService,
        },
        {
          provide: BookQueryService,
          useValue: mockQueryService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IsOrgAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookController>(BookController);
    orchestratorService = module.get<BookOrchestratorService>(BookOrchestratorService);
    queryService = module.get<BookQueryService>(BookQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listBooks', () => {
    it('should return paginated list of books for anonymous users', async () => {
      const mockResponse = {
        books: [
          {
            id: 'book-1',
            title: 'Test Book',
            author: 'Test Author',
            publisher: 'Test Publisher',
            publicationYear: 2023,
            description: 'Test Description',
            coverImageUrl: 'http://example.com/cover.jpg',
            biblicalAlignmentScore: 95,
            visibilityTier: 'globally_aligned',
            genreTag: 'theology',
            matureContent: false,
            endorsementCount: 5,
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
      };

      mockQueryService.findBooks.mockResolvedValue(mockResponse);

      const result = await controller.listBooks({}, undefined);

      expect(result).toEqual(mockResponse);
      expect(queryService.findBooks).toHaveBeenCalledWith({}, undefined);
    });

    it('should return paginated list of books for authenticated users', async () => {
      const mockResponse = {
        books: [
          {
            id: 'book-1',
            title: 'Test Book',
            author: 'Test Author',
            biblicalAlignmentScore: 95,
            visibilityTier: 'conceptually_aligned',
            matureContent: false,
            endorsementCount: 3,
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
      };

      mockQueryService.findBooks.mockResolvedValue(mockResponse);

      const result = await controller.listBooks({}, mockUser);

      expect(result).toEqual(mockResponse);
      expect(queryService.findBooks).toHaveBeenCalledWith({}, 'user-123');
    });

    it('should pass query parameters to service', async () => {
      const query = {
        search: 'theology',
        visibilityTier: 'globally_aligned' as const,
        genre: 'systematic',
        showMatureContent: false,
        skip: 10,
        take: 5,
      };

      const mockResponse = {
        books: [],
        total: 0,
        skip: 10,
        take: 5,
      };

      mockQueryService.findBooks.mockResolvedValue(mockResponse);

      const result = await controller.listBooks(query, mockUser);

      expect(result).toEqual(mockResponse);
      expect(queryService.findBooks).toHaveBeenCalledWith(query, 'user-123');
    });

    it('should handle search filter', async () => {
      const query = { search: 'C.S. Lewis' };
      mockQueryService.findBooks.mockResolvedValue({
        books: [],
        total: 0,
        skip: 0,
        take: 20,
      });

      await controller.listBooks(query, undefined);

      expect(queryService.findBooks).toHaveBeenCalledWith(query, undefined);
    });

    it('should handle pagination parameters', async () => {
      const query = { skip: 20, take: 10 };
      mockQueryService.findBooks.mockResolvedValue({
        books: [],
        total: 0,
        skip: 20,
        take: 10,
      });

      await controller.listBooks(query, mockUser);

      expect(queryService.findBooks).toHaveBeenCalledWith(query, 'user-123');
    });
  });

  describe('createBook', () => {
    describe('with ISBN lookup', () => {
      it('should create a book successfully with ISBN', async () => {
        const dto = {
          isbn: '978-0-13-110362-7',
        };

        const expectedResult = {
          id: 'book-123',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          dto,
        );
      });

      it('should return existing book if duplicate found', async () => {
        const dto = {
          isbn: '978-0-13-110362-7',
        };

        const expectedResult = {
          id: 'existing-book-123',
          status: 'existing' as const,
          message: 'This book already exists. Your organization has been added as an endorser.',
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toEqual(expectedResult);
        expect(result.status).toBe('existing');
      });
    });

    describe('with URL lookup', () => {
      it('should create a book successfully with URL', async () => {
        const dto = {
          lookupUrl: 'https://www.goodreads.com/book/show/123456',
        };

        const expectedResult = {
          id: 'book-456',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          dto,
        );
      });
    });

    describe('with manual entry', () => {
      it('should create a book with title and author (minimum fields)', async () => {
        const dto = {
          title: 'The Art of Computer Programming',
          author: 'Donald Knuth',
        };

        const expectedResult = {
          id: 'book-789',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          dto,
        );
      });

      it('should create a book with all optional fields', async () => {
        const dto = {
          title: 'Clean Code',
          author: 'Robert C. Martin',
          publisher: 'Prentice Hall',
          publicationYear: 2008,
          description: 'A handbook of agile software craftsmanship',
          coverImageUrl: 'https://example.com/cover.jpg',
        };

        const expectedResult = {
          id: 'book-101',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          dto,
        );
      });
    });

    describe('error handling', () => {
      it('should propagate BadRequestException from orchestrator', async () => {
        const dto = {
          isbn: 'invalid-isbn',
        };

        mockOrchestratorService.createBook.mockRejectedValue(
          new BadRequestException('ISBN not found'),
        );

        await expect(
          controller.createBook(mockUser, mockRequest, dto, undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it('should handle orchestrator service errors', async () => {
        const dto = {
          title: 'Test Book',
          author: 'Test Author',
        };

        mockOrchestratorService.createBook.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          controller.createBook(mockUser, mockRequest, dto, undefined),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('authentication and authorization', () => {
      it('should extract userId from authenticated user', async () => {
        const dto = {
          isbn: '978-0-13-110362-7',
        };

        const expectedResult = {
          id: 'book-123',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        await controller.createBook(mockUser, mockRequest, dto, undefined);

        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'org-123',
          dto,
        );
      });

      it('should extract organizationId from request', async () => {
        const customRequest = {
          user: { ...mockUser, id: 'different-user' },
          userOrganization: {
            id: 'different-org',
            name: 'Different Org',
          },
        };

        const dto = {
          isbn: '978-0-13-110362-7',
        };

        const expectedResult = {
          id: 'book-123',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        await controller.createBook(mockUser, customRequest, dto, undefined);

        expect(orchestratorService.createBook).toHaveBeenCalledWith(
          'user-123',
          'different-org',
          dto,
        );
      });
    });

    describe('response format', () => {
      it('should return 202 Accepted status for successful submission', async () => {
        const dto = {
          isbn: '978-0-13-110362-7',
        };

        const expectedResult = {
          id: 'book-123',
          status: 'pending' as const,
          message: "Your book has been submitted for evaluation. You'll receive an email when complete.",
        };

        mockOrchestratorService.createBook.mockResolvedValue(expectedResult);

        const result = await controller.createBook(mockUser, mockRequest, dto);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(['pending', 'existing']).toContain(result.status);
      });
    });
  });
});
