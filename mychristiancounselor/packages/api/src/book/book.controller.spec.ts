import { Test, TestingModule } from '@nestjs/testing';
import { BookController } from './book.controller';
import { BookOrchestratorService } from './book-orchestrator.service';
import { BookQueryService } from './services/book-query.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    uploadPdf: jest.fn(),
  };

  const mockQueryService = {
    findBooks: jest.fn(),
    findBookById: jest.fn(),
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

  describe('getBookById', () => {
    const mockBookDetail = {
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
      evaluatedAt: new Date('2023-01-15'),
      theologicalSummary: 'Test theological summary',
      scriptureComparisonNotes: 'Test scripture notes',
      denominationalTags: ['reformed', 'evangelical'],
      theologicalStrengths: ['Clear gospel presentation'],
      theologicalConcerns: [],
      doctrineCategoryScores: [
        { category: 'soteriology', score: 95, notes: 'Excellent' },
        { category: 'christology', score: 98, notes: 'Very strong' },
      ],
      purchaseLinks: [
        { retailer: 'Amazon', url: 'https://amazon.com/book', isPrimary: true, price: undefined },
      ],
      endorsementCount: 5,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-15'),
    };

    it('should return book detail for globally_aligned book (anonymous user)', async () => {
      mockQueryService.findBookById.mockResolvedValue(mockBookDetail);

      const result = await controller.getBookById('book-123', undefined);

      expect(result).toEqual(mockBookDetail);
      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', undefined);
    });

    it('should return book detail for globally_aligned book (authenticated user)', async () => {
      mockQueryService.findBookById.mockResolvedValue(mockBookDetail);

      const result = await controller.getBookById('book-123', mockUser);

      expect(result).toEqual(mockBookDetail);
      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', 'user-123');
    });

    it('should throw NotFoundException when book does not exist', async () => {
      mockQueryService.findBookById.mockRejectedValue(
        new NotFoundException('Book not found'),
      );

      await expect(
        controller.getBookById('invalid-id', undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid book ID format', async () => {
      mockQueryService.findBookById.mockRejectedValue(
        new NotFoundException('Book not found'),
      );

      await expect(
        controller.getBookById('invalid-uuid-format', undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user cannot access book', async () => {
      mockQueryService.findBookById.mockRejectedValue(
        new ForbiddenException('You do not have access to this book'),
      );

      await expect(
        controller.getBookById('book-123', undefined),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow org member to access conceptually_aligned book', async () => {
      const conceptuallyAlignedBook = {
        ...mockBookDetail,
        visibilityTier: 'conceptually_aligned',
        biblicalAlignmentScore: 85,
      };

      mockQueryService.findBookById.mockResolvedValue(conceptuallyAlignedBook);

      const result = await controller.getBookById('book-123', mockUser);

      expect(result).toEqual(conceptuallyAlignedBook);
      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', 'user-123');
    });

    it('should allow platform admin to access not_aligned book', async () => {
      const notAlignedBook = {
        ...mockBookDetail,
        visibilityTier: 'not_aligned',
        biblicalAlignmentScore: 65,
      };

      const adminUser = {
        ...mockUser,
        isPlatformAdmin: true,
      };

      mockQueryService.findBookById.mockResolvedValue(notAlignedBook);

      const result = await controller.getBookById('book-123', adminUser);

      expect(result).toEqual(notAlignedBook);
      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', 'user-123');
    });

    it('should pass userId correctly for authenticated requests', async () => {
      mockQueryService.findBookById.mockResolvedValue(mockBookDetail);

      await controller.getBookById('book-123', mockUser);

      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', 'user-123');
    });

    it('should pass undefined userId for anonymous requests', async () => {
      mockQueryService.findBookById.mockResolvedValue(mockBookDetail);

      await controller.getBookById('book-123', undefined);

      expect(queryService.findBookById).toHaveBeenCalledWith('book-123', undefined);
    });
  });

  describe('uploadPdf (POST /:id/pdf)', () => {
    const mockPdfFile = {
      fieldname: 'pdf',
      originalname: 'test-book.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024 * 1024 * 5, // 5MB
      buffer: Buffer.from('mock-pdf-content'),
    } as Express.Multer.File;

    describe('successful upload', () => {
      it('should upload PDF successfully by org admin (200 OK)', async () => {
        const bookId = 'book-123';
        const expectedResult = {
          id: bookId,
          status: 'uploaded' as const,
          message: 'PDF uploaded successfully',
          pdfFileSize: mockPdfFile.size,
          pdfUploadedAt: new Date(),
        };

        mockOrchestratorService.uploadPdf.mockResolvedValue(expectedResult);

        const result = await controller.uploadPdf(
          bookId,
          mockPdfFile,
          undefined,
          mockUser,
          mockRequest,
        );

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.uploadPdf).toHaveBeenCalledWith(
          bookId,
          mockPdfFile,
          'user-123',
          'org-123',
          undefined,
        );
      });

      it('should upload PDF with license type', async () => {
        const bookId = 'book-123';
        const pdfLicenseType = 'publisher_permission';
        const expectedResult = {
          id: bookId,
          status: 'uploaded' as const,
          message: 'PDF uploaded successfully',
          pdfFileSize: mockPdfFile.size,
          pdfUploadedAt: new Date(),
        };

        mockOrchestratorService.uploadPdf.mockResolvedValue(expectedResult);

        const result = await controller.uploadPdf(
          bookId,
          mockPdfFile,
          pdfLicenseType,
          mockUser,
          mockRequest,
        );

        expect(result).toEqual(expectedResult);
        expect(orchestratorService.uploadPdf).toHaveBeenCalledWith(
          bookId,
          mockPdfFile,
          'user-123',
          'org-123',
          pdfLicenseType,
        );
      });

      it('should trigger re-evaluation if book was already evaluated', async () => {
        const bookId = 'book-123';
        const expectedResult = {
          id: bookId,
          status: 'queued_for_evaluation' as const,
          message: 'PDF uploaded successfully and queued for re-evaluation',
          pdfFileSize: mockPdfFile.size,
          pdfUploadedAt: new Date(),
        };

        mockOrchestratorService.uploadPdf.mockResolvedValue(expectedResult);

        const result = await controller.uploadPdf(
          bookId,
          mockPdfFile,
          undefined,
          mockUser,
          mockRequest,
        );

        expect(result.status).toBe('queued_for_evaluation');
        expect(result.message).toContain('re-evaluation');
      });

      it('should allow re-uploading PDF (replace existing)', async () => {
        const bookId = 'book-with-existing-pdf';
        const expectedResult = {
          id: bookId,
          status: 'uploaded' as const,
          message: 'PDF uploaded successfully',
          pdfFileSize: mockPdfFile.size,
          pdfUploadedAt: new Date(),
        };

        mockOrchestratorService.uploadPdf.mockResolvedValue(expectedResult);

        const result = await controller.uploadPdf(
          bookId,
          mockPdfFile,
          undefined,
          mockUser,
          mockRequest,
        );

        expect(result).toEqual(expectedResult);
      });
    });

    describe('validation errors', () => {
      it('should reject non-PDF file (400 Bad Request)', async () => {
        const bookId = 'book-123';
        const nonPdfFile = {
          ...mockPdfFile,
          originalname: 'test-book.txt',
          mimetype: 'text/plain',
        } as Express.Multer.File;

        mockOrchestratorService.uploadPdf.mockRejectedValue(
          new BadRequestException('Only PDF files are allowed'),
        );

        await expect(
          controller.uploadPdf(bookId, nonPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.uploadPdf(bookId, nonPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow('Only PDF files are allowed');
      });

      it('should reject when no file provided (400 Bad Request)', async () => {
        const bookId = 'book-123';

        mockOrchestratorService.uploadPdf.mockRejectedValue(
          new BadRequestException('PDF file is required'),
        );

        await expect(
          controller.uploadPdf(bookId, undefined, undefined, mockUser, mockRequest),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.uploadPdf(bookId, undefined, undefined, mockUser, mockRequest),
        ).rejects.toThrow('PDF file is required');
      });

      it('should reject file exceeding 100MB limit (400 Bad Request)', async () => {
        const bookId = 'book-123';
        const largePdfFile = {
          ...mockPdfFile,
          size: 101 * 1024 * 1024, // 101MB
        } as Express.Multer.File;

        mockOrchestratorService.uploadPdf.mockRejectedValue(
          new BadRequestException('PDF file must be less than 100MB'),
        );

        await expect(
          controller.uploadPdf(bookId, largePdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.uploadPdf(bookId, largePdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow('PDF file must be less than 100MB');
      });
    });

    describe('authorization errors', () => {
      it('should block wrong organization admin (403 Forbidden)', async () => {
        const bookId = 'book-from-different-org';

        mockOrchestratorService.uploadPdf.mockRejectedValue(
          new ForbiddenException('Only organization admins from the submitting organization can upload PDFs'),
        );

        await expect(
          controller.uploadPdf(bookId, mockPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          controller.uploadPdf(bookId, mockPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow('Only organization admins from the submitting organization can upload PDFs');
      });
    });

    describe('not found errors', () => {
      it('should return 404 when book not found', async () => {
        const bookId = 'non-existent-book';

        mockOrchestratorService.uploadPdf.mockRejectedValue(
          new NotFoundException('Book not found'),
        );

        await expect(
          controller.uploadPdf(bookId, mockPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow(NotFoundException);
        await expect(
          controller.uploadPdf(bookId, mockPdfFile, undefined, mockUser, mockRequest),
        ).rejects.toThrow('Book not found');
      });
    });

    describe('metadata update', () => {
      it('should update book record with PDF metadata', async () => {
        const bookId = 'book-123';
        const expectedResult = {
          id: bookId,
          status: 'uploaded' as const,
          message: 'PDF uploaded successfully',
          pdfFileSize: mockPdfFile.size,
          pdfUploadedAt: new Date(),
        };

        mockOrchestratorService.uploadPdf.mockResolvedValue(expectedResult);

        const result = await controller.uploadPdf(
          bookId,
          mockPdfFile,
          undefined,
          mockUser,
          mockRequest,
        );

        expect(result.pdfFileSize).toBe(mockPdfFile.size);
        expect(result.pdfUploadedAt).toBeInstanceOf(Date);
      });
    });
  });
});
