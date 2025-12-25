import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityCheckerService } from './visibility-checker.service';
import {
  BookQueryDto,
  BookListItemDto,
  BookListResponseDto,
} from '../dto';
import { resourcesConfig } from '../../config/resources.config';

@Injectable()
export class BookQueryService {
  private readonly logger = new Logger(BookQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly visibilityChecker: VisibilityCheckerService,
  ) {}

  async findBooks(
    query: BookQueryDto,
    userId?: string,
  ): Promise<BookListResponseDto> {
    const {
      search,
      visibilityTier,
      genre,
      showMatureContent,
      skip = 0,
      take = 20,
    } = query;

    this.logger.log(
      `Finding books with query: ${JSON.stringify(query)}, userId: ${userId || 'anonymous'}`,
    );

    // Check if user is platform admin (for WHERE clause optimization)
    let isPlatformAdmin = false;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isPlatformAdmin: true },
      });
      isPlatformAdmin = user?.isPlatformAdmin ?? false;
    }

    // Build where clause for filtering
    const where = await this.buildWhereClause(
      search,
      visibilityTier,
      genre,
      showMatureContent,
      userId,
      isPlatformAdmin,
    );

    // Execute queries in parallel
    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take,
        include: {
          endorsements: {
            select: { organizationId: true },
          },
          _count: {
            select: { endorsements: true },
          },
        },
        orderBy: [
          { biblicalAlignmentScore: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.book.count({ where }),
    ]);

    // Filter books based on visibility (for authenticated users)
    // For anonymous users, only globally_aligned books without mature content are visible
    const visibleBooks = await this.filterByVisibility(books, userId);

    // Map to DTOs
    const bookDtos: BookListItemDto[] = visibleBooks.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher ?? undefined,
      publicationYear: book.publicationYear ?? undefined,
      description: book.description ?? undefined,
      coverImageUrl: book.coverImageUrl ?? undefined,
      biblicalAlignmentScore: book.biblicalAlignmentScore ?? undefined,
      visibilityTier: book.visibilityTier ?? undefined,
      genreTag: book.genreTag ?? undefined,
      matureContent: book.matureContent,
      endorsementCount: book._count.endorsements,
    }));

    return {
      books: bookDtos,
      total: visibleBooks.length, // Return count of visible books for accurate pagination
      skip,
      take,
    };
  }

  private async buildWhereClause(
    search?: string,
    visibilityTier?: string,
    genre?: string,
    showMatureContent?: boolean,
    userId?: string,
    isPlatformAdmin?: boolean,
  ): Promise<any> {
    const where: any = {
      AND: [
        // Only show evaluated books
        { evaluationStatus: 'completed' },
      ],
    };

    // Exclude not_aligned books for non-platform-admins
    // Platform admins can see all books including not_aligned for oversight
    if (!isPlatformAdmin) {
      where.AND.push({ visibilityTier: { not: 'not_aligned' } });
    }

    // Search filter (title or author)
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Visibility tier filter
    if (visibilityTier) {
      where.AND.push({ visibilityTier });
    }

    // Genre filter
    if (genre) {
      where.AND.push({ genreTag: genre });
    }

    // Mature content filtering
    const shouldShowMature = await this.shouldShowMatureContent(
      showMatureContent,
      userId,
    );
    if (!shouldShowMature) {
      where.AND.push({ matureContent: false });
    }

    return where;
  }

  private async shouldShowMatureContent(
    showMatureContent?: boolean,
    userId?: string,
  ): Promise<boolean> {
    // If explicitly set to false, don't show
    if (showMatureContent === false) {
      return false;
    }

    // Anonymous users never see mature content
    if (!userId) {
      return false;
    }

    // For authenticated users, check their account type and org settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountType: true,
        birthDate: true,
        organizationMembers: {
          select: {
            organization: {
              select: { matureContentAccountTypeThreshold: true },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Use the visibility checker's logic for mature content
    // Default to showing if user is adult, unless explicitly disabled
    const accountType = user.accountType || this.inferAccountType(user.birthDate);
    const threshold =
      user.organizationMembers?.[0]?.organization?.matureContentAccountTypeThreshold || 'teen';

    const typeOrder = ['child', 'teen', 'adult'];
    const userTypeIndex = typeOrder.indexOf(accountType);
    const thresholdIndex = typeOrder.indexOf(threshold);

    // If showMatureContent is explicitly true and user meets threshold, show it
    // If showMatureContent is undefined, use default based on user type
    if (showMatureContent === true) {
      return userTypeIndex >= thresholdIndex;
    }

    // Default: show mature content if user is adult
    return accountType === 'adult' && userTypeIndex >= thresholdIndex;
  }

  private inferAccountType(birthDate?: Date | null): string {
    if (!birthDate) return 'child'; // Conservative default

    const age = this.calculateAge(birthDate);

    if (age <= 12) return 'child';
    if (age <= 17) return 'teen';
    return 'adult';
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private async filterByVisibility(
    books: any[],
    userId?: string,
  ): Promise<any[]> {
    if (!userId) {
      // Anonymous users only see globally_aligned books without mature content
      return books.filter(
        (book) =>
          book.visibilityTier === 'globally_aligned' && !book.matureContent,
      );
    }

    // Fetch user once with organization memberships for batch filtering
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: {
          select: {
            organizationId: true,
            organization: {
              select: { matureContentAccountTypeThreshold: true }
            }
          },
        },
      },
    });

    if (!user) {
      // If user not found, treat as anonymous
      return books.filter(
        (book) =>
          book.visibilityTier === 'globally_aligned' && !book.matureContent,
      );
    }

    // Platform admins can see ALL books (including not_aligned) for evaluation oversight
    if (user.isPlatformAdmin) {
      return books;
    }

    const userOrgIds = user.organizationMembers?.map(m => m.organizationId) || [];
    const canViewMature = this.canViewMatureContentBatch(user);

    // Filter books in-memory using pre-fetched user data
    return books.filter((book) => {
      // Rule 1: not_aligned = hidden (already filtered in WHERE clause, but double-check)
      if (book.visibilityTier === 'not_aligned') {
        return false;
      }

      // Rule 2: Age-gating for mature content
      if (book.matureContent && !canViewMature) {
        return false;
      }

      // Rule 3: globally_aligned = everyone (who can view mature if needed)
      if (book.visibilityTier === 'globally_aligned') {
        return true;
      }

      // Rule 4: conceptually_aligned = org members only
      if (book.visibilityTier === 'conceptually_aligned') {
        const bookOrgIds = book.endorsements?.map((e: any) => e.organizationId) || [];
        return userOrgIds.some(id => bookOrgIds.includes(id));
      }

      return false;
    });
  }

  private canViewMatureContentBatch(user: any): boolean {
    // Data-driven age-gating (inline version for batch processing)
    const accountType = user.accountType || this.inferAccountType(user.birthDate);

    // Check user's org settings, fallback to platform default
    const threshold = user.organizationMembers?.[0]?.organization?.matureContentAccountTypeThreshold
      || resourcesConfig.ageGating.defaultMatureContentThreshold;

    const typeOrder = ['child', 'teen', 'adult'];
    const userTypeIndex = typeOrder.indexOf(accountType);
    const thresholdIndex = typeOrder.indexOf(threshold);

    return userTypeIndex >= thresholdIndex;
  }
}
