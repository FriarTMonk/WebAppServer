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

  // DEPRECATED: Temp session cache no longer needed
  // All authenticated users now have sessions in the database
  // Messages are subscription-gated (in-memory for non-subscribed, persisted for subscribed)

  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {
    // No cleanup needed - all sessions are in database
  }

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
    // Try to get existing session from database
    // All authenticated users have sessions in DB (no temp cache needed)
    let session: Session | null = null;
    if (sessionId) {
      session = await this.getSession(sessionId);
    }

    // Validate translation preference
    const validTranslation = await this.translationService.validateTranslation(preferredTranslation);

    // Create new session for ALL authenticated users (no anonymous users allowed)
    // Session metadata is always saved, but messages are subscription-gated
    if (!session && userId) {
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

      this.logger.debug(`Created new session ${session.id} for user ${userId} (messages will ${canSaveSession ? 'be saved' : 'NOT be saved - subscription required'})`);
    }

    // Update translation preference if changed (compare with validated translation)
    if (session && validTranslation && validTranslation !== session.preferredTranslation) {
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: { preferredTranslation: validTranslation },
        include: { messages: true },
      });

      this.logger.debug(`Updated session ${session.id} translation to ${validTranslation}`);
    }

    // CRITICAL: No anonymous users allowed - all users must be authenticated
    // If we reach here without a session and userId, something is wrong
    if (!session && !userId) {
      throw new Error('Cannot create session: user must be authenticated. Anonymous users are not supported.');
    }

    return session;
  }

  /**
   * Store a user message in the session
   * - All authenticated users have sessions in DB
   * - Messages are only persisted to DB for subscribed users (canSaveSession=true)
   * - Non-subscribed users: messages exist in-memory for current conversation only
   */
  async createUserMessage(
    sessionId: string,
    content: string,
    canSaveSession: boolean,
    session?: Session
  ): Promise<void> {
    // Messages are subscription-gated: only save to database if user has subscription
    if (canSaveSession) {
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

      this.logger.debug(`Created user message in database for session ${sessionId}`);
      return;
    }

    // Non-subscribed users: keep message in-memory for current conversation only
    // Session exists in DB but messages are NOT persisted
    if (session) {
      const tempMessage = {
        id: randomUUID(),
        sessionId,
        role: 'user' as const,
        content,
        scriptureReferences: [],
        timestamp: new Date(),
        isClarifyingQuestion: false,
      };
      session.messages.push(tempMessage);

      this.logger.debug(`Added user message to in-memory for session ${sessionId} (${session.messages.length} messages in current conversation - not persisted, subscription required)`);
    }
  }

  /**
   * Store an assistant message in the session
   * Returns the persisted message or a temporary message object
   * - All authenticated users have sessions in DB
   * - Messages are only persisted to DB for subscribed users (canSaveSession=true)
   * - Non-subscribed users: messages exist in-memory for current conversation only
   */
  async createAssistantMessage(
    sessionId: string,
    content: string,
    scriptureReferences: any[],
    isClarifyingQuestion: boolean,
    canSaveSession: boolean,
    griefResources?: any[],
    crisisResources?: any[],
    session?: Session
  ) {
    // Messages are subscription-gated: only save to database if user has subscription
    if (canSaveSession) {
      const assistantMessage = await this.prisma.message.create({
        data: {
          id: randomUUID(),
          sessionId,
          role: 'assistant',
          content,
          scriptureReferences,
          griefResources: griefResources ? JSON.parse(JSON.stringify(griefResources)) : undefined,
          crisisResources: crisisResources ? JSON.parse(JSON.stringify(crisisResources)) : undefined,
          isClarifyingQuestion,
          timestamp: new Date(),
        },
      });

      this.logger.debug(`Created assistant message in database for session ${sessionId}`);
      return assistantMessage;
    }

    // Non-subscribed users: create in-memory message for current conversation only
    // Session exists in DB but messages are NOT persisted
    const tempMessage = {
      id: randomUUID(),
      sessionId,
      role: 'assistant' as const,
      content,
      scriptureReferences,
      griefResources,
      crisisResources,
      isClarifyingQuestion,
      timestamp: new Date(),
    };

    // Add to in-memory array for current conversation
    if (session) {
      session.messages.push(tempMessage);

      this.logger.debug(`Added assistant message to in-memory for session ${sessionId} (${session.messages.length} messages in current conversation - not persisted, subscription required)`);
    }

    return tempMessage;
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
