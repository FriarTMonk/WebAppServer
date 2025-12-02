import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { TranslationService } from '../scripture/translation.service';
import { EmailService } from '../email/email.service';
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
import { CounselResponse, BibleTranslation, ScriptureReference } from '@mychristiancounselor/shared';
import { randomUUID } from 'crypto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class CounselService {
  private readonly logger = new Logger(CounselService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,
    private safetyService: SafetyService,
    private subscriptionService: SubscriptionService,
    private translationService: TranslationService,
    private emailService: EmailService,
    // Extracted services for refactored responsibilities
    private scriptureEnrichment: ScriptureEnrichmentService,
    private sessionService: SessionService,
  ) {}

  async processQuestion(
    message: string,
    sessionId?: string,
    preferredTranslation?: BibleTranslation,
    comparisonMode?: boolean,
    comparisonTranslations?: BibleTranslation[],
    userId?: string
  ): Promise<CounselResponse> {
    // 0. Get subscription status and user information
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(userId);
    const maxClarifyingQuestions = subscriptionStatus.maxClarifyingQuestions;

    let userName: string | undefined;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true },
      });
      userName = user?.firstName || undefined;
    }

    // 1. Check for crisis using AI-powered contextual detection
    const isCrisis = await this.aiService.detectCrisisContextual(message);

    if (isCrisis) {
      return {
        sessionId: sessionId || randomUUID(),
        message: {
          id: randomUUID(),
          sessionId: sessionId || '',
          role: 'system',
          content: this.safetyService.generateCrisisResponse(),
          scriptureReferences: [],
          timestamp: new Date(),
        },
        requiresClarification: false,
        isCrisisDetected: true,
        crisisResources: this.safetyService.getCrisisResources(),
      };
    }

    // 2. Check for grief using AI-powered contextual detection - flag but continue with normal flow
    const isGrief = await this.aiService.detectGriefContextual(message);

    // 3. Extract theological themes from the question
    const themes = await this.aiService.extractTheologicalThemes(message);

    // 4. Get or create session using SessionService
    const canSaveSession = subscriptionStatus.hasHistoryAccess;
    const session = await this.sessionService.getOrCreateSession(
      sessionId,
      userId || null,
      canSaveSession,
      message,
      themes,
      preferredTranslation || 'KJV'
    );

    // 5. Store user message using SessionService
    await this.sessionService.createUserMessage(session.id, message, canSaveSession);

    // 6. Count clarifying questions using SessionService
    const clarificationCount = this.sessionService.countClarifyingQuestions(session);

    // 7. Retrieve relevant scriptures using ScriptureEnrichmentService
    const scriptures = await this.scriptureEnrichment.retrieveScripturesByThemes(
      themes,
      session.preferredTranslation,
      comparisonMode,
      comparisonTranslations,
      3
    );

    // 8. Build conversation history
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 9. Generate AI response
    const aiResponse = await this.aiService.generateResponse(
      message,
      scriptures,
      conversationHistory,
      clarificationCount,
      maxClarifyingQuestions
    );

    // 10. Enrich response with scripture references using ScriptureEnrichmentService
    const finalScriptures = await this.scriptureEnrichment.enrichResponseWithScriptures(
      aiResponse.content,
      session.preferredTranslation,
      scriptures
    );

    // 11. Store assistant message using SessionService
    const assistantMessage = await this.sessionService.createAssistantMessage(
      session.id,
      aiResponse.content,
      JSON.parse(JSON.stringify(finalScriptures)),
      aiResponse.requiresClarification,
      canSaveSession
    );

    // 12. Calculate current question count AFTER this response
    // Count all assistant messages that were clarifying questions (requiresClarification: true)
    // Since we just added the new message, if it's a clarifying question, it will be included
    const updatedQuestionCount = clarificationCount + (aiResponse.requiresClarification ? 1 : 0);

    // 13. Return response with grief detection flag and question count
    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: finalScriptures,
        timestamp: assistantMessage.timestamp,
      },
      requiresClarification: aiResponse.requiresClarification,
      isCrisisDetected: false,
      isGriefDetected: isGrief,
      griefResources: isGrief ? this.safetyService.getGriefResources() : undefined,
      currentSessionQuestionCount: updatedQuestionCount,
    };
  }

  async getSession(sessionId: string) {
    return this.sessionService.getSession(sessionId);
  }

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
