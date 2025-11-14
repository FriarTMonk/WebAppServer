import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformMetrics } from './types/platform-metrics.interface';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly ACTIVE_USER_DAYS_THRESHOLD = 7;

  constructor(private prisma: PrismaService) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          isSystemOrganization: true,
        },
      },
    });

    return !!membership;
  }

  async logAdminAction(
    adminUserId: string,
    action: string,
    metadata: Record<string, any>,
    targetUserId?: string,
    targetOrgId?: string,
    morphSessionId?: string,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        targetUserId,
        targetOrgId,
        morphSessionId,
        metadata,
      },
    });
  }

  async getAuditLog(filters: {
    adminUserId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        adminUserId: filters.adminUserId,
        action: filters.action,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetOrg: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 100,
    });
  }

  /**
   * Retrieves platform-wide metrics including user and organization statistics.
   *
   * This method aggregates key metrics across the platform:
   * - Total active users (individual and organization accounts)
   * - Recently active users (those who logged in within the threshold period)
   * - Organization counts by license status (trial, active, expired)
   *
   * @returns Promise<PlatformMetrics> Platform metrics with user and organization statistics
   * @throws InternalServerErrorException if metrics retrieval fails
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    try {
      const activeUserThresholdDate = new Date(
        Date.now() - this.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000
      );

      const [
        totalUsers,
        activeUsers,
        individualUsers,
        orgUsers,
        totalOrgs,
        trialOrgs,
        activeOrgs,
        expiredOrgs,
      ] = await Promise.all([
        // Total users
        this.prisma.user.count({ where: { isActive: true } }),

        // Active users (logged in within last N days)
        this.prisma.user.count({
          where: {
            isActive: true,
            refreshTokens: {
              some: {
                createdAt: {
                  gte: activeUserThresholdDate,
                },
              },
            },
          },
        }),

        // Individual account users
        this.prisma.user.count({
          where: { isActive: true, accountType: 'individual' },
        }),

        // Organization account users
        this.prisma.user.count({
          where: { isActive: true, accountType: 'organization' },
        }),

        // Total organizations
        this.prisma.organization.count({
          where: { isSystemOrganization: false },
        }),

        // Trial organizations
        this.prisma.organization.count({
          where: { isSystemOrganization: false, licenseStatus: 'trial' },
        }),

        // Active organizations
        this.prisma.organization.count({
          where: { isSystemOrganization: false, licenseStatus: 'active' },
        }),

        // Expired organizations
        this.prisma.organization.count({
          where: { isSystemOrganization: false, licenseStatus: 'expired' },
        }),
      ]);

      return {
        activeUsers: {
          total: activeUsers,
          individual: individualUsers,
          organization: orgUsers,
        },
        totalUsers,
        organizations: {
          total: totalOrgs,
          trial: trialOrgs,
          active: activeOrgs,
          expired: expiredOrgs,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve platform metrics', error);
      throw new InternalServerErrorException('Failed to retrieve platform metrics');
    }
  }
}
