import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptureService } from '../scripture/scripture.service';
import { Session, Message, SessionNote, CounselorObservation, User, Organization } from '@prisma/client';

/**
 * Interface for scripture reference with full text
 */
interface ScriptureReference {
  reference: string;
  text: string;
}

/**
 * Interface for the export data structure
 */
interface SessionExportData {
  session: Session;
  messages: Message[];
  notes: SessionNote[];
  scriptureReferences: ScriptureReference[];
}

/**
 * Service for handling session export functionality
 * Provides comprehensive export data for PDF/print functionality
 */
@Injectable()
export class CounselExportService {
  private readonly logger = new Logger(CounselExportService.name);

  constructor(
    private prisma: PrismaService,
    private readonly scriptureService: ScriptureService,
  ) {}

  /**
   * Get comprehensive session data for export (PDF/print)
   *
   * @param sessionId - The ID of the session to export
   * @param userId - The ID of the user requesting the export
   * @param shareToken - Optional share token for accessing via share link
   * @returns Complete export data including session, messages, filtered notes, and scripture references
   * @throws NotFoundException if session doesn't exist
   * @throws ForbiddenException if user doesn't have access to the session
   */
  async getSessionForExport(
    sessionId: string,
    userId: string,
    shareToken?: string
  ): Promise<SessionExportData> {
    // 1. Fetch session with all messages
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
    });

    // 2. Verify session exists
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 3. Check export permissions (Phase 2: Share permission checking)
    const permissions = await this.checkExportPermissions(
      session,
      userId,
      shareToken
    );

    if (!permissions.canExport) {
      throw new ForbiddenException(permissions.reason || 'You do not have access to this session');
    }

    // 4. Fetch notes for the session (filtered based on permissions)
    const noteWhere: any = { sessionId };

    if (permissions.includeNotes) {
      // Full access: include all notes or only non-private ones + user's own
      noteWhere.OR = [
        { isPrivate: false },
        { authorId: userId }
      ];
    } else {
      // Restricted access: no notes at all
      noteWhere.id = 'none'; // This will match no notes
    }

    const notes = permissions.includeNotes
      ? await this.prisma.sessionNote.findMany({
          where: noteWhere,
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // Log access for audit trail
    this.logger.log(
      `Session ${sessionId} exported by user ${userId} ` +
      `(owner: ${session.userId === userId}, ` +
      `includeNotes: ${permissions.includeNotes}, ` +
      `shareToken: ${!!shareToken})`
    );

    // 5. Extract scripture references from messages
    const scriptureReferences = await this.extractScriptureReferences(session.messages);

    // 6. Return structured export data
    return {
      session,
      messages: session.messages,
      notes,
      scriptureReferences,
    };
  }

  /**
   * Extract scripture references from message content
   * Scans through all messages to find Bible verse patterns
   *
   * @param messages - Array of messages to scan
   * @returns Array of unique scripture references with text
   * @private
   */
  private async extractScriptureReferences(messages: Message[]): Promise<ScriptureReference[]> {
    const references = new Set<string>();

    // Regular expression to match Bible verse patterns
    // Matches patterns like: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1-3"
    // Multi-word books must start with a digit (e.g., "1 Corinthians", "2 Kings")
    const bibleVersePattern = /\b(\d\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?|[A-Z][a-z]+)\s(\d+):(\d+)(?:-(\d+))?/g;

    // Scan through all message contents
    messages.forEach(message => {
      // Use exec() in loop to find all matches with global regex
      let match;
      while ((match = bibleVersePattern.exec(message.content)) !== null) {
        // Full matched text is the reference
        references.add(match[0]);
      }

      // Also check scriptureReferences JSON field if it contains reference strings
      if (message.scriptureReferences && Array.isArray(message.scriptureReferences)) {
        message.scriptureReferences.forEach((ref: { reference?: string }) => {
          if (ref.reference) {
            references.add(ref.reference);
          }
        });
      }
    });

    // Fetch actual verse texts from local scripture database
    const results: ScriptureReference[] = [];

    for (const reference of references) {
      try {
        // Parse reference: "John 3:16" -> book="John", chapter=3, verse=16
        const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
        if (!match) {
          this.logger.warn(`Invalid scripture reference format: ${reference}`);
          results.push({ reference, text: 'Invalid reference format' });
          continue;
        }

        const [, book, chapterStr, verseStr] = match;
        const chapter = parseInt(chapterStr, 10);
        const verse = parseInt(verseStr, 10);

        // Fetch from local database (default to ESV translation)
        const scripture = await this.scriptureService.getScriptureByReference(
          book,
          chapter,
          verse,
          'ESV'
        );

        results.push({
          reference,
          text: scripture?.text || 'Verse not found'
        });
      } catch (error) {
        this.logger.error(`Error fetching verse ${reference}:`, error);
        results.push({ reference, text: 'Error loading verse' });
      }
    }

    return results;
  }

  /**
   * Check if user has permission to export a session
   * Implements Phase 2 share permission checking
   *
   * @param session - Full session object with owner info
   * @param requestingUserId - User making the request
   * @param shareToken - Optional share token for accessing via share link
   * @returns Permission result with canExport and includeNotes flags
   * @private
   */
  private async checkExportPermissions(
    session: any,
    requestingUserId: string,
    shareToken?: string,
  ): Promise<{ canExport: boolean; includeNotes: boolean; reason?: string }> {
    // Owner always has full access
    if (session.userId === requestingUserId) {
      return { canExport: true, includeNotes: true };
    }

    // Check if accessing via share token
    if (shareToken) {
      const share = await this.prisma.sessionShare.findFirst({
        where: {
          sessionId: session.id,
          shareToken: shareToken,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
      });

      if (!share) {
        return {
          canExport: false,
          includeNotes: false,
          reason: 'Invalid or expired share token',
        };
      }

      // Check if share is restricted to specific email
      if (share.sharedWith) {
        const requestingUser = await this.prisma.user.findUnique({
          where: { id: requestingUserId },
          select: { email: true },
        });

        if (!requestingUser || requestingUser.email !== share.sharedWith) {
          return {
            canExport: false,
            includeNotes: false,
            reason: 'This share link is restricted to a specific email address',
          };
        }
      }

      // Share token valid - respect allowNotesAccess flag
      return {
        canExport: true,
        includeNotes: share.allowNotesAccess,
      };
    }

    // Check organization-based access (counselor viewing client's session)
    const orgAccess = await this.prisma.counselorAssignment.findFirst({
      where: {
        memberId: session.userId, // Client
        counselorId: requestingUserId, // Counselor
        status: 'active',
      },
    });

    if (orgAccess) {
      // Counselors get full access to assigned clients
      return { canExport: true, includeNotes: true };
    }

    // No permission found
    return {
      canExport: false,
      includeNotes: false,
      reason: 'You do not have permission to export this session',
    };
  }

  /**
   * Get comprehensive member profile data for export (PDF/print)
   *
   * @param memberId - The ID of the member to export
   * @param counselorId - The ID of the counselor requesting the export
   * @param organizationId - The ID of the organization context
   * @returns Complete export data including member info, observations, and assignment details
   * @throws NotFoundException if member doesn't exist
   * @throws ForbiddenException if counselor doesn't have access to the member
   */
  async getMemberProfileForExport(
    memberId: string,
    counselorId: string,
    organizationId: string
  ) {
    // 1. Verify counselor assignment
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
      include: {
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
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
    });

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this member');
    }

    // 2. Fetch all observations for this member (non-deleted)
    const observations = await this.prisma.counselorObservation.findMany({
      where: {
        memberId,
        counselorId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch assignment history for this member in this organization
    const assignmentHistory = await this.prisma.counselorAssignment.findMany({
      where: {
        memberId,
        organizationId,
      },
      include: {
        counselor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { assignedAt: 'desc' },
      ],
    });

    // 4. Return structured export data
    return {
      member: assignment.member,
      counselor: assignment.counselor,
      organization: assignment.organization,
      assignment: {
        assignedAt: assignment.assignedAt,
        status: assignment.status,
      },
      observations,
      assignmentHistory: assignmentHistory.map(a => ({
        counselorName: `${a.counselor.firstName || ''} ${a.counselor.lastName || ''}`.trim() || a.counselor.email,
        status: a.status,
        assignedAt: a.assignedAt,
        endedAt: a.endedAt,
      })),
    };
  }
}
