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

  // In-memory cache for temporary sessions (free users)
  // Key: sessionId, Value: { session: Session, expiresAt: number }
  private readonly tempSessionCache = new Map<string, { session: Session; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {
    // Clean up expired cache entries every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
  }

  /**
   * Remove expired temporary sessions from cache
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [sessionId, cached] of this.tempSessionCache.entries()) {
      if (now > cached.expiresAt) {
        this.tempSessionCache.delete(sessionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired temporary sessions`);
    }
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
    // Try to get existing session
    let session: Session | null = null;
    if (sessionId) {
      session = await this.getSession(sessionId);

      // If not in database, check temporary session cache (for free users)
      if (!session && this.tempSessionCache.has(sessionId)) {
        const cached = this.tempSessionCache.get(sessionId)!;

        // Check if cache entry is still valid
        if (Date.now() <= cached.expiresAt) {
          session = cached.session;
          this.logger.debug(`Retrieved temporary session ${sessionId} from cache with ${session.messages.length} messages`);
        } else {
          // Remove expired entry
          this.tempSessionCache.delete(sessionId);
          this.logger.debug(`Removed expired temporary session ${sessionId} from cache`);
        }
      }
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

    // Update translation preference if changed (compare with validated translation)
    if (session && validTranslation && validTranslation !== session.preferredTranslation) {
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

      // Store in cache with 1-hour expiration
      this.tempSessionCache.set(session.id, {
        session,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      this.logger.debug(`Created temporary session ${session.id} for ${userId ? 'user ' + userId : 'anonymous user'} and stored in cache`);
    }

    return session;
  }

  /**
   * Store a user message in the session (subscription-gated)
   * For temporary sessions, add to in-memory messages array
   */
  async createUserMessage(
    sessionId: string,
    content: string,
    canSaveSession: boolean,
    session?: Session
  ): Promise<void> {
    if (!canSaveSession) {
      // For temporary sessions, add message to in-memory array for history/counting
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

        // Update cache to persist message across requests
        if (this.tempSessionCache.has(sessionId)) {
          this.tempSessionCache.set(sessionId, {
            session,
            expiresAt: Date.now() + this.CACHE_TTL_MS, // Reset expiration
          });
        }

        this.logger.debug(`Added user message to temporary session ${sessionId} (${session.messages.length} total messages)`);
      }
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
   * For temporary sessions, add to in-memory messages array
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
    if (!canSaveSession) {
      // Create temporary message object for free users
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

      // Add to in-memory array for history/counting
      if (session) {
        session.messages.push(tempMessage);

        // Update cache to persist message across requests
        if (this.tempSessionCache.has(sessionId)) {
          this.tempSessionCache.set(sessionId, {
            session,
            expiresAt: Date.now() + this.CACHE_TTL_MS, // Reset expiration
          });
        }

        this.logger.debug(`Added assistant message to temporary session ${sessionId} (${session.messages.length} total messages, isClarifyingQuestion: ${isClarifyingQuestion})`);
      }

      return tempMessage;
    }

    // Persist message for subscribed users
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
