import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WellbeingAnalysisService {
  private readonly logger = new Logger(WellbeingAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * Analyze a member's conversations from the past 7 days
   * and generate wellbeing status and summary
   */
  async analyzeMemberWellbeing(memberId: string): Promise<void> {
    this.logger.log(`Starting wellbeing analysis for member ${memberId}`);

    try {
      // Get recent conversations
      const { messages, sessionCount } = await this.getRecentConversations(memberId);

      // Detect wellbeing status using AI
      const { status, reasoning } = await this.detectWellbeingStatus(messages);
      this.logger.debug(`Detected status: ${status} - ${reasoning}`);

      // Generate 7-day summary
      const summary = await this.generateSevenDaySummary(messages, sessionCount);
      this.logger.debug(`Generated summary: ${summary}`);

      // Get existing status to check for override
      const existing = await this.prisma.memberWellbeingStatus.findUnique({
        where: { memberId },
      });

      // Upsert wellbeing status record
      await this.prisma.memberWellbeingStatus.upsert({
        where: { memberId },
        create: {
          memberId,
          status,
          aiSuggestedStatus: status,
          summary,
          lastAnalyzedAt: new Date(),
        },
        update: {
          // Preserve manual override if it exists
          ...(existing?.overriddenBy ? {} : { status }),
          aiSuggestedStatus: status,
          summary,
          lastAnalyzedAt: new Date(),
        },
      });

      this.logger.log(`Completed wellbeing analysis for member ${memberId}: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to analyze member ${memberId}`, error);
      throw error;
    }
  }

  /**
   * Run analysis for all members with active assignments
   */
  async analyzeAllMembers(): Promise<void> {
    this.logger.log('Starting wellbeing analysis for all assigned members');

    try {
      // Get all members with active counselor assignments
      const assignments = await this.prisma.counselorAssignment.findMany({
        where: { status: 'active' },
        select: { memberId: true },
        distinct: ['memberId'],
      });

      this.logger.log(`Found ${assignments.length} members with active assignments`);

      // Analyze each member sequentially (avoid rate limits)
      for (const assignment of assignments) {
        try {
          await this.analyzeMemberWellbeing(assignment.memberId);

          // Small delay to avoid OpenAI rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Failed to analyze member ${assignment.memberId}, continuing...`, error);
          // Continue with next member even if one fails
        }
      }

      this.logger.log('Completed wellbeing analysis for all members');
    } catch (error) {
      this.logger.error('Failed to analyze all members', error);
      throw error;
    }
  }

  /**
   * Get all messages from past 7 days for a member
   */
  private async getRecentConversations(memberId: string): Promise<{
    messages: Array<{ role: string; content: string; timestamp: Date }>;
    sessionCount: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all sessions from past 7 days
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: memberId,
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten all messages
    const allMessages = sessions.flatMap(session =>
      session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }))
    );

    return {
      messages: allMessages,
      sessionCount: sessions.length,
    };
  }

  /**
   * Use AI to analyze conversation content and determine wellbeing status
   */
  private async detectWellbeingStatus(
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ status: 'red' | 'yellow' | 'green'; reasoning: string }> {
    if (messages.length === 0) {
      return { status: 'green', reasoning: 'No recent conversations' };
    }

    // Prepare conversation text for AI analysis
    const conversationText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const analysisPrompt = `Analyze this conversation from a pastoral counseling perspective and determine the member's wellbeing status:

${conversationText}

Assess for:
- CRISIS (RED): Suicide ideation, self-harm, abuse, addiction crisis, immediate danger
- CONCERN (YELLOW): Grief/loss, ongoing stress/anxiety, depression indicators, relationship struggles, bullying
- STABLE (GREEN): Normal spiritual journey, positive growth, no concerning indicators

Respond in JSON format:
{
  "status": "red" | "yellow" | "green",
  "reasoning": "Brief explanation of key factors"
}`;

    try {
      const completion = await this.aiService['openai'].chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a pastoral care assistant analyzing member wellbeing. Be sensitive, accurate, and err on the side of caution.',
          },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3, // Lower temperature for consistent analysis
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        status: result.status || 'green',
        reasoning: result.reasoning || 'No specific concerns detected',
      };
    } catch (error) {
      this.logger.error('Failed to detect wellbeing status', error);
      return { status: 'green', reasoning: 'Analysis failed, defaulting to stable' };
    }
  }

  /**
   * Generate pastoral summary of member's week
   */
  private async generateSevenDaySummary(
    messages: Array<{ role: string; content: string }>,
    sessionCount: number,
  ): Promise<string> {
    if (messages.length === 0) {
      return 'No conversations this week.';
    }

    const conversationText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const summaryPrompt = `Analyze this week's pastoral conversations and create a brief summary for the counselor:

${conversationText}

Create a 2-3 sentence summary including:
- Number of conversations (${sessionCount})
- Key themes discussed
- Emotional tone/trajectory (improving, declining, stable)
- Any notable spiritual growth or struggles

Write in professional pastoral language suitable for clinical documentation.`;

    try {
      const completion = await this.aiService['openai'].chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a pastoral care assistant creating concise weekly summaries for counselors.',
          },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.5,
        max_tokens: 150,
      });

      return completion.choices[0].message.content || 'Summary generation failed.';
    } catch (error) {
      this.logger.error('Failed to generate summary', error);
      return `Had ${sessionCount} conversation(s) this week. Summary generation failed.`;
    }
  }
}
