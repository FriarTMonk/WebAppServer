import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { TranslationService } from '../scripture/translation.service';
import { CounselResponse, BibleTranslation } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class CounselService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,
    private safetyService: SafetyService,
    private translationService: TranslationService
  ) {}

  async processQuestion(
    message: string,
    sessionId?: string,
    preferredTranslation?: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    userId?: string
  ): Promise<CounselResponse> {
    // 0. Get user information if userId is provided
    let userName: string | undefined;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true },
      });
      userName = user?.firstName || undefined;
    }

    // 1. Check for crisis
    const isCrisis = this.safetyService.detectCrisis(message);

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

    // 2. Check for grief - flag but continue with normal flow
    const isGrief = this.safetyService.detectGrief(message);

    // 3. Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
      });
    }

    // 6. Extract theological themes from the question
    const themes = await this.aiService.extractTheologicalThemes(message);

    if (!session) {
      // Create new session with title from first message
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);

      session = await this.prisma.session.create({
        data: {
          id: randomUUID(),
          userId: userId || null, // Store userId if authenticated, otherwise anonymous
          title,
          topics: JSON.stringify(themes), // Store theological topics
          status: 'active',
          preferredTranslation: validTranslation,
        },
        include: { messages: true },
      });
    } else if (preferredTranslation && preferredTranslation !== session.preferredTranslation) {
      // Update session translation preference if it changed
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: { preferredTranslation: validTranslation },
        include: { messages: true },
      });
    }

    // 4. Store user message
    await this.prisma.message.create({
      data: {
        id: randomUUID(),
        sessionId: session.id,
        role: 'user',
        content: message,
        scriptureReferences: [],
        timestamp: new Date(),
      },
    });

    // 5. Count clarifying questions so far
    const clarificationCount = session.messages.filter(
      (m) => m.role === 'assistant' && m.content.includes('?')
    ).length;

    // 6. Retrieve relevant scriptures with themes (single translation or multiple for comparison)
    let scriptures;
    if (comparisonMode && comparisonTranslations && comparisonTranslations.length > 0) {
      // Fetch same verses in multiple translations for proper comparison (with themes)
      scriptures = await this.scriptureService.retrieveSameVersesInMultipleTranslationsWithThemes(
        themes,
        comparisonTranslations,
        3
      );
    } else {
      // Single translation mode (with themes)
      scriptures = await this.scriptureService.retrieveRelevantScripturesWithThemes(
        themes,
        session.preferredTranslation,
        3
      );
    }

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
      userName
    );

    // 10. Extract scripture references from response
    // (Currently unused, but available for future enhancement)
    // const extractedRefs = this.aiService.extractScriptureReferences(
    //   aiResponse.content
    // );

    // 11. Store assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: JSON.parse(JSON.stringify(scriptures)),
        timestamp: new Date(),
      },
    });

    // 12. Return response with grief detection flag if applicable
    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: scriptures,
        timestamp: assistantMessage.timestamp,
      },
      requiresClarification: aiResponse.requiresClarification,
      isCrisisDetected: false,
      isGriefDetected: isGrief,
      griefResources: isGrief ? this.safetyService.getGriefResources() : undefined,
    };
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  async createNote(
    sessionId: string,
    authorId: string,
    createNoteDto: CreateNoteDto
  ) {
    // 1. Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 2. Get author info
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { firstName: true, lastName: true, accountType: true },
    });

    if (!author) {
      throw new NotFoundException('User not found');
    }

    // 3. Determine role
    const authorRole = session.userId === authorId ? 'user' : 'counselor';

    // 4. Build author name
    const authorName = [author.firstName, author.lastName]
      .filter(Boolean)
      .join(' ') || 'Anonymous';

    // 5. Create note
    return this.prisma.sessionNote.create({
      data: {
        sessionId,
        authorId,
        authorName,
        authorRole,
        content: createNoteDto.content,
        isPrivate: createNoteDto.isPrivate || false,
      },
    });
  }

  async getNotesForSession(
    sessionId: string,
    requestingUserId: string
  ) {
    // 1. Verify session exists and user has access
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 2. Get all notes for session
    const notes = await this.prisma.sessionNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Filter private notes
    return notes.filter(note => {
      // Public notes visible to all
      if (!note.isPrivate) return true;

      // Private notes only visible to author
      if (note.authorId === requestingUserId) return true;

      // TODO: Future - check if user is org admin
      return false;
    });
  }
}
