import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { TranslationService } from '../scripture/translation.service';
import { EmailService } from '../email/email.service';
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

    // 3. Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
      });
    }

    // 6. Extract theological themes from the question
    const themes = await this.aiService.extractTheologicalThemes(message);

    // Only create/save sessions for subscribed users
    const canSaveSession = subscriptionStatus.hasHistoryAccess;

    if (!session && canSaveSession) {
      // Create new session with title from first message
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);

      session = await this.prisma.session.create({
        data: {
          id: randomUUID(),
          userId: userId!, // Only subscribed users reach here
          title,
          topics: JSON.stringify(themes), // Store theological topics
          status: 'active',
          preferredTranslation: validTranslation,
        },
        include: { messages: true },
      });
    } else if (session && preferredTranslation && preferredTranslation !== session.preferredTranslation) {
      // Update session translation preference if it changed
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: { preferredTranslation: validTranslation },
        include: { messages: true },
      });
    }

    // For non-subscribed users without a session, create a temporary session object for conversation flow
    if (!session) {
      const validTranslation = await this.translationService.validateTranslation(preferredTranslation);
      session = {
        id: sessionId || randomUUID(),
        userId: userId || null,
        title: '',
        topics: JSON.stringify(themes),
        status: 'active' as const,
        preferredTranslation: validTranslation,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 4. Store user message (only for subscribed users)
    if (canSaveSession) {
      await this.prisma.message.create({
        data: {
          id: randomUUID(),
          sessionId: session.id,
          role: 'user',
          content: message,
          scriptureReferences: [],
          timestamp: new Date(),
        },
      });
    }

    // 5. Count clarifying questions so far
    const clarificationCount = session.messages.filter(
      (m) => m.role === 'assistant' && m.isClarifyingQuestion === true
    ).length;

    // 6. Retrieve relevant scriptures with themes (single translation or multiple for comparison)
    let scriptures;
    if (comparisonMode && comparisonTranslations && comparisonTranslations.length > 0) {
      // Fetch same verses in multiple translations for proper comparison (with themes)
      scriptures = await this.scriptureService.retrieveSameVersesInMultipleTranslationsWithThemes(
        themes,
        comparisonTranslations,
        3
      );
    } else {
      // Single translation mode (with themes)
      scriptures = await this.scriptureService.retrieveRelevantScripturesWithThemes(
        themes,
        session.preferredTranslation,
        3
      );
    }

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

    // 10. Extract scripture references from AI response and get related verses
    const extractedRefs = this.aiService.extractScriptureReferences(
      aiResponse.content
    );

    const versesForResponse: ScriptureReference[] = [];

    // For each extracted reference, get the verse and 2-3 related verses
    for (const ref of extractedRefs) {
      try {
        // Get the specific verse mentioned by the AI
        const mainVerse = await this.scriptureService.getScriptureByReference(
          ref.book,
          ref.chapter,
          ref.verse,
          session.preferredTranslation
        );

        if (mainVerse) {
          // Tag as AI-cited
          versesForResponse.push({ ...mainVerse, source: 'ai-cited' as const });

          // Get related verses (nearby context)
          const relatedVerses = await this.scriptureService.getRelatedVerses(
            ref.book,
            ref.chapter,
            ref.verse,
            session.preferredTranslation,
            2 // Get 2 related verses for each referenced verse
          );

          // Tag related verses
          versesForResponse.push(...relatedVerses.map(v => ({ ...v, source: 'related' as const })));
        }
      } catch (error) {
        // If a specific reference can't be found, continue with others
        this.logger.warn(`Could not fetch verse ${ref.book} ${ref.chapter}:${ref.verse}`, error);
      }
    }

    // If no verses were extracted from AI response, fall back to theme-based scriptures
    const finalScriptures = versesForResponse.length > 0
      ? versesForResponse
      : scriptures.map(s => ({ ...s, source: 'theme' as const }));

    // 11. Store assistant message (only for subscribed users)
    let assistantMessage;
    if (canSaveSession) {
      assistantMessage = await this.prisma.message.create({
        data: {
          id: randomUUID(),
          sessionId: session.id,
          role: 'assistant',
          content: aiResponse.content,
          scriptureReferences: JSON.parse(JSON.stringify(finalScriptures)),
          isClarifyingQuestion: aiResponse.requiresClarification,
          timestamp: new Date(),
        },
      });
    } else {
      // For non-subscribed users, create a temporary message object
      assistantMessage = {
        id: randomUUID(),
        sessionId: session.id,
        role: 'assistant' as const,
        content: aiResponse.content,
        scriptureReferences: JSON.parse(JSON.stringify(finalScriptures)),
        isClarifyingQuestion: aiResponse.requiresClarification,
        timestamp: new Date(),
      };
    }

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
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
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
      console.error('Failed to send note added notifications:', err);
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
