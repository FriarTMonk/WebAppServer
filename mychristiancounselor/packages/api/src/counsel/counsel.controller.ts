import { Controller, Post, Get, Body, Param, Request, UseGuards, Put, Delete, HttpCode } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselExportService } from './counsel-export.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('counsel')
export class CounselController {
  constructor(
    private counselService: CounselService,
    private counselExportService: CounselExportService
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
}
