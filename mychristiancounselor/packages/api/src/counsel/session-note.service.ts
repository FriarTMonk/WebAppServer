import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionNoteDto } from './dto/create-session-note.dto';
import { UpdateSessionNoteDto } from './dto/update-session-note.dto';

@Injectable()
export class SessionNoteService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a session note
   * Assigned counselors can create private notes, coverage counselors cannot
   */
  async createSessionNote(
    userId: string,
    userName: string,
    organizationId: string,
    dto: CreateSessionNoteDto,
  ) {
    // Get session to find member
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      select: { userId: true },
    });

    if (!session || !session.userId) {
      throw new NotFoundException('Session not found');
    }

    const memberId = session.userId;

    // Check if user is assigned counselor or coverage counselor
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
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    const isAssignedCounselor = !!assignment;
    const isCoverageCounselor = !!coverageGrant && !isAssignedCounselor;

    // Coverage counselors cannot create private notes
    if (dto.isPrivate && isCoverageCounselor) {
      throw new ForbiddenException('Coverage counselors cannot create private notes');
    }

    // Determine author role
    let authorRole = 'viewer';
    if (isAssignedCounselor) {
      authorRole = 'counselor';
    } else if (memberId === userId) {
      authorRole = 'user';
    }

    return this.prisma.sessionNote.create({
      data: {
        sessionId: dto.sessionId,
        authorId: userId,
        authorName: userName,
        authorRole,
        content: dto.content,
        isPrivate: dto.isPrivate || false,
      },
    });
  }

  /**
   * Get session notes
   * Coverage counselors cannot see private notes
   */
  async getSessionNotes(
    userId: string,
    sessionId: string,
    organizationId: string,
  ) {
    // Get session to find member
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || !session.userId) {
      throw new NotFoundException('Session not found');
    }

    const memberId = session.userId;

    // Check counselor type
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
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    const isAssignedCounselor = !!assignment;
    const isCoverageCounselor = !!coverageGrant && !isAssignedCounselor;

    // Coverage counselors cannot see private notes
    const whereClause: any = { sessionId };
    if (isCoverageCounselor) {
      whereClause.isPrivate = false;
    }

    return this.prisma.sessionNote.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update session note
   * Only author can update, coverage counselors cannot make notes private
   */
  async updateSessionNote(
    userId: string,
    noteId: string,
    organizationId: string,
    dto: UpdateSessionNoteDto,
  ) {
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
      include: { session: { select: { userId: true } } },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the note author can update it');
    }

    // If making private, verify user is assigned counselor
    if (dto.isPrivate && !note.isPrivate) {
      const memberId = note.session.userId;
      if (!memberId) {
        throw new ForbiddenException('Cannot make note private for anonymous session');
      }

      const assignment = await this.prisma.counselorAssignment.findFirst({
        where: {
          counselorId: userId,
          memberId,
          organizationId,
          status: 'active',
        },
      });

      if (!assignment) {
        throw new ForbiddenException('Only assigned counselors can create private notes');
      }
    }

    return this.prisma.sessionNote.update({
      where: { id: noteId },
      data: dto,
    });
  }

  /**
   * Delete session note
   * Only author can delete
   */
  async deleteSessionNote(userId: string, noteId: string) {
    const note = await this.prisma.sessionNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the note author can delete it');
    }

    await this.prisma.sessionNote.delete({
      where: { id: noteId },
    });

    return { success: true };
  }
}
