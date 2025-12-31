import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { SafetyService } from '../safety/safety.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { SessionLimitService } from './session-limit.service';
import { CounselResponse, BibleTranslation } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';
import { EVENT_TYPES, CrisisDetectedEvent } from '../events/event-types';

/**
 * Handles the core counseling workflow orchestration
 * Separated from CounselService to follow Single Responsibility Principle
 *
 * Responsibilities:
 * - Orchestrate the complete counseling question processing workflow
 * - Crisis and grief detection
 * - Theme extraction
 * - AI response generation
 * - Conversation history management
 * - Response assembly with metadata
 */
@Injectable()
export class CounselProcessingService {
  private readonly logger = new Logger(CounselProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private counselingAi: CounselingAiService,
    private safetyService: SafetyService,
    private subscriptionService: SubscriptionService,
    private scriptureEnrichment: ScriptureEnrichmentService,
    private sessionService: SessionService,
    private sessionLimitService: SessionLimitService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process a counseling question through the complete workflow
   *
   * Workflow Steps:
   * 1. Get subscription status and user information
   * 2. Detect crisis situations (early return if crisis detected)
   * 3. Detect grief situations (flag but continue)
   * 4. Extract theological themes
   * 5. Enforce session limit (new sessions only, free users only)
   * 6. Get or create session
   * 7. Store user message
   * 8. Count clarifying questions
   * 9. Retrieve relevant scriptures
   * 10. Build conversation history
   * 11. Generate AI response
   * 12. Enrich response with scripture references
   * 12. Store assistant message
   * 13. Return response with metadata
   *
   * @param message - The user's counseling question
   * @param sessionId - Optional existing session ID
   * @param preferredTranslation - Bible translation preference
   * @param comparisonMode - Whether to show multiple translations
   * @param comparisonTranslations - Additional translations for comparison
   * @param userId - User ID (null for anonymous users)
   * @returns CounselResponse with message, metadata, and resources
   */
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

    // 1. Check for crisis using layered detection (pattern + AI contextual)
    const crisisResult = await this.safetyService.detectCrisis(message);
    if (crisisResult.isDetected) {
      this.logger.warn(
        `Crisis detected for user ${userId || 'anonymous'} ` +
        `[method: ${crisisResult.detectionMethod}, confidence: ${crisisResult.confidence}]`
      );

      // Publish crisis detected event (only for authenticated users)
      if (userId) {
        try {
          // Validate and normalize detection method (SafetyService can return 'none')
          const validDetectionMethod =
            crisisResult.detectionMethod === 'none'
              ? 'pattern'
              : (crisisResult.detectionMethod as 'pattern' | 'ai' | 'both');

          const event: CrisisDetectedEvent = {
            memberId: userId,
            crisisType: 'suicidal_ideation', // TODO: Enhance SafetyService to return specific crisis type
            confidence: crisisResult.confidence as 'high' | 'medium' | 'low',
            detectionMethod: validDetectionMethod,
            triggeringMessage: message,
            messageId: undefined, // Event emitted before message storage for timely alerting
            timestamp: new Date(),
          };

          this.eventEmitter.emit(EVENT_TYPES.CRISIS_DETECTED, event);
          this.logger.log(`Crisis event emitted for member ${userId} (${event.crisisType}, ${event.confidence} confidence)`);
        } catch (error) {
          this.logger.error(`Failed to emit crisis event for member ${userId}`, error);
          // Event emission failure shouldn't block counsel response
        }
      }
    }

    // 2. Check for grief using layered detection (pattern + AI contextual)
    const griefResult = await this.safetyService.detectGrief(message);
    if (griefResult.isDetected) {
      this.logger.debug(
        `Grief detected for user ${userId || 'anonymous'} ` +
        `[method: ${griefResult.detectionMethod}, confidence: ${griefResult.confidence}]`
      );
    }

    // 3. Extract theological themes from the question
    const themes = await this.counselingAi.extractTheologicalThemes(message);
    this.logger.debug(`Extracted themes: ${themes.join(', ')}`);

    // 4. Enforce session limit for new sessions (free users only)
    // Only check limit when creating a NEW session (sessionId is undefined)
    if (!sessionId && userId) {
      await this.sessionLimitService.enforceLimit(userId, subscriptionStatus.hasHistoryAccess);
    }

    // 5. Get or create session using SessionService
    const canSaveSession = subscriptionStatus.hasHistoryAccess;
    const session = await this.sessionService.getOrCreateSession(
      sessionId,
      userId || null,
      canSaveSession,
      message,
      themes,
      preferredTranslation || 'KJV'
    );

    // 5. Store user message using SessionService (pass session for temporary session tracking)
    await this.sessionService.createUserMessage(session.id, message, canSaveSession, session);

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
    const aiResponse = await this.counselingAi.generateResponse(
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

    // 11. Store assistant message using SessionService (with grief/crisis resources if detected)
    const griefResources = griefResult.isDetected ? this.safetyService.getGriefResources() : undefined;
    const crisisResources = crisisResult.isDetected ? this.safetyService.getCrisisResources() : undefined;

    const assistantMessage = await this.sessionService.createAssistantMessage(
      session.id,
      aiResponse.content,
      JSON.parse(JSON.stringify(finalScriptures)),
      aiResponse.requiresClarification,
      canSaveSession,
      griefResources,
      crisisResources,
      session
    );

    // 11a. Log detections for continuous improvement (non-blocking)
    if (crisisResult.isDetected) {
      await this.safetyService.logDetection(
        'crisis',
        crisisResult,
        message,
        session.id,
        assistantMessage.id,
        userId
      );
    }

    if (griefResult.isDetected) {
      await this.safetyService.logDetection(
        'grief',
        griefResult,
        message,
        session.id,
        assistantMessage.id,
        userId
      );
    }

    // 12. Calculate current question count AFTER this response
    // Count all assistant messages that were clarifying questions (requiresClarification: true)
    // Since we just added the new message, if it's a clarifying question, it will be included
    const updatedQuestionCount = clarificationCount + (aiResponse.requiresClarification ? 1 : 0);

    // 13. Return response with crisis/grief detection flags, method, confidence, and question count
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
      isCrisisDetected: crisisResult.isDetected,
      crisisDetectionMethod: crisisResult.detectionMethod,
      crisisDetectionConfidence: crisisResult.confidence,
      crisisResources,
      isGriefDetected: griefResult.isDetected,
      griefDetectionMethod: griefResult.detectionMethod,
      griefDetectionConfidence: griefResult.confidence,
      griefResources,
      currentSessionQuestionCount: updatedQuestionCount,
    };
  }

