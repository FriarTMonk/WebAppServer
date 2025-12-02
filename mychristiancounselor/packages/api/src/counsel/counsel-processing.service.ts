import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { SafetyService } from '../safety/safety.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { CounselResponse, BibleTranslation } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';

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
  ) {}

  /**
   * Process a counseling question through the complete workflow
   *
   * Workflow Steps:
   * 1. Get subscription status and user information
   * 2. Detect crisis situations (early return if crisis detected)
   * 3. Detect grief situations (flag but continue)
   * 4. Extract theological themes
   * 5. Get or create session
   * 6. Store user message
   * 7. Count clarifying questions
   * 8. Retrieve relevant scriptures
   * 9. Build conversation history
   * 10. Generate AI response
   * 11. Enrich response with scripture references
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

    // 1. Check for crisis using AI-powered contextual detection
    const isCrisis = await this.counselingAi.detectCrisisContextual(message);

    if (isCrisis) {
      this.logger.warn(`Crisis detected for user ${userId || 'anonymous'}`);
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
    const isGrief = await this.counselingAi.detectGriefContextual(message);
    if (isGrief) {
      this.logger.debug(`Grief detected for user ${userId || 'anonymous'}`);
    }

    // 3. Extract theological themes from the question
    const themes = await this.counselingAi.extractTheologicalThemes(message);
    this.logger.debug(`Extracted themes: ${themes.join(', ')}`);

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
}
