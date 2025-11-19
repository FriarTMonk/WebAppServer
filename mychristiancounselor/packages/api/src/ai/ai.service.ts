import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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
}
