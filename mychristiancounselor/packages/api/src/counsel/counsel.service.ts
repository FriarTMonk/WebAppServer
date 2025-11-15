import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { TranslationService } from '../scripture/translation.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CounselResponse, BibleTranslation } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class CounselService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,
    private safetyService: SafetyService,
    private translationService: TranslationService,
    private subscriptionService: SubscriptionService,
  ) {}

  async processQuestion(
    message: string,
    sessionId?: string,
    preferredTranslation?: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    userId?: string, // Add userId parameter
  ): Promise<CounselResponse> {
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

    // 3. Get user subscription status and limits
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    const maxClarifyingQuestions = subscriptionStatus.maxClarifyingQuestions;

    // 4. Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
      });
    }

    if (!session) {
      // Create new session with title from first message
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);

      session = await this.prisma.session.create({
        data: {
          id: randomUUID(),
          userId: userId || null, // Use provided userId (null for anonymous)
          title,
          status: 'active',
          questionCount: 0,
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

    // 5. Store user message
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

    // 6. Check current question count from session
    const currentQuestionCount = session.questionCount;

    // 7. Retrieve relevant scriptures (single translation or multiple for comparison)
    let scriptures;
    if (comparisonMode && comparisonTranslations && comparisonTranslations.length > 0) {
      // Fetch same verses in multiple translations for proper comparison
      scriptures = await this.scriptureService.retrieveSameVersesInMultipleTranslations(
        message,
        comparisonTranslations,
        3
      );
    } else {
      // Single translation mode
      scriptures = await this.scriptureService.retrieveRelevantScriptures(
        message,
        session.preferredTranslation,
        3
      );
    }

    // 8. Build conversation history
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 9. Generate AI response with question limit
    const aiResponse = await this.aiService.generateResponse(
      message,
      scriptures,
      conversationHistory,
      currentQuestionCount,
      maxClarifyingQuestions,
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

    // 12. If AI asked clarifying question, increment count
    if (aiResponse.requiresClarification) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { questionCount: { increment: 1 } },
      });
    }

    // 13. Return response with grief detection flag if applicable
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
}
