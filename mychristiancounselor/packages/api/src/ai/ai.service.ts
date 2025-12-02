import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { withRetry } from '../common/utils/retry.util';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts/system-prompt';
import { ScriptureReference } from '@mychristiancounselor/shared';

interface TicketForSimilarity {
  id: string;
  title: string;
  description: string;
  resolution?: string;
}

interface SimilarityResult {
  similarTicketId: string;
  score: number;
}

/**
 * Simple rate limiter for Claude API calls
 * Prevents hitting rate limits during batch processing
 */
class RateLimiter {
  private lastCallTime = 0;
  private readonly minInterval: number;

  constructor(callsPerMinute: number) {
    // Calculate minimum interval between calls in milliseconds
    this.minInterval = (60 * 1000) / callsPerMinute;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private readonly anthropic: Anthropic;
  private readonly rateLimiter: RateLimiter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    // Initialize OpenAI for counseling features
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });

    // Initialize Anthropic for support ticket features
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    this.anthropic = new Anthropic({
      apiKey: anthropicKey,
    });
    this.rateLimiter = new RateLimiter(10); // 10 calls per minute
  }

  // ============================================================================
  // COUNSELING AI METHODS (OpenAI)
  // ============================================================================

  async generateResponse(
    userMessage: string,
    scriptures: ScriptureReference[],
    conversationHistory: { role: string; content: string }[],
    currentQuestionCount: number,
    maxClarifyingQuestions: number,
  ): Promise<{
    requiresClarification: boolean;
    content: string;
  }> {
    const scripturesText = scriptures
      .map(
        (s) =>
          `${s.book} ${s.chapter}:${s.verseStart} (${s.translation}): "${s.text}"`
      )
      .join('\n');

    const historyText = conversationHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const userPrompt = USER_PROMPT_TEMPLATE(
      userMessage,
      scripturesText,
      historyText,
      currentQuestionCount,
      maxClarifyingQuestions
    );

    // Construct enhanced system prompt with question limits
    const questionLimitGuidance = `

IMPORTANT: You may ask clarifying questions to better understand the user's situation.
- Current clarifying questions asked: ${currentQuestionCount}
- Maximum clarifying questions allowed: ${maxClarifyingQuestions}
- Remaining questions you can ask: ${maxClarifyingQuestions - currentQuestionCount}

${currentQuestionCount >= maxClarifyingQuestions
  ? 'You have reached the maximum number of clarifying questions. Provide a final, comprehensive answer based on the information you have.'
  : 'You may ask clarifying questions if needed to provide better guidance, but be judicious.'}`;

    const enhancedSystemPrompt = SYSTEM_PROMPT + questionLimitGuidance;

    const completion = await withRetry(
      () => this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      }),
      { maxAttempts: 3, initialDelayMs: 1000 },
      this.logger
    );

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);

    // The JSON format uses 'guidance' or 'clarifyingQuestion', not 'content'
    const content = parsed.requiresClarification
      ? parsed.clarifyingQuestion
      : parsed.guidance;

    return {
      requiresClarification: parsed.requiresClarification === true,
      content: content,
    };
  }

  extractTheologicalThemes(message: string): string[] {
    const themeKeywords: Record<string, string[]> = {
      forgiveness: ['forgive', 'forgiveness', 'pardon', 'mercy'],
      prayer: ['pray', 'prayer', 'praying', 'intercession'],
      faith: ['faith', 'believe', 'trust', 'conviction'],
      salvation: ['salvation', 'saved', 'redemption', 'eternal life'],
      suffering: ['suffer', 'pain', 'trial', 'hardship', 'tribulation'],
      grace: ['grace', 'mercy', 'undeserved', 'gift'],
      sin: ['sin', 'temptation', 'transgression', 'iniquity'],
      love: ['love', 'charity', 'compassion', 'kindness'],
      hope: ['hope', 'expectation', 'confidence'],
      righteousness: ['righteous', 'holiness', 'sanctification'],
    };

    const lowerMessage = message.toLowerCase();
    const themes: string[] = [];

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes.length > 0 ? themes : ['general'];
  }

  /**
   * Extract scripture references from AI response text
   * Matches patterns like: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1"
   */
  extractScriptureReferences(text: string): Array<{
    book: string;
    chapter: number;
    verse: number;
    verseEnd?: number;
  }> {
    const references: Array<{
      book: string;
      chapter: number;
      verse: number;
      verseEnd?: number;
    }> = [];

    // Regular expression to match Bible verse patterns
    // Matches: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1-3", etc.
    const bibleVersePattern = /\b(\d\s)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(\d+):(\d+)(?:-(\d+))?/g;

    let match;
    while ((match = bibleVersePattern.exec(text)) !== null) {
      const bookPrefix = match[1] ? match[1].trim() : '';
      const bookName = match[2];
      const book = bookPrefix ? `${bookPrefix} ${bookName}` : bookName;
      const chapter = parseInt(match[3], 10);
      const verseStart = parseInt(match[4], 10);
      const verseEnd = match[5] ? parseInt(match[5], 10) : undefined;

      references.push({
        book: book.trim(),
        chapter,
        verse: verseStart,
        verseEnd,
      });
    }

    return references;
  }

  /**
   * AI-powered contextual crisis detection
   * Uses theological discernment to identify genuine crisis situations
   */
  async detectCrisisContextual(message: string): Promise<boolean> {
    try {
      const prompt = `As a Christian counselor with theological training, analyze this message for genuine crisis indicators requiring immediate professional intervention.

IMPORTANT CONTEXT: This is a Christian counseling platform where users ask spiritual questions and seek Biblical guidance. Questions directed TO God or ABOUT God are normal spiritual inquiries, not crisis situations.

Message: "${message}"

Criteria for TRUE crisis (requiring immediate intervention):
- Active suicidal ideation with specific intent or plan
- Immediate self-harm intent with imminent danger
- Active abuse or violence happening right now
- Life-threatening addiction requiring emergency intervention
- Severe mental health emergency with immediate danger

Do NOT flag as crisis:
- Questions directed to God ("God, are you listening?", "Where are you God?", "Why God?")
- Questions about God's existence, nature, or will
- Spiritual seeking or feeling distant from God
- Past struggles that are now resolved
- Hypothetical questions about theology of suffering
- Academic or theological discussions
- Historical references to past pain
- Metaphorical language ("dying inside", "killing me")
- Expressions of spiritual doubt or questioning faith
- Prayers for help or guidance

KEY DISTINCTION: Spiritual desperation (seeking God in hard times) is NOT a crisis. Only flag messages indicating IMMINENT physical danger or severe psychological emergency requiring professional intervention.

Respond with ONLY "true" or "false" and nothing else.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent detection
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content?.trim().toLowerCase();
      return response === 'true';
    } catch (error) {
      this.logger.error('AI crisis detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }

  /**
   * AI-powered contextual grief detection
   * Uses theological discernment to identify genuine grief situations
   */
  async detectGriefContextual(message: string): Promise<boolean> {
    try {
      const prompt = `As a Christian counselor, determine if this message indicates ACTIVE GRIEF from a RECENT ACTUAL LOSS that requires specialized grief resources.

CRITICAL CONTEXT: This is a Christian counseling platform. Spiritual questions, feeling distant from God, or seeking God during hard times are NORMAL and NOT grief situations.

Message: "${message}"

ONLY flag as TRUE grief if the message EXPLICITLY mentions:
- Death of a loved one (recent, within the past year) AND emotional distress about it
- Terminal diagnosis AND active emotional processing of impending death
- Current acute bereavement with explicit mention of who died

NEVER flag as grief:
- Questions to God or about God ("God, are you listening?", "Where are you God?", "Why God?")
- Feeling spiritually distant or abandoned
- Seeking God's help or guidance
- Questioning faith or God's presence
- General suffering or hard times without explicit death/loss
- Anxiety, worry, or stress (unless explicitly about recent death)
- Theological questions about death, suffering, or the afterlife
- Past loss that's been processed
- Metaphorical language about death or dying

EXAMPLE - NOT GRIEF:
- "God, are you listening?" = spiritual seeking, NOT grief
- "I feel so alone" = loneliness, NOT grief (unless they mention who died)
- "Why is God silent?" = spiritual doubt, NOT grief
- "I'm going through a hard time" = general struggle, NOT grief

EXAMPLE - IS GRIEF:
- "My mother died last month and I can't cope" = grief
- "Just lost my husband, how do I go on?" = grief

Be VERY conservative. When in doubt, respond "false". Only respond "true" if there is EXPLICIT mention of a RECENT death causing CURRENT distress.

Respond with ONLY "true" or "false" and nothing else.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent detection
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content?.trim().toLowerCase();
      return response === 'true';
    } catch (error) {
      this.logger.error('AI grief detection error:', error);
      return false;
    }
  }

  // ============================================================================
  // SUPPORT TICKET AI METHODS (Anthropic Claude)
  // ============================================================================

  /**
   * Detect priority level for a support ticket using Claude AI
   * @param title Ticket title
   * @param description Ticket description
   * @returns Priority level (urgent/high/medium/low/feature)
   */
  async detectPriority(title: string, description: string): Promise<string> {
    try {
      const prompt = `Analyze this support ticket and classify its priority level.

Ticket Title: ${title}
Ticket Description: ${description}

Priority Levels:
- urgent: System is completely down or unusable
- high: Major functionality is broken affecting multiple users
- medium: Minor issues, glitches, or questions
- low: Cosmetic issues or non-urgent questions
- feature: Feature request or enhancement

Return ONLY the priority level (urgent/high/medium/low/feature) with no explanation.`;

      this.logger.debug('Detecting priority for ticket', { title });

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract text from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const priority = content.text.trim().toLowerCase();

      // Validate priority
      const validPriorities = ['urgent', 'high', 'medium', 'low', 'feature'];
      if (!validPriorities.includes(priority)) {
        this.logger.warn('Invalid priority returned from AI', {
          priority,
          title,
        });
        return 'medium'; // fallback
      }

      this.logger.log('Priority detected', { priority, title });
      return priority;
    } catch (error) {
      this.logger.error('Failed to detect priority', {
        error: error.message,
        title,
      });
      // Fallback to medium on error
      return 'medium';
    }
  }

  /**
   * Compare source ticket against multiple candidates using Claude AI
   * @param sourceTicket The ticket to find matches for
   * @param candidates List of tickets to compare against (max 20)
   * @returns Similarity scores for each candidate
   */
  async batchSimilarityCheck(
    sourceTicket: TicketForSimilarity,
    candidates: TicketForSimilarity[]
  ): Promise<SimilarityResult[]> {
    try {
      if (candidates.length === 0) {
        return [];
      }

      // Limit to 20 candidates per batch to avoid token limits
      const limitedCandidates = candidates.slice(0, 20);

      const prompt = `Compare this ticket to the following tickets and return similarity scores (0-100).

SOURCE TICKET:
Title: ${sourceTicket.title}
Description: ${sourceTicket.description}

CANDIDATE TICKETS:
${limitedCandidates
  .map(
    (t, i) => `
[${i}] ID: ${t.id}
Title: ${t.title}
Description: ${t.description}
${t.resolution ? `Resolution: ${t.resolution}` : ''}`
  )
  .join('\n')}

Return JSON array: [{"index": 0, "score": 85}, {"index": 1, "score": 42}, ...]
Only include scores above 40. Return empty array [] if no matches.`;

      this.logger.debug('Batch similarity check', {
        sourceId: sourceTicket.id,
        candidateCount: limitedCandidates.length,
      });

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract text from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      // Parse JSON response
      const results = JSON.parse(content.text);

      // Validate and map results
      if (!Array.isArray(results)) {
        throw new Error('Invalid response format from Claude API');
      }

      const mappedResults = results.map((r) => ({
        similarTicketId: limitedCandidates[r.index].id,
        score: r.score,
      }));

      this.logger.log('Batch similarity check complete', {
        sourceId: sourceTicket.id,
        matchesFound: mappedResults.length,
      });

      return mappedResults;
    } catch (error) {
      this.logger.error('Batch similarity check failed', {
        error: error.message,
        sourceId: sourceTicket.id,
      });
      return [];
    }
  }

  /**
   * Cache similarity results in database
   * @param sourceTicketId Source ticket ID
   * @param results Similarity results to cache
   * @param matchType 'active' or 'historical'
   * @param ttlHours Time-to-live in hours
   */
  private async cacheSimilarityResults(
    prisma: any,
    sourceTicketId: string,
    results: SimilarityResult[],
    matchType: 'active' | 'historical',
    ttlHours: number
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      // Delete existing cached results for this ticket and match type
      await prisma.ticketSimilarity.deleteMany({
        where: {
          sourceTicketId,
          matchType,
        },
      });

      // Insert new results
      if (results.length > 0) {
        await prisma.ticketSimilarity.createMany({
          data: results.map((r) => ({
            sourceTicketId,
            similarTicketId: r.similarTicketId,
            similarityScore: r.score,
            matchType,
            expiresAt,
          })),
        });

        this.logger.log('Cached similarity results', {
          sourceTicketId,
          matchType,
          count: results.length,
          expiresAt,
        });
      }
    } catch (error) {
      this.logger.error('Failed to cache similarity results', {
        error: error.message,
        sourceTicketId,
        matchType,
      });
    }
  }

  /**
   * Find similar active (unresolved) tickets in real-time
   * @param ticketId Source ticket ID
   * @returns Cached or freshly computed similarity results
   */
  async findSimilarActiveTickets(ticketId: string): Promise<SimilarityResult[]> {
    try {
      // 1. Check cache first (1 hour TTL)
      const cached = await this.prisma.ticketSimilarity.findMany({
        where: {
          sourceTicketId: ticketId,
          matchType: 'active',
          expiresAt: { gt: new Date() },
        },
        select: {
          similarTicketId: true,
          similarityScore: true,
        },
      });

      if (cached.length > 0) {
        this.logger.debug('Cache hit for active similarity', { ticketId });
        return cached.map((c) => ({
          similarTicketId: c.similarTicketId,
          score: c.similarityScore,
        }));
      }

      // 2. Fetch source ticket
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, title: true, description: true },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // 3. Get all unresolved tickets (exclude self)
      const candidates = await this.prisma.supportTicket.findMany({
        where: {
          id: { not: ticketId },
          status: { in: ['open', 'in_progress', 'waiting_on_user'] },
        },
        select: { id: true, title: true, description: true },
        take: 100, // Limit to prevent excessive API calls
      });

      if (candidates.length === 0) {
        return [];
      }

      // 4. Batch similarity check via Claude
      const results = await this.batchSimilarityCheck(ticket, candidates);

      // 5. Filter by threshold (60+) and cache
      const filtered = results.filter((r) => r.score >= 60);

      await this.cacheSimilarityResults(this.prisma, ticketId, filtered, 'active', 1);

      this.logger.log('Found active similar tickets', {
        ticketId,
        count: filtered.length,
      });

      return filtered;
    } catch (error) {
      this.logger.error('Failed to find similar active tickets', {
        error: error.message,
        ticketId,
      });
      return [];
    }
  }

  /**
   * Weekly batch job to find historical solutions for unresolved tickets
   * Processes all unresolved tickets against all resolved tickets with rate limiting
   */
  async processWeeklySimilarityBatch(): Promise<void> {
    this.logger.log('Starting weekly historical similarity batch job');

    try {
      // 1. Get all unresolved tickets
      const unresolvedTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: { in: ['open', 'in_progress', 'waiting_on_user'] },
        },
        select: { id: true, title: true, description: true },
      });

      // 2. Get all resolved tickets with resolutions
      const resolvedTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: { in: ['resolved', 'closed'] },
          resolution: { not: null },
        },
        select: {
          id: true,
          title: true,
          description: true,
          resolution: true,
        },
      });

      this.logger.log(
        `Processing ${unresolvedTickets.length} unresolved tickets ` +
          `against ${resolvedTickets.length} resolved tickets`
      );

      if (unresolvedTickets.length === 0 || resolvedTickets.length === 0) {
        this.logger.log('No tickets to process, batch job complete');
        return;
      }

      // 3. Process each unresolved ticket
      let successCount = 0;
      let errorCount = 0;

      for (const ticket of unresolvedTickets) {
        try {
          // Rate limit to avoid API throttling (10 calls/minute)
          await this.rateLimiter.wait();

          // Process in batches of 20 resolved tickets at a time
          const allResults: SimilarityResult[] = [];

          for (let i = 0; i < resolvedTickets.length; i += 20) {
            const batch = resolvedTickets.slice(i, i + 20);
            const batchResults = await this.batchSimilarityCheck(ticket, batch);
            allResults.push(...batchResults);
          }

          // Filter by higher threshold (80+) for historical matches
          const filtered = allResults.filter((r) => r.score >= 80);

          // Cache for 7 days
          await this.cacheSimilarityResults(
            this.prisma,
            ticket.id,
            filtered,
            'historical',
            24 * 7 // 7 days in hours
          );

          this.logger.debug(
            `Found ${filtered.length} historical matches for ticket ${ticket.id}`
          );

          successCount++;
        } catch (error) {
          this.logger.error(`Failed to process ticket ${ticket.id}`, {
            error: error.message,
          });
          errorCount++;
          // Continue with next ticket
        }
      }

      this.logger.log('Weekly historical similarity batch job completed', {
        totalTickets: unresolvedTickets.length,
        successCount,
        errorCount,
      });
    } catch (error) {
      this.logger.error('Weekly batch job failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cached historical similarity matches
   * @param ticketId Source ticket ID
   * @returns Cached similarity results (empty if not found or expired)
   */
  async getCachedHistoricalMatches(
    ticketId: string
  ): Promise<SimilarityResult[]> {
    try {
      const cached = await this.prisma.ticketSimilarity.findMany({
        where: {
          sourceTicketId: ticketId,
          matchType: 'historical',
          expiresAt: { gt: new Date() },
        },
        select: {
          similarTicketId: true,
          similarityScore: true,
        },
        orderBy: {
          similarityScore: 'desc',
        },
      });

      return cached.map((c) => ({
        similarTicketId: c.similarTicketId,
        score: c.similarityScore,
      }));
    } catch (error) {
      this.logger.error('Failed to get cached historical matches', {
        error: error.message,
        ticketId,
      });
      return [];
    }
  }
}
