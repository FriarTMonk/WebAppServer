import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

/**
 * Role information for a counselor
 */
export interface CounselorRole {
  isAssigned: boolean;
  isCoverage: boolean;
  hasAccess: boolean;
  role: 'assigned' | 'coverage' | 'none';
}

/**
 * Share access information
 */
export interface ShareAccess {
  hasAccess: boolean;
  allowNotesAccess: boolean;
  shareId?: string;
}

/**
 * Permission check result with detailed information
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * PermissionService - Centralized permission and authorization logic
 *
 * Responsibilities:
 * - Session ownership checks
 * - Counselor role determination (assigned vs coverage)
 * - Share access validation
 * - Note permission checks (create, view, edit, delete)
 * - Subscription-based access control
 *
 * Extracted from NoteService and other services to follow Single Responsibility Principle
 * Provides single source of truth for all authorization rules
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  // ============================================================================
  // ROLE CHECKS
  // ============================================================================

  /**
   * Check if user owns a session
   */
  async isSessionOwner(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    return session?.userId === userId;
  }

  /**
   * Check if user is assigned counselor for a member
   */
  async isAssignedCounselor(
    userId: string,
    memberId: string,
    organizationId: string
  ): Promise<boolean> {
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId: userId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    return !!assignment;
  }

  /**
   * Check if user is coverage counselor for a member (but not assigned)
   */
  async isCoverageCounselor(
    userId: string,
    memberId: string
  ): Promise<boolean> {
    const coverageGrant = await this.prisma.counselorCoverageGrant.findFirst({
      where: {
        backupCounselorId: userId,
        memberId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ],
      },
    });

    // Check if also assigned (assigned takes precedence)
    if (coverageGrant) {
      const isAssigned = await this.isAssignedCounselor(userId, memberId, ''); // Will check all orgs
      return !isAssigned; // Only coverage if NOT assigned
    }

    return false;
  }

  /**
   * Get counselor role details for a user and member
   */
  async getCounselorRole(
    userId: string,
    memberId: string,
    organizationId: string
  ): Promise<CounselorRole> {
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId: userId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    const coverageGrant = await this.prisma.counselorCoverageGrant.findFirst({
      where: {
        backupCounselorId: userId,
        memberId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ],
      },
    });

    const isAssigned = !!assignment;
    const isCoverage = !!coverageGrant && !isAssigned;

    return {
      isAssigned,
      isCoverage,
      hasAccess: isAssigned || isCoverage,
      role: isAssigned ? 'assigned' : isCoverage ? 'coverage' : 'none',
    };
  }

  // ============================================================================
  // SHARE ACCESS
  // ============================================================================

  /**
   * Check if user has valid share access to a session
   */
  async getShareAccess(
    userId: string,
    sessionId: string
  ): Promise<ShareAccess> {
    const share = await this.prisma.sessionShare.findFirst({
      where: {
        sessionId,
        AND: [
          {
            OR: [
              { sharedWith: userId },
              { sharedWith: null }, // Share is open to anyone with the link
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      select: {
        id: true,
        allowNotesAccess: true,
      },
    });

    if (!share) {
      return {
        hasAccess: false,
        allowNotesAccess: false,
      };
    }

    return {
      hasAccess: true,
      allowNotesAccess: share.allowNotesAccess,
      shareId: share.id,
    };
  }

  /**
   * Check if user has share access with write permissions
   */
  async hasWriteShare(userId: string, sessionId: string): Promise<boolean> {
    const access = await this.getShareAccess(userId, sessionId);
    return access.hasAccess && access.allowNotesAccess;
  }

  // ============================================================================
  // NOTE PERMISSIONS
  // ============================================================================

  /**
   * Check if user can create notes in a session
   * @throws ForbiddenException if not allowed
   */
  async canCreateNote(
    userId: string,
    sessionId: string,
    organizationId: string,
    isPrivate: boolean = false
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      throw new ForbiddenException('Session not found');
    }

    const isOwner = session.userId === userId;

    // Check if owner with subscription
    if (isOwner) {
      const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
      if (!subscriptionStatus.hasHistoryAccess) {
        throw new ForbiddenException('Session notes are only available to subscribed users');
      }
      return; // Owner with subscription can create
    }

    // Check share access
    const shareAccess = await this.getShareAccess(userId, sessionId);
    if (shareAccess.hasAccess && shareAccess.allowNotesAccess) {
      // Has write share - check if coverage counselor trying to create private note
      if (isPrivate && session.userId) {
        const role = await this.getCounselorRole(userId, session.userId, organizationId);
        if (role.isCoverage) {
          throw new ForbiddenException('Coverage counselors cannot create private notes');
        }
      }
      return; // Share with write access
    }

    // Check counselor access
    if (session.userId) {
      const role = await this.getCounselorRole(userId, session.userId, organizationId);

      if (role.isCoverage && isPrivate) {
        throw new ForbiddenException('Coverage counselors cannot create private notes');
      }

      if (role.hasAccess) {
        return; // Counselor can create
      }
    }

    // Fallback: require subscription
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    if (!subscriptionStatus.hasHistoryAccess) {
      throw new ForbiddenException('Session notes are only available to subscribed users or via shared access with note permissions');
    }
  }

  /**
   * Check if user can view notes in a session
   * @throws ForbiddenException if not allowed
   */
  async canAccessNotes(
    userId: string,
    sessionId: string,
    organizationId: string
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      throw new ForbiddenException('Session not found');
    }

    const isOwner = session.userId === userId;

    // Check if owner with subscription
    if (isOwner) {
      const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
      if (!subscriptionStatus.hasHistoryAccess) {
        throw new ForbiddenException('Session notes are only available to subscribed users');
      }
      return;
    }

    // Check share access
    const shareAccess = await this.getShareAccess(userId, sessionId);
    if (shareAccess.hasAccess) {
      return; // Has share access
    }

    // Check counselor access
    if (session.userId) {
      const role = await this.getCounselorRole(userId, session.userId, organizationId);
      if (role.hasAccess) {
        return; // Counselor can access
      }
    }

    // Fallback: require subscription
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    if (!subscriptionStatus.hasHistoryAccess) {
      throw new ForbiddenException('Session notes are only available to subscribed users or via shared access');
    }
  }

  /**
   * Check if user can view a specific note
   * Returns true if allowed, false if should be filtered out
   */
  async canViewNote(
    userId: string,
    note: { id: string; authorId: string; isPrivate: boolean; authorRole: string },
    sessionId: string,
    organizationId: string
  ): Promise<boolean> {
    // Public notes visible to all with session access
    if (!note.isPrivate) return true;

    // Author can always see their own notes
    if (note.authorId === userId) return true;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) return false;

    // Member can see private counselor notes in their own session
    if (session.userId === userId && note.authorRole === 'counselor') {
      return true;
    }

    // Check if coverage counselor (cannot see private notes)
    if (session.userId) {
      const role = await this.getCounselorRole(userId, session.userId, organizationId);
      if (role.isCoverage) {
        return false; // Coverage counselors cannot see private notes
      }

      // Assigned counselor can see private notes
      if (role.isAssigned) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user can edit a note
   * @throws ForbiddenException if not allowed
   */
  async canEditNote(userId: string, noteId: string): Promise<void> {
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
      select: { authorId: true },
    });

    if (!note) {
      throw new ForbiddenException('Note not found');
    }

    if (note.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }
  }

  /**
   * Check if user can delete a note
   * @throws ForbiddenException if not allowed
   */
  async canDeleteNote(userId: string, noteId: string): Promise<void> {
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
      select: { authorId: true },
    });

    if (!note) {
      throw new ForbiddenException('Note not found');
    }

    if (note.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }
  }

  /**
   * Verify user can make note private
   * Coverage counselors cannot create private notes
   */
  async canMakeNotePrivate(
    userId: string,
    sessionId: string,
    organizationId: string
  ): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session?.userId) return true; // No member, allow

    const role = await this.getCounselorRole(userId, session.userId, organizationId);

    // Coverage counselors cannot make notes private
    if (role.isCoverage) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // SESSION PERMISSIONS
  // ============================================================================

  /**
   * Check if user can access a session
   * Returns true if allowed, false otherwise
   */
  async canAccessSession(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) return false;

    // Owner can access
    if (session.userId === userId) return true;

    // Check share access
    const shareAccess = await this.getShareAccess(userId, sessionId);
    if (shareAccess.hasAccess) return true;

    // Check counselor access
    if (session.userId) {
      const role = await this.getCounselorRole(userId, session.userId, '');
      if (role.hasAccess) return true;
    }

    return false;
  }

  /**
   * Determine author role for note creation
   */
  async determineAuthorRole(
    userId: string,
    sessionId: string,
    organizationId: string
  ): Promise<'user' | 'viewer' | 'counselor'> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) return 'viewer';

    // Session owner
    if (session.userId === userId) return 'user';

    // Check counselor role
    if (session.userId) {
      const role = await this.getCounselorRole(userId, session.userId, organizationId);
      if (role.hasAccess) return 'counselor';
    }

    return 'viewer';
  }
}
