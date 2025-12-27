import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOrgAdminGuard } from '../admin/guards/is-org-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '@mychristiancounselor/shared';
import { BookOrchestratorService } from './book-orchestrator.service';
import { BookQueryService } from './services/book-query.service';
import {
  CreateBookDto,
  BookSubmissionResponseDto,
  BookQueryDto,
  BookListResponseDto,
  BookDetailDto,
  UploadPdfResponseDto,
} from './dto';
import { RequestWithOrgAdmin } from './interfaces/request-with-org-admin.interface';

/**
 * Controller for book submission and management.
 * Throttling temporarily disabled for development.
 */
@SkipThrottle()
@Controller('books')
export class BookController {
  constructor(
    private readonly orchestratorService: BookOrchestratorService,
    private readonly queryService: BookQueryService,
  ) {}

  /**
   * List books with filtering and pagination.
   * GET /api/books
   *
   * Public endpoint - returns globally aligned books for anonymous users.
   * Authenticated users see more books based on their organization memberships.
   *
   * Query parameters:
   * - search: Filter by title or author (optional)
   * - visibilityTier: Filter by 'conceptually_aligned' or 'globally_aligned' (optional)
   * - genre: Filter by genre (optional)
   * - showMatureContent: Show/hide mature content (optional, default: based on user age)
   * - skip: Pagination offset (optional, default: 0)
   * - take: Pagination limit (optional, default: 20, max: 100)
   *
   * @param query - Query parameters for filtering and pagination
   * @param user - Optional authenticated user from JWT token
   * @returns Paginated list of books with metadata
   */
  @Public()
  @Get()
  async listBooks(
    @Query() query: BookQueryDto,
    @CurrentUser() user?: User,
  ): Promise<BookListResponseDto> {
    const userId = user?.id;
    return this.queryService.findBooks(query, userId);
  }

  /**
   * Get detailed information about a specific book.
   * GET /api/books/:id
   *
   * Public endpoint with visibility enforcement:
   * - globally_aligned books: accessible by everyone
   * - conceptually_aligned books: accessible by organization members
   * - not_aligned books: accessible by platform admins only
   * - mature content: respects age-gating rules
   *
   * Returns 404 if book doesn't exist.
   * Returns 403 if user doesn't have access to the book.
   *
   * @param id - Book ID
   * @param user - Optional authenticated user from JWT token
   * @returns Full book details including evaluation data
   */
  @Public()
  @Get(':id')
  async getBookById(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ): Promise<BookDetailDto> {
    const userId = user?.id;
    return this.queryService.findBookById(id, userId);
  }

  /**
   * Submit a new book for evaluation.
   * POST /api/books
   *
   * Accepts three submission methods:
   * 1. ISBN lookup: { isbn: "978-..." }
   * 2. URL lookup: { lookupUrl: "https://..." }
   * 3. Manual entry: { title: "...", author: "...", ... }
   *
   * Returns 202 Accepted - processing happens asynchronously via job queue.
   *
   * Requires authentication and organization admin role.
   *
   * @param user - Authenticated user from JWT token
   * @param req - Request object with userOrganization from IsOrgAdminGuard
   * @param dto - Book submission data
   * @returns Book creation result with status and message
   */
  @Post()
  @UseGuards(JwtAuthGuard, IsOrgAdminGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async createBook(
    @CurrentUser() user: User,
    @Request() req: RequestWithOrgAdmin,
    @Body() dto: CreateBookDto,
  ): Promise<BookSubmissionResponseDto> {
    const userId = user.id;
    const organizationId = req.userOrganization.id;

    // Delegate to orchestrator service
    const result = await this.orchestratorService.createBook(
      userId,
      organizationId,
      dto,
    );

    return result;
  }

  /**
   * Upload PDF file for a book.
   * POST /api/books/:id/pdf
   *
   * Accepts PDF file upload for a book. Only organization admins from the
   * submitting organization can upload PDFs.
   *
   * Returns 200 OK on success with upload confirmation.
   * Returns 400 Bad Request if:
   * - No file provided
   * - File is not PDF format
   * - File exceeds 100MB limit
   * Returns 403 Forbidden if user is not from the submitting organization.
   * Returns 404 Not Found if book doesn't exist.
   *
   * If book was already evaluated, uploading a new PDF will reset status
   * to 'pending' and queue a new evaluation job.
   *
   * @param id - Book ID
   * @param file - PDF file from multipart/form-data
   * @param pdfLicenseType - Optional license type (owned, licensed, etc.)
   * @param user - Authenticated user from JWT token
   * @param req - Request object with userOrganization from IsOrgAdminGuard
   * @returns Upload confirmation with processing status
   */
  @Post(':id/pdf')
  @UseGuards(JwtAuthGuard, IsOrgAdminGuard)
  @UseInterceptors(
    FileInterceptor('pdf', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadPdf(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('pdfLicenseType') pdfLicenseType: string | undefined,
    @CurrentUser() user: User,
    @Request() req: RequestWithOrgAdmin,
  ): Promise<UploadPdfResponseDto> {
    const userId = user.id;
    const organizationId = req.userOrganization.id;

    // Delegate to orchestrator service
    const result = await this.orchestratorService.uploadPdf(
      id,
      file,
      userId,
      organizationId,
      pdfLicenseType,
    );

    return result;
  }
}
