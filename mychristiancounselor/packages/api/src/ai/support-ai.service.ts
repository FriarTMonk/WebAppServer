import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BedrockService } from './bedrock.service';

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

/**
 * SupportAiService - AI operations for support ticket features
 *
 * Responsibilities:
 * - Detect support ticket priority levels (Anthropic Claude)
 * - Compare tickets for similarity using AI
 * - Find similar active (unresolved) tickets
 * - Process weekly similarity batches for historical solutions
 * - Cache and retrieve similarity results
 *
 * Extracted from AiService to follow Single Responsibility Principle
 * Uses Anthropic Claude models for support ticket AI operations
 */
@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);
  private readonly rateLimiter: RateLimiter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bedrock: BedrockService
  ) {
    this.rateLimiter = new RateLimiter(10); // 10 calls per minute
    this.logger.log('✅ SupportAiService initialized with AWS Bedrock (HIPAA-compliant)');
  }

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

      const response = await this.bedrock.chatCompletion('haiku', [
        { role: 'user', content: prompt }
      ], {
        max_tokens: 10,
      });

      const priority = response.trim().toLowerCase();

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

      const results = await this.bedrock.jsonCompletion('sonnet', [
        { role: 'user', content: prompt }
      ], {
        max_tokens: 500,
      });

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
    sourceTicketId: string,
    results: SimilarityResult[],
    matchType: 'active' | 'historical',
    ttlHours: number
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      // Delete existing cached results for this ticket and match type
      await this.prisma.ticketSimilarity.deleteMany({
        where: {
          sourceTicketId,
          matchType,
        },
      });

      // Insert new results
      if (results.length > 0) {
        await this.prisma.ticketSimilarity.createMany({
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

      await this.cacheSimilarityResults(ticketId, filtered, 'active', 1);

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
