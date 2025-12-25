import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOrgAdminGuard } from '../admin/guards/is-org-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@mychristiancounselor/shared';
import { BookOrchestratorService } from './book-orchestrator.service';
import { BookQueryService } from './services/book-query.service';
import {
  CreateBookDto,
  BookSubmissionResponseDto,
  BookQueryDto,
  BookListResponseDto,
} from './dto';
import { RequestWithOrgAdmin } from './interfaces/request-with-org-admin.interface';

/**
 * Controller for book submission and management.
 */
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
  @Get()
  async listBooks(
    @Query() query: BookQueryDto,
    @CurrentUser() user?: User,
  ): Promise<BookListResponseDto> {
    const userId = user?.id;
    return this.queryService.findBooks(query, userId);
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
}
