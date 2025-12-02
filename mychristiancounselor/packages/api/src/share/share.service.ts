import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShareRequest } from '@mychristiancounselor/shared';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ShareService {
  private readonly webAppUrl: string;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.webAppUrl = this.configService.get('WEB_APP_URL', 'http://localhost:3699');
  }

  /**
   * Create a share link for a session
   */
  async createShare(userId: string, createShareDto: CreateShareRequest) {
    const { sessionId, expiresInDays, allowNotesAccess, sharedWith } = createShareDto;

    // Verify session exists and user owns it
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You can only share your own conversations');
    }

    // If sharedWith is specified, check if recipient is registered
    if (sharedWith) {
      const recipient = await this.prisma.user.findUnique({
        where: { email: sharedWith.toLowerCase() },
        select: { id: true, email: true, firstName: true, emailVerified: true },
      });

      if (!recipient) {
        // User not registered - throw error with invitation URL
        const invitationUrl = `${this.webAppUrl}/register?source=invitation`;
        throw new BadRequestException({
          message: 'This person is not registered yet. Please invite them to register first.',
          invitationUrl,
          recipientEmail: sharedWith,
        });
      }

      if (!recipient.emailVerified) {
        throw new BadRequestException('This user has not verified their email yet. Please ask them to verify their email first.');
      }
    }

    // Generate unique share token
    const shareToken = this.generateShareToken();

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create share record
    const share = await this.prisma.sessionShare.create({
      data: {
        sessionId,
        shareToken,
        sharedBy: userId,
        sharedWith: sharedWith ? sharedWith.toLowerCase() : null,
        allowNotesAccess: allowNotesAccess || false,
        expiresAt,
      },
    });

    // Generate share URL (will be completed by frontend)
    const shareUrl = `/shared/${shareToken}`;

    // Send email notification if sharedWith is specified
    if (sharedWith) {
      const recipient = await this.prisma.user.findUnique({
        where: { email: sharedWith.toLowerCase() },
        select: { id: true, email: true, firstName: true },
      });

      if (recipient) {
        const senderName = session.user
          ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email
          : 'Someone';

        // Extract topics from session (from JSON field)
        const topics = Array.isArray(session.topics) ? session.topics : [];

        await this.emailService.sendSessionShareEmail(
          recipient.email,
          {
            recipientName: recipient.firstName || undefined,
            senderName,
            sessionTitle: session.title,
            sessionTopics: topics as string[],
            shareToken,
            expiresAt: expiresAt || undefined,
          },
          recipient.id,
        );
      }
    }

    return {
      share,
      shareUrl,
    };
  }

  /**
   * Record user access to a share
   */
  async recordAccess(shareId: string, userId: string) {
    // Check if access record already exists
    const existing = await this.prisma.sessionShareAccess.findUnique({
      where: {
        shareId_userId: {
          shareId,
          userId,
        },
      },
    });

    if (existing) {
      // Update last accessed time
      await this.prisma.sessionShareAccess.update({
        where: { id: existing.id },
        data: { lastAccessedAt: new Date() },
      });
    } else {
      // Create new access record
      await this.prisma.sessionShareAccess.create({
        data: {
          shareId,
          userId,
        },
      });
    }
  }

  /**
   * Validate share token and check if user can access
   */
  async validateShare(shareToken: string, userId: string) {
    const share = await this.prisma.sessionShare.findUnique({
      where: { shareToken },
      include: {
        session: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' },
            },
            notes: {
              where: {
                OR: [
                  { isPrivate: false },
                  { authorId: userId }, // User can see their own private notes
                ],
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    // Check if share is restricted to specific user
    if (share.sharedWith && share.sharedWith !== userId) {
      throw new ForbiddenException('This share link is not for you');
    }

    // Determine permissions
    const isOwner = share.session.userId === userId;
    const isSharedBy = share.sharedBy === userId;
    const canView = true; // All authenticated users can view
    // Can add notes if: owner OR (allowNotesAccess is true for the share)
    const canAddNotes = isOwner || share.allowNotesAccess;

    // Record access for non-owners
    if (!isOwner) {
      await this.recordAccess(share.id, userId);
    }

    return {
      session: share.session,
      canView,
      canAddNotes,
      sharedBy: share.sharedBy,
      expiresAt: share.expiresAt,
    };
  }

  /**
   * Get all shares created by user
   */
  async getUserShares(userId: string) {
    const shares = await this.prisma.sessionShare.findMany({
      where: { sharedBy: userId },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares;
  }

  /**
   * Delete a share link
   */
  async deleteShare(userId: string, shareId: string) {
    const share = await this.prisma.sessionShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Only creator can delete
    if (share.sharedBy !== userId) {
      throw new ForbiddenException('You can only delete your own shares');
    }

    await this.prisma.sessionShare.delete({
      where: { id: shareId },
    });

    return { message: 'Share deleted successfully' };
  }

  /**
   * Get all shares accessed by user (excluding expired and dismissed)
   */
  async getAccessedShares(userId: string) {
    const accesses = await this.prisma.sessionShareAccess.findMany({
      where: {
        userId,
        isDismissed: false,
        share: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      },
      include: {
        share: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                createdAt: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    return accesses.map(access => ({
      shareId: access.share.id,
      shareToken: access.share.shareToken,
      sessionId: access.share.session.id,
      sessionTitle: access.share.session.title,
      sessionCreatedAt: access.share.session.createdAt,
      ownerName: access.share.session.user
        ? `${access.share.session.user.firstName || ''} ${access.share.session.user.lastName || ''}`.trim() || access.share.session.user.email
        : 'Unknown',
      ownerId: access.share.session.userId,
      allowNotesAccess: access.share.allowNotesAccess,
      expiresAt: access.share.expiresAt,
      lastAccessedAt: access.lastAccessedAt,
    }));
  }

  /**
   * Dismiss/archive a share for a user
   */
  async dismissShare(userId: string, shareId: string) {
    const access = await this.prisma.sessionShareAccess.findUnique({
      where: {
        shareId_userId: {
          shareId,
          userId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    await this.prisma.sessionShareAccess.update({
      where: { id: access.id },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    return { message: 'Share dismissed successfully' };
  }

  /**
   * Generate a cryptographically secure random token
   */
  private generateShareToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
