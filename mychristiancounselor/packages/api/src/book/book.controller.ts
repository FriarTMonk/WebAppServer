import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOrgAdminGuard } from '../admin/guards/is-org-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@mychristiancounselor/shared';
import { BookOrchestratorService } from './book-orchestrator.service';
import { CreateBookDto, BookSubmissionResponseDto } from './dto';

/**
 * Controller for book submission and management.
 * Requires authentication and organization admin role.
 */
@Controller('books')
@UseGuards(JwtAuthGuard, IsOrgAdminGuard)
export class BookController {
  constructor(private readonly orchestratorService: BookOrchestratorService) {}

  /**
   * Submit a new book for evaluation.
   * POST /api/books
   *
   * Accepts three submission methods:
   * 1. ISBN lookup: { isbn: "978-..." }
   * 2. URL lookup: { lookupUrl: "https://..." }
   * 3. Manual entry: { title: "...", author: "...", ... }
   *
   * Optional PDF upload with license type.
   * Returns 202 Accepted - processing happens asynchronously via job queue.
   *
   * @param user - Authenticated user from JWT token
   * @param req - Request object with userOrganization from IsOrgAdminGuard
   * @param dto - Book submission data
   * @param file - Optional PDF file
   * @returns Book creation result with status and message
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('pdf'))
  async createBook(
    @CurrentUser() user: User,
    @Request() req: any,
    @Body() dto: CreateBookDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BookSubmissionResponseDto> {
    const userId = user.id;
    const organizationId = req.userOrganization.id;

    // Delegate to orchestrator service
    // TODO: Handle PDF file upload when implementing file storage
    const result = await this.orchestratorService.createBook(
      userId,
      organizationId,
      dto,
    );

    return result;
  }
}
