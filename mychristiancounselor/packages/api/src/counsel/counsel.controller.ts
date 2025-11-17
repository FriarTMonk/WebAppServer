import { Controller, Post, Get, Body, Param, Request, UseGuards, Put, Delete, HttpCode, Query, ForbiddenException } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { AssignmentService } from './assignment.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsCounselorGuard } from './guards/is-counselor.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('counsel')
export class CounselController {
  constructor(
    private counselService: CounselService,
    private counselExportService: CounselExportService,
    private assignmentService: AssignmentService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('ask')
  async ask(@Body() dto: CounselRequestDto, @Request() req) {
    // Extract userId if user is authenticated (optional)
    const userId = req.user?.id;

    return this.counselService.processQuestion(
      dto.message,
      dto.sessionId,
      dto.preferredTranslation,
      dto.comparisonMode,
      dto.comparisonTranslations,
      userId
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('notes/:sessionId')
  async createNote(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Body() createNoteDto: CreateNoteDto
  ) {
    const userId = req.user.id;
    const note = await this.counselService.createNote(
      sessionId,
      userId,
      createNoteDto
    );
    return { note };
  }

  @UseGuards(JwtAuthGuard)
  @Get('notes/:sessionId')
  async getNotes(
    @Param('sessionId') sessionId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    const notes = await this.counselService.getNotesForSession(
      sessionId,
      userId
    );
    return { notes };
  }

  @UseGuards(JwtAuthGuard)
  @Put('notes/:noteId')
  async updateNote(
    @Param('noteId') noteId: string,
    @Request() req,
    @Body() updateNoteDto: UpdateNoteDto
  ) {
    const userId = req.user.id;
    const note = await this.counselService.updateNote(
      noteId,
      userId,
      updateNoteDto
    );
    return { note };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('notes/:noteId')
  @HttpCode(204)
  async deleteNote(
    @Param('noteId') noteId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    await this.counselService.deleteNote(noteId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/:sessionId')
  async exportSession(
    @Param('sessionId') sessionId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    return this.counselExportService.getSessionForExport(sessionId, userId);
  }

  // ===== COUNSELOR DASHBOARD ENDPOINTS =====

  /**
   * Get all members assigned to the counselor
   * GET /counsel/members?organizationId=xxx
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Get('members')
  async getCounselorMembers(
    @Request() req,
    @Query('organizationId') organizationId: string,
  ) {
    const counselorId = req.user.id;

    if (!organizationId) {
      // Get user's first organization if not specified
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: counselorId },
        select: { organizationId: true },
      });

      if (!membership) {
        return { members: [] };
      }

      organizationId = membership.organizationId;
    }

    const members = await this.assignmentService.getCounselorMembers(
      counselorId,
      organizationId
    );

    return { members };
  }

  /**
   * Get all sessions for a specific member (counselor access)
   * GET /counsel/members/:memberId/sessions
   */
  @UseGuards(JwtAuthGuard, IsCounselorGuard)
  @Get('members/:memberId/sessions')
  async getMemberSessions(
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    const counselorId = req.user.id;

    // Verify counselor has assignment to this member
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: counselorId },
      select: { organizationId: true },
    });

    if (!membership) {
      throw new ForbiddenException('No organization membership found');
    }

    const hasAssignment = await this.assignmentService.verifyCounselorAssignment(
      counselorId,
      memberId,
      membership.organizationId
    );

    if (!hasAssignment) {
      throw new ForbiddenException('You are not assigned to this member');
    }

    // Get all sessions for the member
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        questionCount: true,
      },
    });

    return { sessions };
  }
}
