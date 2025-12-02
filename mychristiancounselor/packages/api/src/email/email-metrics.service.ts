import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Email metrics for an organization
 */
export interface OrganizationEmailMetrics {
  organizationId: string;
  organizationName: string;
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalOpened: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  emailsByType: {
    emailType: string;
    count: number;
  }[];
  recentEmails: {
    id: string;
    recipientEmail: string;
    emailType: string;
    status: string;
    sentAt: Date;
    deliveredAt: Date | null;
    openedAt: Date | null;
  }[];
}

/**
 * Platform-wide email metrics (all organizations combined)
 */
export interface PlatformEmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalOpened: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  emailsByType: {
    emailType: string;
    count: number;
  }[];
  organizationCount: number;
  topOrganizations: {
    organizationId: string;
    organizationName: string;
    emailsSent: number;
  }[];
}

/**
 * Service for retrieving email metrics and logs
 * Supports both organization-scoped and platform-wide views
 */
@Injectable()
export class EmailMetricsService {
  private readonly logger = new Logger(EmailMetricsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get email metrics for a specific organization (for Org Admins)
   * Only includes emails sent to users who are members of the organization
   */
  async getOrganizationMetrics(
    organizationId: string,
    daysAgo = 30
  ): Promise<OrganizationEmailMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Get all user IDs who are members of this organization
    const memberIds = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    const userIds = memberIds.map((m) => m.userId);

    // Get email logs for these users
    const emailLogs = await this.prisma.emailLog.findMany({
      where: {
        userId: {
          in: userIds,
        },
        sentAt: {
          gte: since,
        },
      },
      select: {
        id: true,
        recipientEmail: true,
        emailType: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        bouncedAt: true,
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    // Calculate metrics
    const totalSent = emailLogs.length;
    const totalDelivered = emailLogs.filter((log) => log.deliveredAt).length;
    const totalBounced = emailLogs.filter((log) => log.bouncedAt).length;
    const totalOpened = emailLogs.filter((log) => log.openedAt).length;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;

    // Group by email type
    const emailsByTypeMap = new Map<string, number>();
    emailLogs.forEach((log) => {
      const count = emailsByTypeMap.get(log.emailType) || 0;
      emailsByTypeMap.set(log.emailType, count + 1);
    });

    const emailsByType = Array.from(emailsByTypeMap.entries())
      .map(([emailType, count]) => ({ emailType, count }))
      .sort((a, b) => b.count - a.count);

    // Recent emails (top 50)
    const recentEmails = emailLogs.slice(0, 50).map((log) => ({
      id: log.id,
      recipientEmail: log.recipientEmail,
      emailType: log.emailType,
      status: log.status,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      openedAt: log.openedAt,
    }));

    return {
      organizationId,
      organizationName: organization.name,
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      emailsByType,
      recentEmails,
    };
  }

  /**
   * Get email metrics for all organizations (for Platform Admins)
   * Returns an array with metrics for each organization
   */
  async getAllOrganizationMetrics(daysAgo = 30): Promise<OrganizationEmailMetrics[]> {
    // Get all organizations
    const organizations = await this.prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Get metrics for each organization
    const metrics = await Promise.all(
      organizations.map((org) =>
        this.getOrganizationMetrics(org.id, daysAgo).catch((error) => {
          this.logger.error(`Error getting metrics for org ${org.id}:`, error);
          return null;
        })
      )
    );

    // Filter out any nulls from errors
    return metrics.filter((m): m is OrganizationEmailMetrics => m !== null);
  }

  /**
   * Get platform-wide email metrics (for Platform Admins)
   * Aggregates across all organizations
   */
  async getPlatformMetrics(daysAgo = 30): Promise<PlatformEmailMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    // Get all email logs in time period
    const emailLogs = await this.prisma.emailLog.findMany({
      where: {
        sentAt: {
          gte: since,
        },
      },
      select: {
        id: true,
        emailType: true,
        status: true,
        deliveredAt: true,
        bouncedAt: true,
        openedAt: true,
        userId: true,
      },
    });

    // Calculate totals
    const totalSent = emailLogs.length;
    const totalDelivered = emailLogs.filter((log) => log.deliveredAt).length;
    const totalBounced = emailLogs.filter((log) => log.bouncedAt).length;
    const totalOpened = emailLogs.filter((log) => log.openedAt).length;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;

    // Group by email type
    const emailsByTypeMap = new Map<string, number>();
    emailLogs.forEach((log) => {
      const count = emailsByTypeMap.get(log.emailType) || 0;
      emailsByTypeMap.set(log.emailType, count + 1);
    });

    const emailsByType = Array.from(emailsByTypeMap.entries())
      .map(([emailType, count]) => ({ emailType, count }))
      .sort((a, b) => b.count - a.count);

    // Get organization count
    const organizationCount = await this.prisma.organization.count();

    // Get top organizations by email volume
    const organizationMetrics = await this.getAllOrganizationMetrics(daysAgo);
    const topOrganizations = organizationMetrics
      .map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        emailsSent: m.totalSent,
      }))
      .sort((a, b) => b.emailsSent - a.emailsSent)
      .slice(0, 10);

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      emailsByType,
      organizationCount,
      topOrganizations,
    };
  }

  /**
   * Get detailed email logs for an organization (for Org Admins)
   * Includes pagination support
   */
  async getOrganizationEmailLogs(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      emailType?: string;
      status?: string;
    } = {}
  ) {
    const { limit = 100, offset = 0, emailType, status } = options;

    // Get all user IDs who are members of this organization
    const memberIds = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    const userIds = memberIds.map((m) => m.userId);

    // Build where clause
    const where: any = {
      userId: {
        in: userIds,
      },
    };

    if (emailType) {
      where.emailType = emailType;
    }

    if (status) {
      where.status = status;
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        select: {
          id: true,
          recipientEmail: true,
          emailType: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          openedAt: true,
          clickedAt: true,
          bouncedAt: true,
          bounceReason: true,
          metadata: true,
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    };
  }

  /**
   * Get detailed email logs for platform (for Platform Admins)
   * Includes pagination support
   */
  async getPlatformEmailLogs(
    options: {
      limit?: number;
      offset?: number;
      emailType?: string;
      status?: string;
      organizationId?: string;
    } = {}
  ) {
    const { limit = 100, offset = 0, emailType, status, organizationId } = options;

    // Build where clause
    const where: any = {};

    if (emailType) {
      where.emailType = emailType;
    }

    if (status) {
      where.status = status;
    }

    if (organizationId) {
      // Get user IDs for this organization
      const memberIds = await this.prisma.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true },
      });
      where.userId = {
        in: memberIds.map((m) => m.userId),
      };
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        select: {
          id: true,
          recipientEmail: true,
          emailType: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          openedAt: true,
          clickedAt: true,
          bouncedAt: true,
          bounceReason: true,
          metadata: true,
          userId: true,
        },
        orderBy: {
          sentAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    };
  }
}
