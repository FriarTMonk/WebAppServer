import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        emailVerified: true,
        isActive: true,
        isPlatformAdmin: true,
        preferredTranslation: true,
        comparisonTranslations: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        preferredTranslation: true,
        comparisonTranslations: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            licenseStatus: true,
          },
        },
        role: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    return memberships.map(m => ({
      organization: m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async getHistory(
    userId: string,
    searchQuery?: string,
    topics?: string[],
    dateFrom?: Date,
    dateTo?: Date,
    status: 'active' | 'completed' = 'active',
  ) {
    // Build where clause
    const where: any = {
      userId,
      status,
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Fetch sessions with note count
    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 2, // Only first 2 messages for excerpt
        },
        _count: {
          select: {
            notes: true,
          },
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

    // Format for response
    return filtered.map((session) => ({
      id: session.id,
      title: session.title,
      excerpt: session.messages[0]?.content.substring(0, 150) + '...',
      topics: session.topics || [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      noteCount: session._count.notes,
    }));
  }

  /**
   * Helper method to check subscription status
   * TODO: Replace with proper SubscriptionService when implemented
   */
  private async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    // Simplified check - assumes organization accounts have subscription access
    // This should be replaced with proper subscription logic
    return {
      hasArchiveAccess: user?.accountType === 'organization',
    };
  }

  async archiveConversation(userId: string, sessionId: string) {
    const subStatus = await this.getSubscriptionStatus(userId);
    if (!subStatus.hasArchiveAccess) {
      throw new ForbiddenException('Archive access requires an active subscription');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException('You can only archive your own conversations');
    }

    const deletedAt = new Date();
    deletedAt.setDate(deletedAt.getDate() + 30); // 30 days from now

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        deletedAt,
      },
    });
  }

  async restoreConversation(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException('You can only restore your own conversations');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        archivedAt: null,
        deletedAt: null,
      },
    });
  }

  async hardDeleteConversation(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException('You can only delete your own conversations');
    }

    // Only allow hard delete if past deletedAt date or admin
    if (session.deletedAt && session.deletedAt > new Date()) {
      throw new ForbiddenException(
        `Conversation can be hard deleted after ${session.deletedAt.toLocaleDateString()}`
      );
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Get all counselor assignments for a user (both active and inactive)
   */
  async getCounselorAssignments(userId: string) {
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: { counselorId: userId },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { assignedAt: 'desc' }, // newest first within each status
      ],
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      counselor: {
        id: assignment.counselor.id,
        name: `${assignment.counselor.firstName || ''} ${assignment.counselor.lastName || ''}`.trim() || assignment.counselor.email,
        email: assignment.counselor.email,
      },
      organization: {
        id: assignment.organization.id,
        name: assignment.organization.name,
        description: assignment.organization.description,
      },
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      endedAt: assignment.endedAt,
    }));
  }

  /**
   * Request account deletion (soft delete)
   *
   * Unix Principles:
   * - Single purpose: Mark account for deletion
   * - Fail safely: Verify password before marking
   * - Clear: 30-day grace period, then permanent deletion
   *
   * GDPR Compliance:
   * - User can request account deletion (right to erasure)
   * - 30-day grace period (acceptable under GDPR)
   * - Data not accessible during grace period
   * - Permanent deletion after 30 days (background job)
   *
   * How it works:
   * 1. Mark account as deleted (isActive = false)
   * 2. Set deletionRequestedAt timestamp
   * 3. User cannot log in during grace period
   * 4. After 30 days, background job hard deletes all data
   * 5. User can contact support to cancel deletion within 30 days
   */
  async deleteAccount(userId: string, password: string) {
    // 1. Verify user exists and password is correct
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already marked for deletion');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // 2. Soft delete: Mark account as inactive and set deletion timestamp
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletionRequestedAt: new Date(),
        deletionRequestedBy: userId, // Track who requested (self-initiated)
      },
    });

    // 3. Cancel Stripe subscription immediately
    // Note: Subscription cancellation should be handled in controller
    // to ensure proper Stripe API calls before deletion

    return {
      message: 'Account deletion requested',
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      note: 'Your account will be permanently deleted in 30 days. Contact support to cancel deletion.',
    };
  }
}
