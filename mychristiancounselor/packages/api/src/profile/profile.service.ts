import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getHistory(
    userId: string,
    searchQuery?: string,
    topics?: string[],
    dateFrom?: Date,
    dateTo?: Date,
    status: 'active' | 'archived' = 'active',
  ) {
    // Verify subscription for history access
    const subStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    if (!subStatus.hasHistoryAccess) {
      throw new ForbiddenException('History access requires an active subscription');
    }

    // Build where clause with proper typing
    const where: Prisma.SessionWhereInput = {
      userId,
      status,
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Fetch sessions
    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 2, // Only first 2 messages for excerpt
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Client-side filtering for search and topics (PostgreSQL full-text would be better)
    let filtered = sessions;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          s.messages.some((m) => m.content.toLowerCase().includes(lowerQuery))
      );
    }

    if (topics && topics.length > 0) {
      // Topics would need to be extracted/stored - placeholder for now
      // filtered = filtered.filter(s => topics.some(t => s.topics?.includes(t)));
    }

    // Format for response with safe excerpt generation
    return filtered.map((session) => ({
      id: session.id,
      title: session.title,
      excerpt: session.messages[0]?.content
        ? session.messages[0].content.substring(0, 150) +
          (session.messages[0].content.length > 150 ? '...' : '')
        : 'No messages',
      topics: [], // Would extract from messages/session metadata
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }
}
