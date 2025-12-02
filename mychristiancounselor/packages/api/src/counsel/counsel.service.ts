import { Injectable, Logger } from '@nestjs/common';
import { CounselProcessingService } from './counsel-processing.service';
import { SessionService } from './session.service';
import { NoteService } from './note.service';
import { CounselResponse, BibleTranslation } from '@mychristiancounselor/shared';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

/**
 * CounselService - Pure Facade/Controller
 *
 * This service acts as a unified interface for all counseling-related operations.
 * It delegates all complex logic to specialized services following the Single Responsibility Principle.
 *
 * Design Pattern: Facade Pattern
 * - Provides a simplified interface to complex subsystems
 * - Delegates all actual work to specialized services
 * - Makes the system easier to use and understand
 *
 * Delegations:
 * - Question processing → CounselProcessingService
 * - Session management → SessionService
 * - Note operations → NoteService
 */
@Injectable()
export class CounselService {
  private readonly logger = new Logger(CounselService.name);

  constructor(
    private counselProcessing: CounselProcessingService,
    private sessionService: SessionService,
    private noteService: NoteService,
  ) {}

  /**
   * Process a counseling question
   * Delegates to CounselProcessingService for the complete workflow
   */
  async processQuestion(
    message: string,
    sessionId?: string,
    preferredTranslation?: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    userId?: string
  ): Promise<CounselResponse> {
    return this.counselProcessing.processQuestion(
      message,
      sessionId,
      preferredTranslation,
      comparisonMode,
      comparisonTranslations,
      userId
    );
  }

  /**
   * Get a session by ID
   * Delegates to SessionService
   */
  async getSession(sessionId: string) {
    return this.sessionService.getSession(sessionId);
  }

  /**
   * Create a note in a counseling session
   * Delegates to NoteService
   */
  async createNote(
    sessionId: string,
    authorId: string,
    organizationId: string,
    createNoteDto: CreateNoteDto
  ) {
    return this.noteService.createNote(sessionId, authorId, organizationId, createNoteDto);
  }

  /**
   * Get all notes for a session
   * Delegates to NoteService
   */
  async getNotesForSession(
    sessionId: string,
    requestingUserId: string,
    organizationId: string
  ) {
    return this.noteService.getNotesForSession(sessionId, requestingUserId, organizationId);
  }

  /**
   * Update an existing note
   * Delegates to NoteService
   */
  async updateNote(
    noteId: string,
    requestingUserId: string,
    organizationId: string,
    updateNoteDto: UpdateNoteDto
  ) {
    return this.noteService.updateNote(noteId, requestingUserId, organizationId, updateNoteDto);
  }

  /**
   * Delete a note (soft delete)
   * Delegates to NoteService
   */
  async deleteNote(
    noteId: string,
    requestingUserId: string
  ) {
    return this.noteService.deleteNote(noteId, requestingUserId);
  }
}
