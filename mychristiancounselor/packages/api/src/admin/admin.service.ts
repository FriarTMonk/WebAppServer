import { Injectable, InternalServerErrorException, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EmailService } from '../email/email.service';
import { PlatformMetrics } from './types/platform-metrics.interface';
import { GetOrganizationMembersResponse, MorphStartResponse, MorphEndResponse, AdminResetPasswordResponse, UpdateMemberRoleResponse, OrganizationMember, OrgMetrics } from '@mychristiancounselor/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly ACTIVE_USER_DAYS_THRESHOLD = 7;

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private emailService: EmailService,
  ) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    return user?.isPlatformAdmin ?? false;
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

      // SLA Health Statistics
      const slaHealth = await this.getSLAHealthStats();

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
        slaHealth,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve platform metrics', error);
      throw new InternalServerErrorException('Failed to retrieve platform metrics');
    }
  }

  /**
   * Calculate SLA health statistics for admin dashboard
   */
  private async getSLAHealthStats() {
    try {
      // Count breached SLAs
      const breachedResponse = await this.prisma.supportTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          responseSLAStatus: 'breached',
        },
      });

      const breachedResolution = await this.prisma.supportTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          resolutionSLAStatus: 'breached',
        },
      });

      // Count critical SLAs
      const criticalResponse = await this.prisma.supportTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          responseSLAStatus: 'critical',
        },
      });

      const criticalResolution = await this.prisma.supportTicket.count({
        where: {
          status: { in: ['open', 'in_progress'] },
          resolutionSLAStatus: 'critical',
        },
      });

      // Calculate compliance rate
      const complianceRate = await this.calculateComplianceRate();

      return {
        breachedResponse,
        breachedResolution,
        criticalResponse,
        criticalResolution,
        complianceRate,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve SLA health stats', error);
      // Return zeros if SLA tracking not yet enabled or error occurs
      return {
        breachedResponse: 0,
        breachedResolution: 0,
        criticalResponse: 0,
        criticalResolution: 0,
        complianceRate: {
          overall: 100,
          response: 100,
          resolution: 100,
        },
      };
    }
  }

  /**
   * Calculate SLA compliance rate for last 30 days
   */
  private async calculateComplianceRate() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const resolvedTickets = await this.prisma.supportTicket.findMany({
      where: {
        resolvedAt: { gte: thirtyDaysAgo },
        actualResponseTime: { not: null },
      },
      select: {
        responseSLAMet: true,
        resolutionSLAMet: true,
      },
    });

    if (resolvedTickets.length === 0) {
      return {
        overall: 100,
        response: 100,
        resolution: 100,
      };
    }

    const responseMet = resolvedTickets.filter((t) => t.responseSLAMet === true).length;
    const resolutionMet = resolvedTickets.filter((t) => t.resolutionSLAMet === true).length;
    const totalResponseSLAs = resolvedTickets.filter((t) => t.responseSLAMet !== null).length;
    const totalResolutionSLAs = resolvedTickets.filter((t) => t.resolutionSLAMet !== null).length;

    const responseRate = totalResponseSLAs > 0 ? (responseMet / totalResponseSLAs) * 100 : 100;
    const resolutionRate = totalResolutionSLAs > 0 ? (resolutionMet / totalResolutionSLAs) * 100 : 100;
    const overallRate = ((responseMet + resolutionMet) / (totalResponseSLAs + totalResolutionSLAs)) * 100;

    return {
      overall: Math.round(overallRate),
      response: Math.round(responseRate),
      resolution: Math.round(resolutionRate),
    };
  }

  /**
   * Retrieves all non-system organizations with optional filtering.
   *
   * Returns paginated organization data including member counts.
   * Organizations can be filtered by search term (name/description) and license status.
   *
   * @param filters Optional filters for searching and pagination
   * @param filters.search Search term to filter by organization name or description
   * @param filters.licenseStatus Filter by license status (trial, active, expired)
   * @param filters.skip Number of records to skip for pagination (default: 0)
   * @param filters.take Number of records to return (default: 50)
   * @returns Promise with paginated organizations, total count, and pagination info
   * @throws InternalServerErrorException if retrieval fails
   */
  async getAllOrganizations(filters?: {
    search?: string;
    licenseStatus?: string;
    skip?: number;
    take?: number;
  }) {
    try {
      const where: any = {
        isSystemOrganization: false,
      };

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters?.licenseStatus) {
        where.licenseStatus = filters.licenseStatus;
      }

      const [organizations, total] = await Promise.all([
        this.prisma.organization.findMany({
          where,
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: filters?.skip || 0,
          take: filters?.take || 50,
        }),
        this.prisma.organization.count({ where }),
      ]);

      return {
        organizations,
        total,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve organizations', error);
      throw new InternalServerErrorException('Failed to retrieve organizations');
    }
  }

  /**
   * Retrieves all users with optional filtering and pagination.
   *
   * Returns paginated user data including organization memberships.
   * Users can be filtered by search term (email/name), account type, and active status.
   *
   * @param filters Optional filters for searching and pagination
   * @param filters.search Search term to filter by email, first name, or last name
   * @param filters.accountType Filter by account type (individual or organization)
   * @param filters.isActive Filter by active status (true/false)
   * @param filters.skip Number of records to skip for pagination (default: 0)
   * @param filters.take Number of records to return (default: 50)
   * @returns Promise with paginated users, total count, and pagination info
   * @throws InternalServerErrorException if retrieval fails
   */
  async getAllUsers(filters?: {
    search?: string;
    accountType?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    try {
      const where: any = {};

      if (filters?.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters?.accountType) {
        where.accountType = filters.accountType;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            accountType: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            organizationMemberships: {
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: filters?.skip || 0,
          take: filters?.take || 50,
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve users', error);
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  /**
   * Get all members of an organization with their roles
   */
  async getOrganizationMembers(organizationId: string): Promise<GetOrganizationMembersResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const members: OrganizationMember[] = memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName || undefined,
      lastName: m.user.lastName || undefined,
      roleName: m.role.name,
      roleId: m.role.id,
      joinedAt: m.joinedAt,
    }));

    return {
      members,
      organizationId,
      organizationName: organization.name,
    };
  }

  /**
   * Start morphing into another user
   * Generates a new JWT token with morph metadata
   */
  async startMorph(adminUserId: string, targetUserId: string): Promise<MorphStartResponse> {
    // Prevent morphing into yourself - self-morphing is not allowed
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Cannot morph into yourself');
    }

    // Verify target user exists and is active
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('Cannot morph into inactive user');
    }

    // Generate morph session ID
    const morphSessionId = randomBytes(16).toString('hex');

    // Create audit log for morph start
    await this.logAdminAction(
      adminUserId,
      'morph_start',
      {
        targetUserEmail: targetUser.email,
        targetUserName: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim(),
      },
      targetUserId,
      undefined,
      morphSessionId,
    );

    // Generate new JWT with morph metadata
    const morphPayload = {
      sub: targetUserId, // The user being morphed into
      email: targetUser.email,
      isMorphed: true,
      originalAdminId: adminUserId,
      morphSessionId,
    };

    this.logger.debug(`[ADMIN] Creating morph payload: ${JSON.stringify(morphPayload, null, 2)}`);
    const accessToken = await this.authService.generateAccessToken(morphPayload);
    this.logger.debug('[ADMIN] Received access token from auth service');

    return {
      accessToken,
      morphSessionId,
      morphedUser: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName || undefined,
        lastName: targetUser.lastName || undefined,
      },
      message: `Successfully morphed into ${targetUser.email}`,
    };
  }

  /**
   * End morph session and restore original admin token
   */
  async endMorph(originalAdminId: string, morphSessionId: string): Promise<MorphEndResponse> {
    // Create audit log for morph end
    await this.logAdminAction(
      originalAdminId,
      'morph_end',
      { morphSessionId },
      undefined,
      undefined,
      morphSessionId,
    );

    // Get admin user to generate fresh token
    const adminUser = await this.prisma.user.findUnique({
      where: { id: originalAdminId },
    });

    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }

    // Generate normal JWT for admin (no morph metadata)
    const normalPayload = {
      sub: adminUser.id,
      email: adminUser.email,
    };

    const accessToken = await this.authService.generateAccessToken(normalPayload);

    return {
      accessToken,
      message: 'Morph session ended successfully',
    };
  }

  /**
   * Reset a user's password (admin action)
   */
  async resetUserPassword(
    adminUserId: string,
    targetUserId: string,
    newPassword: string,
  ): Promise<AdminResetPasswordResponse> {
    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const passwordHash = await this.authService.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'password_reset',
      {
        targetUserEmail: targetUser.email,
      },
      targetUserId,
    );

    return {
      message: 'Password reset successfully',
      userId: targetUserId,
    };
  }

  /**
   * Update a user's role in an organization
   */
  async updateMemberRole(
    adminUserId: string,
    organizationId: string,
    userId: string,
    newRoleId: string,
  ): Promise<UpdateMemberRoleResponse> {
    this.logger.log(`[updateMemberRole] Starting role update for userId=${userId} in orgId=${organizationId} to newRoleId=${newRoleId}`);

    // Verify membership exists
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        user: true,
        role: true,
      },
    });

    if (!membership) {
      this.logger.error(`[updateMemberRole] Membership not found for userId=${userId} in orgId=${organizationId}`);
      throw new NotFoundException('User is not a member of this organization');
    }

    this.logger.log(`[updateMemberRole] Found membership id=${membership.id}, current role=${membership.role.name} (${membership.roleId})`);

    // Verify new role exists and belongs to the organization
    const newRole = await this.prisma.organizationRole.findUnique({
      where: { id: newRoleId },
    });

    if (!newRole) {
      this.logger.error(`[updateMemberRole] Role not found: ${newRoleId}`);
      throw new BadRequestException('Invalid role for this organization');
    }

    if (newRole.organizationId !== organizationId) {
      this.logger.error(`[updateMemberRole] Role ${newRoleId} (${newRole.name}) belongs to org ${newRole.organizationId}, not ${organizationId}`);
      throw new BadRequestException('Invalid role for this organization');
    }

    this.logger.log(`[updateMemberRole] Valid new role found: ${newRole.name} (${newRole.id}) for org ${organizationId}`);

    // Update role
    this.logger.log(`[updateMemberRole] Updating membership ${membership.id} roleId from ${membership.roleId} to ${newRoleId}`);
    const updated = await this.prisma.organizationMember.update({
      where: { id: membership.id },
      data: { roleId: newRoleId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`[updateMemberRole] Successfully updated role to ${updated.role.name} (${updated.roleId})`);

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'update_user_role',
      {
        oldRole: membership.role.name,
        newRole: newRole.name,
        userEmail: membership.user.email,
      },
      userId,
      organizationId,
    );

    return {
      message: 'User role updated successfully',
      member: {
        id: updated.id,
        userId: updated.user.id,
        email: updated.user.email,
        firstName: updated.user.firstName || undefined,
        lastName: updated.user.lastName || undefined,
        roleName: updated.role.name,
        roleId: updated.role.id,
        joinedAt: updated.joinedAt,
      },
    };
  }

  /**
   * Release a member from an organization
   * The user becomes an individual user and keeps their account/data
   * but loses organization membership and counselor oversight
   */
  async releaseMember(
    adminUserId: string,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    this.logger.log(`[releaseMember] Releasing userId=${userId} from orgId=${organizationId}`);

    // Verify membership exists
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        user: true,
        role: true,
      },
    });

    if (!membership) {
      this.logger.error(`[releaseMember] Membership not found for userId=${userId} in orgId=${organizationId}`);
      throw new NotFoundException('User is not a member of this organization');
    }

    // Delete the organization membership
    await this.prisma.organizationMember.delete({
      where: { id: membership.id },
    });

    // Check if user has any remaining organization memberships
    const remainingMemberships = await this.prisma.organizationMember.count({
      where: { userId },
    });

    // If this was their last organization, reactivate their suspended subscription
    if (remainingMemberships === 0) {
      this.logger.log(`[releaseMember] User ${userId} left their last organization, attempting to reactivate subscription`);
      await this.subscriptionService.reactivateSubscription(userId).catch(err => {
        this.logger.error(`Failed to reactivate subscription for user ${userId}:`, err);
        // Don't block member release if reactivation fails
      });
    }

    // Update user's accountType to 'individual' if it was 'organization'
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountType: 'individual',
      },
    });

    this.logger.log(`[releaseMember] Successfully released member ${userId} from organization`);

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'release_member',
      {
        userEmail: membership.user.email,
        role: membership.role.name,
        organizationName: membership.organization.name,
      },
      userId,
      organizationId,
    );

    return {
      message: 'Member released successfully',
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName || undefined,
        lastName: membership.user.lastName || undefined,
      },
    };
  }

  /**
   * Check if user is an admin of a specific organization
   */
  async isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        role: {
          OR: [
            { name: 'Owner' },
            { name: 'Admin' },
          ],
        },
      },
    });

    return !!membership;
  }

  /**
   * Manually update user subscription (Platform Admin only)
   */
  async updateUserSubscription(
    adminUserId: string,
    targetUserId: string,
    subscriptionData: {
      subscriptionStatus: string;
      subscriptionTier?: string | null;
      subscriptionStart?: Date;
      subscriptionEnd?: Date;
    },
  ): Promise<any> {
    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Update subscription
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        subscriptionStatus: subscriptionData.subscriptionStatus,
        subscriptionTier: subscriptionData.subscriptionTier,
        subscriptionStart: subscriptionData.subscriptionStart,
        subscriptionEnd: subscriptionData.subscriptionEnd,
      },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    });

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'update_user_subscription',
      {
        targetUserEmail: targetUser.email,
        oldStatus: targetUser.subscriptionStatus,
        newStatus: subscriptionData.subscriptionStatus,
        subscriptionTier: subscriptionData.subscriptionTier,
      },
      targetUserId,
    );

    return {
      message: 'User subscription updated successfully',
      userId: updated.id,
      subscriptionStatus: updated.subscriptionStatus,
      subscriptionTier: updated.subscriptionTier,
    };
  }

  /**
   * Update organization subscription limits (Platform Admin only)
   */
  async updateOrganizationSubscription(
    adminUserId: string,
    organizationId: string,
    subscriptionData: {
      maxMembers?: number;
      licenseStatus?: string;
      licenseType?: string;
      licenseExpiresAt?: Date;
    },
  ): Promise<any> {
    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // If reducing maxMembers, verify it's not less than current member count
    if (subscriptionData.maxMembers !== undefined &&
        subscriptionData.maxMembers < organization._count.members) {
      throw new BadRequestException(
        `Cannot set maxMembers to ${subscriptionData.maxMembers}. Organization currently has ${organization._count.members} members.`
      );
    }

    // Update organization subscription
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        maxMembers: subscriptionData.maxMembers,
        licenseStatus: subscriptionData.licenseStatus,
        licenseType: subscriptionData.licenseType,
        licenseExpiresAt: subscriptionData.licenseExpiresAt,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'update_org_subscription',
      {
        organizationName: organization.name,
        oldMaxMembers: organization.maxMembers,
        newMaxMembers: updated.maxMembers,
        oldLicenseStatus: organization.licenseStatus,
        newLicenseStatus: updated.licenseStatus,
        licenseType: subscriptionData.licenseType,
      },
      undefined,
      organizationId,
    );

    return {
      message: 'Organization subscription updated successfully',
      organizationId: updated.id,
      maxMembers: updated.maxMembers,
      licenseStatus: updated.licenseStatus,
      currentMemberCount: updated._count.members,
    };
  }

  /**
   * Get organization-specific metrics for organization admins
   * Returns metrics only for the specified organization
   */
  async getOrganizationMetrics(organizationId: string): Promise<OrgMetrics> {
    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get active members count
    // TODO: Implement proper activity tracking with lastActiveAt field
    // For now, count all organization members
    const activeMembers = await this.prisma.organizationMember.count({
      where: {
        organizationId,
      },
    });

    // Get counseling sessions count
    // TODO: Add CounselSession model and organization relationship
    // For now, return 0 as counseling sessions are not yet implemented
    const counselingSessions = 0;

    // Calculate license utilization
    const used = organization._count.members;
    const available = organization.maxMembers;
    const percentage = available > 0 ? Math.round((used / available) * 100) : 0;

    return {
      organizationId: organization.id,
      activeMembers,
      counselingSessions,
      licenseUtilization: {
        used,
        available,
        percentage,
      },
    };
  }

  /**
   * Create a new organization (Platform Admin only)
   */
  private async getPlatformRole(roleName: string) {
    const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

    const role = await this.prisma.organizationRole.findUnique({
      where: {
        organizationId_name: {
          organizationId: SYSTEM_ORG_ID,
          name: roleName,
        },
      },
    });

    if (!role) {
      throw new InternalServerErrorException(
        `Platform role "${roleName}" not found. Run ensure-platform-roles.ts script.`
      );
    }

    return role;
  }

  async createOrganization(
    adminUserId: string,
    data: {
      name: string;
      description?: string;
      ownerEmail: string;
      licenseType?: string;
      licenseStatus?: string;
      maxMembers?: number;
    },
  ): Promise<any> {
    this.logger.log(`[createOrganization] Admin ${adminUserId} creating organization: ${data.name} with owner: ${data.ownerEmail}`);

    // Validate owner email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.ownerEmail)) {
      throw new BadRequestException('Invalid owner email format');
    }

    // Create organization with provided data
    const organization = await this.prisma.organization.create({
      data: {
        name: data.name,
        description: data.description,
        licenseType: data.licenseType || null,
        licenseStatus: data.licenseStatus || 'trial',
        maxMembers: data.maxMembers || 10,
      },
    });

    // Get platform Owner role
    const platformOwnerRole = await this.getPlatformRole('Owner');

    // Check if user with this email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.ownerEmail },
    });

    let ownerInvitationSent = false;
    let ownerUser = existingUser;

    if (existingUser) {
      // User exists - add them as owner immediately
      await this.prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: existingUser.id,
          roleId: platformOwnerRole.id,
        },
      });

      this.logger.log(`[createOrganization] Added existing user ${existingUser.email} as owner`);

      // Send notification email
      try {
        await this.emailService.sendEmail({
          to: existingUser.email,
          subject: `You've been added as owner of ${organization.name}`,
          text: `You are now the owner of the organization "${organization.name}". You can manage members and settings in the org-admin dashboard.`,
          html: `<p>You are now the owner of the organization <strong>${organization.name}</strong>.</p><p>You can manage members and settings in the org-admin dashboard.</p>`,
        });
      } catch (error) {
        this.logger.warn(`Failed to send owner notification email: ${error.message}`);
      }
    } else {
      // User doesn't exist - create invitation
      const invitationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await this.prisma.organizationInvitation.create({
        data: {
          organizationId: organization.id,
          email: data.ownerEmail,
          roleId: platformOwnerRole.id,
          invitedById: adminUserId,
          token: invitationToken,
          expiresAt,
          status: 'pending',
        },
      });

      this.logger.log(`[createOrganization] Created invitation for ${data.ownerEmail}`);
      ownerInvitationSent = true;

      // Send invitation email
      try {
        const invitationUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

        await this.emailService.sendEmail({
          to: data.ownerEmail,
          subject: `You've been invited to join ${organization.name} as Owner`,
          text: `You've been invited to be the owner of ${organization.name}. Click the link to accept: ${invitationUrl}`,
          html: `<p>You've been invited to be the owner of <strong>${organization.name}</strong>.</p><p><a href="${invitationUrl}">Click here to accept the invitation</a></p><p>This invitation expires in 7 days.</p>`,
        });
      } catch (error) {
        this.logger.error(`Failed to send invitation email: ${error.message}`);
        throw new InternalServerErrorException('Failed to send invitation email');
      }
    }

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'create_organization',
      {
        organizationName: organization.name,
        ownerEmail: data.ownerEmail,
        licenseType: data.licenseType,
        maxMembers: data.maxMembers || 10,
        ownerInvitationSent,
      },
      existingUser?.id,
      organization.id,
    );

    this.logger.log(`[createOrganization] Successfully created organization ${organization.id}`);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        licenseStatus: organization.licenseStatus,
        maxMembers: organization.maxMembers,
      },
      owner: ownerUser
        ? {
            id: ownerUser.id,
            email: ownerUser.email,
            firstName: ownerUser.firstName,
            lastName: ownerUser.lastName,
          }
        : {
            email: data.ownerEmail,
          },
      ownerInvitationSent,
      message: ownerInvitationSent
        ? `Organization created successfully. Invitation sent to ${data.ownerEmail}`
        : `Organization created successfully. ${data.ownerEmail} added as owner.`,
    };
  }

  /**
   * Archive an organization (Platform Admin only)
   * Sets licenseStatus to 'archived' and marks all members for self-removal
   */
  async archiveOrganization(
    adminUserId: string,
    organizationId: string,
  ): Promise<any> {
    this.logger.log(`[archiveOrganization] Archiving organization ${organizationId}`);

    // Verify organization exists and is not already archived
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.licenseStatus === 'archived') {
      throw new BadRequestException('Organization is already archived');
    }

    if (organization.isSystemOrganization) {
      throw new BadRequestException('Cannot archive system organization');
    }

    // Update organization to archived status
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        licenseStatus: 'archived',
        archivedAt: new Date(),
      },
    });

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'archive_organization',
      {
        organizationName: organization.name,
        memberCount: organization._count.members,
      },
      undefined,
      organizationId,
    );

    this.logger.log(`[archiveOrganization] Successfully archived organization ${organizationId}`);

    return {
      ...updated,
      message: 'Organization archived successfully. Members can now remove themselves from this organization.',
    };
  }

  /**
   * Unarchive an organization (Platform Admin only)
   * Restores organization to active status
   */
  async unarchiveOrganization(
    adminUserId: string,
    organizationId: string,
  ): Promise<any> {
    this.logger.log(`[unarchiveOrganization] Unarchiving organization ${organizationId}`);

    // Verify organization exists and is archived
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.licenseStatus !== 'archived') {
      throw new BadRequestException('Organization is not archived');
    }

    // Update organization to active status
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        licenseStatus: 'active',
        archivedAt: null,
      },
    });

    // Log admin action
    await this.logAdminAction(
      adminUserId,
      'unarchive_organization',
      {
        organizationName: organization.name,
      },
      undefined,
      organizationId,
    );

    this.logger.log(`[unarchiveOrganization] Successfully unarchived organization ${organizationId}`);

    return {
      ...updated,
      message: 'Organization unarchived successfully',
    };
  }
}
