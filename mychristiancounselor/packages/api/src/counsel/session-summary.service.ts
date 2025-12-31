import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { SessionCompletedEvent } from '../events/event-types';

/**
 * SessionSummaryService - Generate and manage AI summaries for counseling sessions
 *
 * Responsibilities:
 * - Generate AI summaries after each conversation
 * - Extract key topics and sentiment from conversations
 * - Store summaries in SessionSummary table for longitudinal tracking
 * - Retrieve summaries for counselor review and alert generation
 *
 * Part of Phase 2: Wellbeing Tracking & Assessments (Counselor Alert System)
 */
@Injectable()
export class SessionSummaryService {
  private readonly logger = new Logger(SessionSummaryService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: CounselingAiService,
  ) {}

  /**
   * Event listener: Automatically generate summary when session completes
   *
   * Triggered by session.completed event from CounselProcessingService
   * Failures are logged but non-blocking to prevent disrupting user experience
   *
   * @param event - SessionCompletedEvent containing session and member info
   */
  @OnEvent('session.completed')
  async handleSessionCompleted(event: SessionCompletedEvent) {
    this.logger.log(`Generating summary for completed session ${event.sessionId}`);

    try {
      await this.generateSummary(event.sessionId, event.memberId);
    } catch (error) {
      this.logger.error(`Failed to generate summary for session ${event.sessionId}:`, error);
      // Don't throw - failures in summary generation shouldn't be critical
    }
  }

  /**
   * Generate AI summary for a completed conversation
   *
   * Extracts:
   * - 2-3 sentence summary of what was discussed
   * - Key topics mentioned in the conversation
   * - Overall sentiment (positive, neutral, concerned, distressed)
   *
   * @param sessionId - ID of the session to summarize
   * @param memberId - ID of the member who owns the session
   * @returns Created SessionSummary record
   */
  async generateSummary(sessionId: string, memberId: string) {
    this.logger.log(`Generating summary for session ${sessionId}`);

    // Get session with messages
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messages = JSON.parse(session.messages || '[]');

    // Build conversation text for AI analysis
    const conversationText = messages
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Generate summary using AI
    const prompt = `Analyze this Christian counseling conversation and provide a structured summary.

CONVERSATION:
${conversationText}

INSTRUCTIONS:
1. Write a 2-3 sentence summary of what was discussed in the conversation
2. Identify 3-5 key topics or themes (single words or short phrases)
3. Determine overall sentiment: positive, neutral, or negative

SENTIMENT DEFINITIONS:
- positive: Person is doing well, expressing gratitude, feeling hopeful, growth-oriented
- neutral: General spiritual questions, theological inquiry, normal life situations
- negative: Experiencing significant distress, worry, struggling, crisis indicators, suffering

Respond with valid JSON in this exact format:
{
  "summary": "Your 2-3 sentence summary here",
  "topics": ["topic1", "topic2", "topic3"],
  "sentiment": "neutral"
}`;

    let aiResponse: string;
    try {
      aiResponse = await this.aiService.chatCompletion('haiku', [
        {
          role: 'system',
          content: 'You are a clinical counseling assistant analyzing conversation summaries. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ], {
        temperature: 0.3,
        max_tokens: 500,
      });
    } catch (error) {
      this.logger.error(`Failed to generate AI summary for session ${sessionId}`, error);
      throw error;
    }

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
      this.logger.debug(`Successfully parsed AI summary for session ${sessionId}`);
    } catch (error) {
      // Fallback if AI doesn't return valid JSON
      this.logger.warn(
        `Failed to parse JSON from AI response for session ${sessionId}, using fallback`,
        error
      );
      parsedResponse = {
        summary: aiResponse,
        topics: [],
        sentiment: 'neutral',
      };
    }

    // Validate and normalize sentiment (must match Prisma SentimentType enum)
    const validSentiments = ['positive', 'neutral', 'negative'];
    const sentiment = validSentiments.includes(parsedResponse.sentiment)
      ? parsedResponse.sentiment
      : 'neutral';

    // Store summary
    const summary = await this.prisma.sessionSummary.create({
      data: {
        sessionId,
        memberId,
        summary: parsedResponse.summary,
        topics: parsedResponse.topics || [],
        sentiment,
      },
    });

    this.logger.log(
      `Created summary for session ${sessionId} (sentiment: ${sentiment}, topics: ${parsedResponse.topics?.length || 0})`
    );

    return summary;
  }

  /**
   * Get summary for a specific session
   *
   * @param sessionId - ID of the session
   * @returns SessionSummary record or null if not found
   */
  async getSummary(sessionId: string) {
    return this.prisma.sessionSummary.findUnique({
      where: { sessionId },
    });
  }

  /**
   * Get recent summaries for a member
   *
   * Used by counselors to review member's conversation history
   * and identify patterns or concerns over time.
   *
   * @param memberId - ID of the member
   * @param limit - Maximum number of summaries to retrieve (default: 5)
   * @returns Array of SessionSummary records ordered by most recent
   */
  async getRecentSummaries(memberId: string, limit: number = 5) {
    return this.prisma.sessionSummary.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
