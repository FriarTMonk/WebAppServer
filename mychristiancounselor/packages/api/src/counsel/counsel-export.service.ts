import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Session, Message, SessionNote } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive session data for export (PDF/print)
   *
   * @param sessionId - The ID of the session to export
   * @param userId - The ID of the user requesting the export
   * @returns Complete export data including session, messages, filtered notes, and scripture references
   * @throws NotFoundException if session doesn't exist
   * @throws ForbiddenException if user doesn't have access to the session
   */
  async getSessionForExport(
    sessionId: string,
    userId: string
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

    // 3. Verify user has access to the session
    // Phase 1: Only session owner can export. TODO: Add share permission checking in Phase 2
    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    // 4. Fetch notes for the session (filtered at database level)
    const notes = await this.prisma.sessionNote.findMany({
      where: {
        sessionId,
        OR: [
          { isPrivate: false },
          { authorId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
    });

    // 5. Extract scripture references from messages
    const scriptureReferences = this.extractScriptureReferences(session.messages);

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
  private extractScriptureReferences(messages: Message[]): ScriptureReference[] {
    const references = new Set<string>();

    // Regular expression to match Bible verse patterns
    // Matches patterns like: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1-3"
    const bibleVersePattern = /\b(\d\s)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(\d+):(\d+)(?:-(\d+))?/g;

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

    // Convert to array and create placeholder text for each reference
    // TODO: Integrate with Bible API to fetch actual verse text
    return Array.from(references).map(reference => ({
      reference,
      text: `Full text for ${reference} will be fetched from Bible API`,
    }));
  }
}
