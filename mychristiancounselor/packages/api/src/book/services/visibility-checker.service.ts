import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IVisibilityChecker } from '@mychristiancounselor/shared';
import { resourcesConfig } from '../../config/resources.config';

type UserWithOrgAccess = {
  id: string;
  accountType?: string;
  birthDate?: Date;
  organizationMembers?: Array<{
    organizationId: string;
    organization?: {
      matureContentAccountTypeThreshold?: string;
    };
  }>;
};

@Injectable()
export class VisibilityCheckerService implements IVisibilityChecker {
  private readonly logger = new Logger(VisibilityCheckerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async canAccess(
    userId: string,
    resourceId: string,
    resourceType: 'book' | 'org',
  ): Promise<boolean> {
    if (resourceType === 'book') {
      return this.canAccessBook(userId, resourceId);
    }

    // Future: org visibility
    return true;
  }

  private async canAccessBook(userId: string, bookId: string): Promise<boolean> {
    // Fetch book and user in parallel for better performance
    const [book, user] = await Promise.all([
      this.prisma.book.findUnique({
        where: { id: bookId },
        include: {
          endorsements: {
            select: { organizationId: true },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizationMembers: {
            select: { organizationId: true, organization: true },
          },
        },
      }),
    ]);

    if (!book) {
      return false;
    }

    // Rule 1: not_aligned = hidden (data-driven threshold)
    if (book.visibilityTier === 'not_aligned') {
      return false;
    }

    // Rule 2: Age-gating for mature content (data-driven)
    if (book.matureContent) {
      if (!user) {
        this.logger.log(`Anonymous user cannot view mature content for book ${bookId}`);
        return false;
      }
      const canViewMature = this.canViewMatureContent(user);
      if (!canViewMature) {
        this.logger.log(`User ${userId} cannot view mature content`);
        return false;
      }
    }

    // Rule 3: globally_aligned = everyone
    if (book.visibilityTier === 'globally_aligned') {
      return true;
    }

    // Rule 4: conceptually_aligned = org members only
    if (book.visibilityTier === 'conceptually_aligned') {
      if (!user) {
        this.logger.log(`Anonymous user cannot access conceptually_aligned book ${bookId}`);
        return false;
      }

      const userOrgIds = user.organizationMembers?.map(m => m.organizationId) || [];
      const bookOrgIds = book.endorsements.map(e => e.organizationId);

      const hasAccess = userOrgIds.some(id => bookOrgIds.includes(id));

      if (!hasAccess) {
        this.logger.log(`User ${userId} not in endorsing orgs for book ${bookId}`);
      }

      return hasAccess;
    }

    return false;
  }

  private canViewMatureContent(user: UserWithOrgAccess): boolean {
    // Data-driven age-gating
    const accountType = user.accountType || this.inferAccountType(user.birthDate);

    // Check user's org settings, fallback to platform default
    const threshold = user.organizationMembers?.[0]?.organization?.matureContentAccountTypeThreshold
      || resourcesConfig.ageGating.defaultMatureContentThreshold;

    const typeOrder = ['child', 'teen', 'adult'];
    const userTypeIndex = typeOrder.indexOf(accountType);
    const thresholdIndex = typeOrder.indexOf(threshold);

    return userTypeIndex >= thresholdIndex;
  }

  private inferAccountType(birthDate?: Date): string {
    if (!birthDate) return 'child'; // Conservative default

    const age = this.calculateAge(birthDate);
    const ageRanges = resourcesConfig.ageGating.accountTypeAges;

    if (age <= ageRanges.child.max) return 'child';
    if (age <= ageRanges.teen.max) return 'teen';
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
}
