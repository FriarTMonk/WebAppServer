import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionShare } from '@mcc/db';
import { CounselSession } from '@mcc/db';
import { User } from '@mcc/db';
import { CreateShareDto } from './dto/create-share.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionShareService {
  constructor(
    @InjectRepository(SessionShare)
    private sessionShareRepository: Repository<SessionShare>,
    @InjectRepository(CounselSession)
    private sessionRepository: Repository<CounselSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a shareable link for a session
   * Verifies user has subscription and owns the session
   */
  async createShare(
    sessionId: string,
    userId: string,
    createShareDto: CreateShareDto,
  ): Promise<{ shareToken: string; shareUrl: string }> {
    // Load user with subscription info
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['subscription'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check subscription status
    if (!user.subscription || user.subscription.status !== 'active') {
      throw new ForbiddenException('Active subscription required to share sessions');
    }

    // Load session and verify ownership
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user.id !== userId) {
      throw new ForbiddenException('You can only share your own sessions');
    }

    // Generate unique share token
    const shareToken = randomBytes(32).toString('hex');

    // Create share record
    const share = this.sessionShareRepository.create({
      session,
      shareToken,
      sharedBy: user,
      sharedWith: createShareDto.sharedWith,
      organizationId: createShareDto.organizationId,
      expiresAt: createShareDto.expiresAt,
    });

    await this.sessionShareRepository.save(share);

    // Generate share URL (frontend will handle routing)
    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

    return { shareToken, shareUrl };
  }

  /**
   * Get a shared session by token (public access)
   * Returns read-only session data if share is valid
   */
  async getSharedSession(shareToken: string): Promise<{
    session: CounselSession;
    sharedBy: { id: string; email: string };
    expiresAt?: Date;
  }> {
    const share = await this.sessionShareRepository.findOne({
      where: { shareToken },
      relations: ['session', 'session.conversations', 'sharedBy'],
    });

    if (!share) {
      throw new NotFoundException('Share link not found or has been revoked');
    }

    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new ForbiddenException('Share link has expired');
    }

    return {
      session: share.session,
      sharedBy: {
        id: share.sharedBy.id,
        email: share.sharedBy.email,
      },
      expiresAt: share.expiresAt,
    };
  }

  /**
   * List all shares for a specific session
   */
  async listShares(sessionId: string, userId: string): Promise<SessionShare[]> {
    // Verify session ownership
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user.id !== userId) {
      throw new ForbiddenException('You can only view shares for your own sessions');
    }

    return this.sessionShareRepository.find({
      where: { session: { id: sessionId } },
      relations: ['sharedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke a share link
   */
  async revokeShare(shareId: string, userId: string): Promise<void> {
    const share = await this.sessionShareRepository.findOne({
      where: { id: shareId },
      relations: ['sharedBy', 'session', 'session.user'],
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Only the share creator or session owner can revoke
    if (share.sharedBy.id !== userId && share.session.user.id !== userId) {
      throw new ForbiddenException('You can only revoke your own shares');
    }

    await this.sessionShareRepository.remove(share);
  }
}
