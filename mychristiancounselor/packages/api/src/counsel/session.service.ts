import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../scripture/translation.service';
import { BibleTranslation, Session } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';

/**
 * Handles counseling session management including creation, retrieval, and message persistence
 * Separated from CounselService to follow Single Responsibility Principle
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  /**
   * Get a session by ID with all messages ordered by timestamp
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  /**
   * Get or create session with subscription-aware logic
   * - Subscribed users: Persistent database session
   * - Free users: Temporary in-memory session object
   *
   * @param sessionId - Optional existing session ID
   * @param userId - User ID (null for anonymous users)
   * @param canSaveSession - Whether user has subscription to save sessions
   * @param message - First message for new session title
   * @param themes - Theological themes for session topics
   * @param preferredTranslation - Bible translation preference
   * @returns Session object (persisted or temporary)
   */
  async getOrCreateSession(
    sessionId: string | undefined,
    userId: string | null,
    canSaveSession: boolean,
    message: string,
    themes: string[],
    preferredTranslation: BibleTranslation
  ): Promise<Session> {
    // Try to get existing session
    let session: Session | null = null;
    if (sessionId) {
      session = await this.getSession(sessionId);
    }

    // Validate translation preference
    const validTranslation = await this.translationService.validateTranslation(preferredTranslation);

    // Create new session for subscribed users
    if (!session && canSaveSession && userId) {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');

      session = await this.prisma.session.create({
        data: {
          id: randomUUID(),
          userId,
          title,
          topics: JSON.stringify(themes),
          status: 'active',
          preferredTranslation: validTranslation,
        },
        include: { messages: true },
      });

      this.logger.debug(`Created new session ${session.id} for user ${userId}`);
    }

    // Update translation preference if changed
    if (session && preferredTranslation && preferredTranslation !== session.preferredTranslation) {
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: { preferredTranslation: validTranslation },
        include: { messages: true },
      });

      this.logger.debug(`Updated session ${session.id} translation to ${validTranslation}`);
    }

    // Create temporary session for free users
    if (!session) {
      session = {
        id: sessionId || randomUUID(),
        userId: userId || null,
        title: '',
        topics: JSON.stringify(themes),
        status: 'active' as const,
        preferredTranslation: validTranslation,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.debug(`Created temporary session ${session.id} for ${userId ? 'user ' + userId : 'anonymous user'}`);
    }

    return session;
  }

  /**
   * Store a user message in the session (subscription-gated)
   */
  async createUserMessage(
    sessionId: string,
    content: string,
    canSaveSession: boolean
  ): Promise<void> {
    if (!canSaveSession) {
      this.logger.debug('Skipping message persistence - user has no subscription');
      return;
    }

    await this.prisma.message.create({
      data: {
        id: randomUUID(),
        sessionId,
        role: 'user',
        content,
        scriptureReferences: [],
        timestamp: new Date(),
      },
    });

    this.logger.debug(`Created user message in session ${sessionId}`);
  }

  /**
   * Store an assistant message in the session (subscription-gated)
   * Returns the persisted message or a temporary message object
   */
  async createAssistantMessage(
    sessionId: string,
    content: string,
    scriptureReferences: any[],
    isClarifyingQuestion: boolean,
    canSaveSession: boolean
  ) {
    if (!canSaveSession) {
      // Return temporary message object for free users
      return {
        id: randomUUID(),
        sessionId,
        role: 'assistant' as const,
        content,
        scriptureReferences,
        isClarifyingQuestion,
        timestamp: new Date(),
      };
    }

    // Persist message for subscribed users
    const assistantMessage = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        sessionId,
        role: 'assistant',
        content,
        scriptureReferences,
        isClarifyingQuestion,
        timestamp: new Date(),
      },
    });

    this.logger.debug(`Created assistant message in session ${sessionId}`);
    return assistantMessage;
  }

  /**
   * Count clarifying questions in session history
   */
  countClarifyingQuestions(session: Session): number {
    return session.messages.filter(
      (m) => m.role === 'assistant' && m.isClarifyingQuestion === true
    ).length;
  }
}