  /**
   * Create an empty session for a user
   * Called when user lands on conversation page to count session immediately
   *
   * @param userId - User ID (optional for anonymous users)
   * @param preferredTranslation - Preferred Bible translation
   * @returns Session ID
   */
  async createEmptySession(
    userId: string | undefined,
    preferredTranslation: BibleTranslation
  ): Promise<{ sessionId: string }> {
    // 1. Get subscription status
    const subscriptionStatus = userId
      ? await this.subscriptionService.getSubscriptionStatus(userId)
      : { hasHistoryAccess: false };

    // 2. Enforce session limit for new sessions (free users only)
    if (userId) {
      await this.sessionLimitService.enforceLimit(userId, subscriptionStatus.hasHistoryAccess);
    }

    // 3. Create empty session
    // All authenticated users get Session records (for counting)
    // Messages only saved for subscribed users (hasHistoryAccess)
    const canSaveSession = !!userId;
    const session = await this.sessionService.getOrCreateSession(
      undefined, // No existing sessionId
      userId || null,
      canSaveSession,
      '', // Empty initial message
      [], // No themes yet
      preferredTranslation || 'KJV'
    );

    this.logger.debug(`Created empty session ${session.id} for user ${userId || 'anonymous'}`);

    return { sessionId: session.id };
  }
}
