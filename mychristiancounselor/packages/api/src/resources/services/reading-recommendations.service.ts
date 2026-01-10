import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';

interface BookCandidate {
  id: string;
  title: string;
  author: string;
  description: string;
  biblicalAlignmentScore: number;
  genreTag: string;
  denominationalTags: string[];
  coverImageUrl: string | null;
  visibilityTier: string;
}

interface UserProfile {
  readingHistory: Array<{
    bookId: string;
    title: string;
    author: string;
    genreTag: string;
    rating?: number;
    status: string;
  }>;
  preferredGenres: string[];
  averageAlignmentScore: number;
}

interface RankedRecommendation {
  bookId: string;
  score: number;
  reasoning?: string;
}

/**
 * AI-Powered Reading Recommendations Service
 *
 * Provides personalized book recommendations by:
 * 1. Analyzing user's reading history and preferences
 * 2. Finding candidate books user hasn't read
 * 3. Using AI to intelligently rank candidates
 * 4. Falling back to score-based ranking if AI fails
 */
@Injectable()
export class ReadingRecommendationsService {
  private readonly logger = new Logger(ReadingRecommendationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /**
   * Get personalized book recommendations for a user
   */
  async getRecommendations(userId: string, limit: number = 10) {
    this.logger.log(`Getting recommendations for user ${userId}`);

    try {
      // 1. Get user profile (reading history, preferences)
      const userProfile = await this.getUserProfile(userId);

      // 2. Get candidate books (user hasn't read)
      const candidates = await this.getCandidateBooks(userId);

      if (candidates.length === 0) {
        return {
          recommendations: [],
          total: 0,
          message: 'No recommendations available. Try adding books to your reading list!',
        };
      }

      // 3. Rank candidates using AI
      const rankedCandidates = await this.rankCandidatesWithAI(
        userProfile,
        candidates,
        limit,
      );

      // 4. Return top recommendations
      const recommendations = rankedCandidates.slice(0, limit).map((ranked) => {
        const book = candidates.find((c) => c.id === ranked.bookId);
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.genreTag,
          description: book.description || '',
          coverImageUrl: book.coverImageUrl,
          visibilityTier: book.visibilityTier,
          alignmentScore: book.biblicalAlignmentScore || 0,
          biblicalAlignmentScore: book.biblicalAlignmentScore,
          genreTag: book.genreTag,
          recommendationScore: ranked.score,
          reasoning: ranked.reasoning,
        };
      });

      this.logger.log(
        `Returning ${recommendations.length} recommendations for user ${userId}`,
      );

      return {
        recommendations,
        total: recommendations.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get recommendations for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build user profile from reading history
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const readingList = await this.prisma.userReadingList.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            genreTag: true,
            biblicalAlignmentScore: true,
          },
        },
      },
    });

    const readingHistory = readingList.map((item) => ({
      bookId: item.book.id,
      title: item.book.title,
      author: item.book.author,
      genreTag: item.book.genreTag,
      rating: item.personalRating,
      status: item.status,
    }));

    // Extract preferred genres (genres from books with high ratings)
    const genreCounts: Record<string, number> = {};
    readingHistory.forEach((item) => {
      if (item.rating && item.rating >= 4) {
        genreCounts[item.genreTag] = (genreCounts[item.genreTag] || 0) + 1;
      }
    });

    const preferredGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([genre]) => genre)
      .slice(0, 3);

    // Calculate average alignment score from finished books
    const finishedBooks = readingList.filter(
      (item) => item.status === 'finished',
    );
    const avgScore =
      finishedBooks.length > 0
        ? finishedBooks.reduce(
            (sum, item) => sum + (item.book.biblicalAlignmentScore || 0),
            0,
          ) / finishedBooks.length
        : 80; // Default to 80 if no reading history

    return {
      readingHistory,
      preferredGenres,
      averageAlignmentScore: avgScore,
    };
  }

  /**
   * Get candidate books user hasn't read yet
   * Filters by alignment score and excludes books already in reading list
   */
  private async getCandidateBooks(userId: string): Promise<BookCandidate[]> {
    // Get IDs of books already in user's reading list
    const readingListBookIds = await this.prisma.userReadingList
      .findMany({
        where: { userId },
        select: { bookId: true },
      })
      .then((items) => items.map((item) => item.bookId));

    // Find books not in reading list with good alignment scores
    const candidates = await this.prisma.book.findMany({
      where: {
        id: { notIn: readingListBookIds },
        biblicalAlignmentScore: { gte: 70 },
        evaluationStatus: 'completed',
        visibilityTier: { notIn: ['not_aligned'] },
      },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        biblicalAlignmentScore: true,
        genreTag: true,
        denominationalTags: true,
        coverImageUrl: true,
        visibilityTier: true,
      },
      take: 50, // Limit candidates to avoid excessive AI costs
      orderBy: {
        biblicalAlignmentScore: 'desc',
      },
    });

    return candidates;
  }

  /**
   * Use AI to rank candidate books based on user profile
   * Falls back to score-based ranking if AI fails
   */
  private async rankCandidatesWithAI(
    userProfile: UserProfile,
    candidates: BookCandidate[],
    limit: number,
  ): Promise<RankedRecommendation[]> {
    try {
      // Prepare prompt for AI
      const readingHistorySummary = userProfile.readingHistory
        .slice(0, 5)
        .map(
          (book) =>
            `- ${book.title} by ${book.author} (${book.genreTag}, rating: ${book.rating || 'N/A'})`,
        )
        .join('\n');

      const candidatesSummary = candidates
        .map(
          (book, idx) =>
            `[${idx}] ${book.title} by ${book.author} (Genre: ${book.genreTag}, Score: ${book.biblicalAlignmentScore})`,
        )
        .join('\n');

      const prompt = `You are a Christian reading recommendation AI. Analyze this user's reading history and recommend books they would enjoy.

USER'S READING HISTORY:
${readingHistorySummary}

Preferred Genres: ${userProfile.preferredGenres.join(', ') || 'None yet'}
Average Alignment Score: ${userProfile.averageAlignmentScore}

CANDIDATE BOOKS:
${candidatesSummary}

Return a JSON array of recommendations, ranked by relevance (best first). Include:
- index: The book's index from the candidate list
- score: Relevance score 0-100
- reasoning: One sentence why this book matches the user

Format: [{"index": 0, "score": 95, "reasoning": "..."}, ...]

Recommend the top ${limit} books. Consider:
1. Genre preferences from reading history
2. Biblical alignment score preferences
3. Author diversity
4. Thematic variety`;

      this.logger.debug('Ranking candidates with AI');

      const response = await this.aiService['bedrock'].jsonCompletion(
        'haiku',
        [{ role: 'user', content: prompt }],
        {
          max_tokens: 1000,
          temperature: 0.3,
        },
      );

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid AI response format');
      }

      const ranked: RankedRecommendation[] = response.data.map((item) => ({
        bookId: candidates[item.index].id,
        score: item.score,
        reasoning: item.reasoning,
      }));

      this.logger.log(`AI ranked ${ranked.length} candidates`);

      return ranked;
    } catch (error) {
      this.logger.warn('AI ranking failed, falling back to score-based ranking', error.message);

      // Fallback: Score-based ranking
      return this.fallbackScoreBasedRanking(userProfile, candidates);
    }
  }

  /**
   * Fallback ranking algorithm using genre preferences and alignment scores
   */
  private fallbackScoreBasedRanking(
    userProfile: UserProfile,
    candidates: BookCandidate[],
  ): RankedRecommendation[] {
    return candidates
      .map((book) => {
        let score = book.biblicalAlignmentScore || 0;

        // Boost score if genre matches user preferences
        if (userProfile.preferredGenres.includes(book.genreTag)) {
          score += 15;
        }

        // Normalize to 0-100 range
        score = Math.min(100, score);

        return {
          bookId: book.id,
          score,
          reasoning: 'Recommended based on biblical alignment and genre preferences',
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
