import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { TranslationService } from '../scripture/translation.service';
import { EmailService } from '../email/email.service';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { NoteService } from './note.service';
import { CounselResponse, BibleTranslation, ScriptureReference } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class CounselService {
  private readonly logger = new Logger(CounselService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,
    private safetyService: SafetyService,
    private subscriptionService: SubscriptionService,
    private translationService: TranslationService,
    private emailService: EmailService,
    // Extracted services for refactored responsibilities
    private scriptureEnrichment: ScriptureEnrichmentService,
    private sessionService: SessionService,
    private noteService: NoteService,
  ) {}

  async processQuestion(
    message: string,
    sessionId?: string,
    preferredTranslation?: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    userId?: string
  ): Promise<CounselResponse> {
    // 0. Get subscription status and user information
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    const maxClarifyingQuestions = subscriptionStatus.maxClarifyingQuestions;

    let userName: string | undefined;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true },
      });
      userName = user?.firstName || undefined;
    }

    // 1. Check for crisis using AI-powered contextual detection
    const isCrisis = await this.aiService.detectCrisisContextual(message);

    if (isCrisis) {
      return {
        sessionId: sessionId || randomUUID(),
        message: {
          id: randomUUID(),
          sessionId: sessionId || '',
          role: 'system',
          content: this.safetyService.generateCrisisResponse(),
          scriptureReferences: [],
          timestamp: new Date(),
        },
        requiresClarification: false,
        isCrisisDetected: true,
        crisisResources: this.safetyService.getCrisisResources(),
      };
    }

    // 2. Check for grief using AI-powered contextual detection - flag but continue with normal flow
    const isGrief = await this.aiService.detectGriefContextual(message);

    // 3. Extract theological themes from the question
    const themes = await this.aiService.extractTheologicalThemes(message);

    // 4. Get or create session using SessionService
    const canSaveSession = subscriptionStatus.hasHistoryAccess;
    const session = await this.sessionService.getOrCreateSession(
      sessionId,
      userId || null,
      canSaveSession,
      message,
      themes,
      preferredTranslation || 'KJV'
    );

    // 5. Store user message using SessionService
    await this.sessionService.createUserMessage(session.id, message, canSaveSession);

    // 6. Count clarifying questions using SessionService
    const clarificationCount = this.sessionService.countClarifyingQuestions(session);

    // 7. Retrieve relevant scriptures using ScriptureEnrichmentService
    const scriptures = await this.scriptureEnrichment.retrieveScripturesByThemes(
      themes,
      session.preferredTranslation,
      comparisonMode,
      comparisonTranslations,
      3
    );

    // 8. Build conversation history
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 9. Generate AI response
    const aiResponse = await this.aiService.generateResponse(
      message,
      scriptures,
      conversationHistory,
      clarificationCount,
      maxClarifyingQuestions
    );

    // 10. Enrich response with scripture references using ScriptureEnrichmentService
    const finalScriptures = await this.scriptureEnrichment.enrichResponseWithScriptures(
      aiResponse.content,
      session.preferredTranslation,
      scriptures
    );

    // 11. Store assistant message using SessionService
    const assistantMessage = await this.sessionService.createAssistantMessage(
      session.id,
      aiResponse.content,
      JSON.parse(JSON.stringify(finalScriptures)),
      aiResponse.requiresClarification,
      canSaveSession
    );

    // 12. Calculate current question count AFTER this response
    // Count all assistant messages that were clarifying questions (requiresClarification: true)
    // Since we just added the new message, if it's a clarifying question, it will be included
    const updatedQuestionCount = clarificationCount + (aiResponse.requiresClarification ? 1 : 0);

    // 13. Return response with grief detection flag and question count
    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: finalScriptures,
        timestamp: assistantMessage.timestamp,
      },
      requiresClarification: aiResponse.requiresClarification,
      isCrisisDetected: false,
      isGriefDetected: isGrief,
      griefResources: isGrief ? this.safetyService.getGriefResources() : undefined,
      currentSessionQuestionCount: updatedQuestionCount,
    };
  }

  async getSession(sessionId: string) {
    return this.sessionService.getSession(sessionId);
  }

  async createNote(
    sessionId: string,
    authorId: string,
    organizationId: string,
    createNoteDto: CreateNoteDto
  ) {
    return this.noteService.createNote(sessionId, authorId, organizationId, createNoteDto);
  }

  async getNotesForSession(
    sessionId: string,
    requestingUserId: string,
    organizationId: string
  ) {
    return this.noteService.getNotesForSession(sessionId, requestingUserId, organizationId);
  }

  async updateNote(
    noteId: string,
    requestingUserId: string,
    organizationId: string,
    updateNoteDto: UpdateNoteDto
  ) {
    return this.noteService.updateNote(noteId, requestingUserId, organizationId, updateNoteDto);
  }

  async deleteNote(
    noteId: string,
    requestingUserId: string
  ) {
    return this.noteService.deleteNote(noteId, requestingUserId);
  }
}
