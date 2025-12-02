import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from './permission.service';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

/**
 * Handles all note-related operations for counseling sessions
 * Now uses PermissionService for centralized access control
 * Separated from CounselService to follow Single Responsibility Principle
 */
@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    private prisma: PrismaService,
    private permissionService: PermissionService,
    private emailService: EmailService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Create a note in a counseling session
   * Access control scenarios:
   * 1. Session Owner - Requires subscription to create notes
   * 2. Assigned Counselor - Full access to all notes
   * 3. Coverage Counselor - Cannot create private notes
   * 4. Share with Write Access - Can create notes via share link
   * 5. Share Read-Only - Cannot create notes
   * 6. Subscription Check - Fallback for non-owners without shares
   */
  async createNote(
    sessionId: string,
    authorId: string,
    organizationId: string,
    createNoteDto: CreateNoteDto
  ) {
    // 0. Verify session exists first
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 1. Check if user owns the session - if so, require subscription
    const isOwner = session.userId === authorId;

    if (isOwner) {
      // Session owner must have subscription to create notes
      const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(authorId);
      if (!subscriptionStatus.hasHistoryAccess) {
        throw new ForbiddenException('Session notes are only available to subscribed users');
      }
    } else {
      // Non-owner: Check if they have write access via a share with allowNotesAccess
      const validShare = await this.prisma.sessionShare.findFirst({
        where: {
          sessionId,
          allowNotesAccess: true, // Must allow note creation
          AND: [
            {
              OR: [
                { sharedWith: authorId },
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
      });

      if (!validShare) {
        // Not owner and no valid share with write access - require subscription
        const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(authorId);
        if (!subscriptionStatus.hasHistoryAccess) {
          throw new ForbiddenException('Session notes are only available to subscribed users or via shared access with note permissions');
        }
      }
      // If they have a valid share with allowNotesAccess, allow creation regardless of subscription
    }

    // 2. Get author info
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { firstName: true, lastName: true, accountType: true },
    });

    if (!author) {
      throw new NotFoundException('User not found');
    }

    // 3. Determine role with enhanced counselor assignment checks
    let authorRole = session.userId === authorId ? 'user' : 'viewer';

    const memberId = session.userId;
    if (memberId) {
      // Check if author is assigned counselor
      const assignment = await this.prisma.counselorAssignment.findFirst({
        where: {
          counselorId: authorId,
          memberId,
          organizationId,
          status: 'active',
        },
      });

      // Check if author is coverage counselor
      const coverageGrant = await this.prisma.counselorCoverageGrant.findFirst({
        where: {
          backupCounselorId: authorId,
          memberId,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ],
        },
      });

      const isAssignedCounselor = !!assignment;
      const isCoverageCounselor = !!coverageGrant && !isAssignedCounselor;

      // Coverage counselors cannot create private notes
      if (createNoteDto.isPrivate && isCoverageCounselor) {
        throw new ForbiddenException('Coverage counselors cannot create private notes');
      }

      // Enhanced role detection
      if (isAssignedCounselor) {
        authorRole = 'counselor';
      } else if (isCoverageCounselor) {
        authorRole = 'counselor';
      }
    }

    // 4. Build author name
    const authorName = [author.firstName, author.lastName]
      .filter(Boolean)
      .join(' ') || 'Anonymous';

    // 5. Create note
    const note = await this.prisma.sessionNote.create({
      data: {
        sessionId,
        authorId,
        authorName,
        authorRole,
        content: createNoteDto.content,
        isPrivate: createNoteDto.isPrivate || false,
      },
    });

    // 6. Send email notifications (async, don't block note creation)
    this.sendNoteAddedNotifications(sessionId, authorId, authorName, note.isPrivate, session, organizationId).catch(err => {
      this.logger.error('Failed to send note added notifications:', err);
    });

    return note;
  }

  /**
   * Send email notifications when a note is added
   * Notification rules:
   * - Owner: notified when anyone else adds a note (private or not)
   * - Counselor: notified ONLY when owner adds a note (private or not)
   * - Shared members: notified when anyone else adds NON-PRIVATE notes
   */
  private async sendNoteAddedNotifications(
    sessionId: string,
    authorId: string,
    authorName: string,
    isPrivate: boolean,
    session: any,
    organizationId: string,
  ): Promise<void> {
    const recipientIds = new Set<string>();

    // 1. Notify owner (unless they're the author)
    if (session.userId && session.userId !== authorId) {
      recipientIds.add(session.userId);
    }

    // 2. Notify counselors (only if owner is the author)
    if (session.userId === authorId) {
      const counselorAssignments = await this.prisma.counselorAssignment.findMany({
        where: {
          memberId: session.userId,
          organizationId,
          status: 'active',
        },
        select: { counselorId: true },
      });

      for (const assignment of counselorAssignments) {
        if (assignment.counselorId !== authorId) {
          recipientIds.add(assignment.counselorId);
        }
      }
    }

    // 3. Notify shared members (only if NOT private, and not the author)
    if (!isPrivate) {
      const activeShares = await this.prisma.sessionShare.findMany({
        where: {
          sessionId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          accesses: {
            where: {
              userId: { not: authorId }, // Exclude author
            },
            select: { userId: true },
          },
        },
      });

      for (const share of activeShares) {
        for (const access of share.accesses) {
          recipientIds.add(access.userId);
        }
      }
    }

    // 4. Send emails to all recipients
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: Array.from(recipientIds) } },
      select: { id: true, email: true, firstName: true },
    });

    for (const recipient of recipients) {
      await this.emailService.sendNoteAddedEmail(
        recipient.email,
        {
          recipientName: recipient.firstName || undefined,
          authorName,
          sessionTitle: session.title,
          sessionId,
        },
        recipient.id,
      );
    }
  }

  /**
   * Get all notes for a session with complex permission filtering
   * Privacy rules:
   * - Private notes visible to: Owner, Assigned Counselor only
   * - Non-private notes visible to: Owner, All Counselors, Share recipients
   * - Coverage counselors cannot see private notes
   */
  async getNotesForSession(
    sessionId: string,
    requestingUserId: string,
    organizationId: string
  ) {
    // 0. Verify session exists first
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 1. Check if user owns the session - if so, require subscription
    const isOwner = session.userId === requestingUserId;

    if (isOwner) {
      // Session owner must have subscription to access notes
      const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(requestingUserId);
      if (!subscriptionStatus.hasHistoryAccess) {
        throw new ForbiddenException('Session notes are only available to subscribed users');
      }
    } else {
      // Non-owner: Check if they have access via a valid share link
      const validShare = await this.prisma.sessionShare.findFirst({
        where: {
          sessionId,
          AND: [
            {
              OR: [
                { sharedWith: requestingUserId },
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
      });

      if (!validShare) {
        // Not owner and no valid share - require subscription
        const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(requestingUserId);
        if (!subscriptionStatus.hasHistoryAccess) {
          throw new ForbiddenException('Session notes are only available to subscribed users or via shared access');
        }
      }
      // If they have a valid share, allow access regardless of subscription
    }

    // 2. Check if requesting user is coverage counselor
    const memberId = session.userId;
    let isCoverageCounselor = false;

    if (memberId) {
      // Check if user is assigned counselor
      const assignment = await this.prisma.counselorAssignment.findFirst({
        where: {
          counselorId: requestingUserId,
          memberId,
          organizationId,
          status: 'active',
        },
      });

      // Check if user is coverage counselor (but not assigned)
      const coverageGrant = await this.prisma.counselorCoverageGrant.findFirst({
        where: {
          backupCounselorId: requestingUserId,
          memberId,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ],
        },
      });

      isCoverageCounselor = !!coverageGrant && !assignment;
    }

    // 3. Get all notes for session
    const notes = await this.prisma.sessionNote.findMany({
      where: {
        sessionId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 4. Filter private notes with enhanced privacy rules
    return notes.filter(note => {
      // Public notes visible to all
      if (!note.isPrivate) return true;

      // Private notes visible to author
      if (note.authorId === requestingUserId) return true;

      // Private counselor notes visible to the member whose session it is
      if (session.userId === requestingUserId && note.authorRole === 'counselor') {
        return true;
      }

      // Coverage counselors cannot see private notes
      if (isCoverageCounselor) return false;

      return false;
    });
  }

  /**
   * Update an existing note
   * Only the note author can edit their own notes
   * Coverage counselors cannot make notes private
   */
  async updateNote(
    noteId: string,
    requestingUserId: string,
    organizationId: string,
    updateNoteDto: UpdateNoteDto
  ) {
    // 1. Find note
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // 2. Check authorization - only author can edit
    if (note.authorId !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    // 3. If changing to private, verify user is assigned counselor (not coverage)
    if (updateNoteDto.isPrivate && !note.isPrivate) {
      // User is trying to make note private - verify they're assigned counselor
      const noteWithSession = await this.prisma.sessionNote.findUnique({
        where: { id: noteId },
        include: { session: { select: { userId: true } } },
      });

      if (noteWithSession?.session?.userId) {
        const assignment = await this.prisma.counselorAssignment.findFirst({
          where: {
            counselorId: requestingUserId,
            memberId: noteWithSession.session.userId,
            organizationId,
            status: 'active',
          },
        });

        if (!assignment) {
          throw new ForbiddenException('Only assigned counselors can create private notes');
        }
      }
    }

    // 4. Update note
    return this.prisma.sessionNote.update({
      where: { id: noteId },
      data: {
        content: updateNoteDto.content ?? note.content,
        isPrivate: updateNoteDto.isPrivate ?? note.isPrivate,
      },
    });
  }

  /**
   * Soft delete a note
   * Only the note author can delete their own notes
   */
  async deleteNote(
    noteId: string,
    requestingUserId: string
  ) {
    // 1. Find note
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // 2. Check authorization - only author can delete
    if (note.authorId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    // 3. Soft delete note
    await this.prisma.sessionNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
  }
}
