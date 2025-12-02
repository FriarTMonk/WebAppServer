import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NoteService } from './note.service';
import {
  createPrismaMock,
  createSubscriptionServiceMock,
  createEmailServiceMock,
  createPermissionServiceMock,
  createUserFixture,
  createSessionFixture,
  createNoteFixture,
  createAssignmentFixture,
  createCoverageGrantFixture,
  createShareFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from './permission.service';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('NoteService', () => {
  let service: NoteService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let permissionMock: ReturnType<typeof createPermissionServiceMock>;
  let emailMock: ReturnType<typeof createEmailServiceMock>;
  let subscriptionMock: ReturnType<typeof createSubscriptionServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    permissionMock = createPermissionServiceMock();
    emailMock = createEmailServiceMock();
    subscriptionMock = createSubscriptionServiceMock(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoteService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PermissionService, useValue: permissionMock },
        { provide: EmailService, useValue: emailMock },
        { provide: SubscriptionService, useValue: subscriptionMock },
      ],
    }).compile();

    service = module.get<NoteService>(NoteService);
  });

  // ============================================================================
  // CREATE NOTE
  // ============================================================================

  describe('createNote', () => {
    const sessionId = 'session-1';
    const ownerId = 'user-1';
    const organizationId = 'org-1';
    const createNoteDto = { content: 'Test note', isPrivate: false };

    it('should allow session owner with subscription to create note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const author = createUserFixture({ id: ownerId, firstName: 'John', lastName: 'Doe' });
      const createdNote = createNoteFixture({
        sessionId,
        authorId: ownerId,
        content: createNoteDto.content,
        isPrivate: false,
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      const result = await service.createNote(sessionId, ownerId, organizationId, createNoteDto);

      expect(result).toEqual(createdNote);
      expect(prismaMock.sessionNote!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          authorId: ownerId,
          authorName: 'John Doe',
          authorRole: 'user',
          content: createNoteDto.content,
          isPrivate: false,
        }),
      });
    });

    it('should throw when session owner lacks subscription', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.createNote(sessionId, ownerId, organizationId, createNoteDto),
        ForbiddenException,
        'Session notes are only available to subscribed users'
      );
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createNote('non-existent', ownerId, organizationId, createNoteDto),
        NotFoundException,
        'Session not found'
      );
    });

    it('should allow user with write share access to create note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const share = createShareFixture({ sessionId, allowNotesAccess: true, sharedWith: 'user-2' });
      const author = createUserFixture({ id: 'user-2', firstName: 'Jane', lastName: 'Smith' });
      const createdNote = createNoteFixture({
        sessionId,
        authorId: 'user-2',
        content: createNoteDto.content,
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      const result = await service.createNote(sessionId, 'user-2', organizationId, createNoteDto);

      expect(result).toEqual(createdNote);
      expect(prismaMock.sessionShare!.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          sessionId,
          allowNotesAccess: true,
        }),
      });
    });

    it('should allow user with open share link (sharedWith: null) to create note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const share = createShareFixture({ sessionId, allowNotesAccess: true, sharedWith: null });
      const author = createUserFixture({ id: 'user-2' });
      const createdNote = createNoteFixture({ sessionId, authorId: 'user-2' });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      const result = await service.createNote(sessionId, 'user-2', organizationId, createNoteDto);

      expect(result).toBeDefined();
    });

    it('should throw when user has share without write access', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const share = createShareFixture({ sessionId, allowNotesAccess: false });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.createNote(sessionId, 'user-2', organizationId, createNoteDto),
        ForbiddenException,
        'Session notes are only available to subscribed users or via shared access with note permissions'
      );
    });

    it('should allow assigned counselor to create note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        organizationId,
        status: 'active',
      });
      const author = createUserFixture({ id: 'counselor-1', accountType: 'counselor' });
      const createdNote = createNoteFixture({
        sessionId,
        authorId: 'counselor-1',
        authorRole: 'counselor',
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      const result = await service.createNote(sessionId, 'counselor-1', organizationId, createNoteDto);

      expect(result.authorRole).toBe('counselor');
    });

    it('should allow coverage counselor to create public note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
        revokedAt: null,
      });
      const author = createUserFixture({ id: 'counselor-2' });
      const createdNote = createNoteFixture({
        sessionId,
        authorId: 'counselor-2',
        isPrivate: false,
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      const result = await service.createNote(sessionId, 'counselor-2', organizationId, createNoteDto);

      expect(result).toBeDefined();
    });

    it('should throw when coverage counselor tries to create private note', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
        revokedAt: null,
      });
      const author = createUserFixture({ id: 'counselor-2' });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      await expectToThrow(
        () => service.createNote(sessionId, 'counselor-2', organizationId, { content: 'Test', isPrivate: true }),
        ForbiddenException,
        'Coverage counselors cannot create private notes'
      );
    });

    it('should throw when author user does not exist', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createNote(sessionId, ownerId, organizationId, createNoteDto),
        NotFoundException,
        'User not found'
      );
    });

    it('should build author name from firstName and lastName', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const author = createUserFixture({ id: ownerId, firstName: 'John', lastName: 'Doe' });
      const createdNote = createNoteFixture({ authorName: 'John Doe' });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      await service.createNote(sessionId, ownerId, organizationId, createNoteDto);

      expect(prismaMock.sessionNote!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorName: 'John Doe',
        }),
      });
    });

    it('should use "Anonymous" when author has no name', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const author = createUserFixture({ id: ownerId, firstName: '', lastName: '' });
      const createdNote = createNoteFixture({ authorName: 'Anonymous' });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      await service.createNote(sessionId, ownerId, organizationId, createNoteDto);

      expect(prismaMock.sessionNote!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorName: 'Anonymous',
        }),
      });
    });

    it('should set isPrivate to false by default if not provided', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const author = createUserFixture({ id: ownerId });
      const createdNote = createNoteFixture({ isPrivate: false });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(author);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);

      await service.createNote(sessionId, ownerId, organizationId, { content: 'Test' });

      expect(prismaMock.sessionNote!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPrivate: false,
        }),
      });
    });
  });

  // ============================================================================
  // GET NOTES FOR SESSION
  // ============================================================================

  describe('getNotesForSession', () => {
    const sessionId = 'session-1';
    const ownerId = 'user-1';
    const organizationId = 'org-1';

    it('should return all notes for session owner with subscription', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const publicNote = createNoteFixture({ sessionId, isPrivate: false });
      // Private note created by the owner - owner can see their own private notes
      const privateNote = createNoteFixture({ sessionId, isPrivate: true, authorId: ownerId });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([publicNote, privateNote]);

      const result = await service.getNotesForSession(sessionId, ownerId, organizationId);

      expect(result).toHaveLength(2);
      expect(result).toContain(publicNote);
      expect(result).toContain(privateNote);
    });

    it('should throw when session owner lacks subscription', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.getNotesForSession(sessionId, ownerId, organizationId),
        ForbiddenException,
        'Session notes are only available to subscribed users'
      );
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getNotesForSession('non-existent', ownerId, organizationId),
        NotFoundException,
        'Session not found'
      );
    });

    it('should allow user with share access to view notes', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const share = createShareFixture({ sessionId, sharedWith: 'user-2' });
      const notes = [createNoteFixture({ sessionId, isPrivate: false })];

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue(notes);

      const result = await service.getNotesForSession(sessionId, 'user-2', organizationId);

      expect(result).toHaveLength(1);
    });

    it('should allow user with open share link to view notes', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      const share = createShareFixture({ sessionId, sharedWith: null });
      const notes = [createNoteFixture({ sessionId, isPrivate: false })];

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue(notes);

      const result = await service.getNotesForSession(sessionId, 'any-user', organizationId);

      expect(result).toHaveLength(1);
    });

    it('should throw when non-owner has no share and no subscription', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.getNotesForSession(sessionId, 'user-2', organizationId),
        ForbiddenException,
        'Session notes are only available to subscribed users or via shared access'
      );
    });

    it('should filter out private notes for coverage counselors', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
        revokedAt: null,
      });
      const publicNote = createNoteFixture({ sessionId, isPrivate: false });
      const privateNote = createNoteFixture({ sessionId, isPrivate: true, authorId: 'other-user' });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([publicNote, privateNote]);

      const result = await service.getNotesForSession(sessionId, 'counselor-2', organizationId);

      expect(result).toHaveLength(1);
      expect(result).toContain(publicNote);
      expect(result).not.toContain(privateNote);
    });

    it('should show private notes to note author', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const privateNote = createNoteFixture({
        sessionId,
        isPrivate: true,
        authorId: 'user-2',
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([privateNote]);

      const result = await service.getNotesForSession(sessionId, 'user-2', organizationId);

      expect(result).toHaveLength(1);
      expect(result).toContain(privateNote);
    });

    it('should show private counselor notes to member', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'member-1' });
      const privateNote = createNoteFixture({
        sessionId,
        isPrivate: true,
        authorId: 'counselor-1',
        authorRole: 'counselor',
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([privateNote]);

      const result = await service.getNotesForSession(sessionId, 'member-1', organizationId);

      expect(result).toHaveLength(1);
      expect(result).toContain(privateNote);
    });

    it('should return notes ordered by createdAt ascending', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      await service.getNotesForSession(sessionId, ownerId, organizationId);

      expect(prismaMock.sessionNote!.findMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should exclude deleted notes', async () => {
      const session = createSessionFixture({ id: sessionId, userId: ownerId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      await service.getNotesForSession(sessionId, ownerId, organizationId);

      expect(prismaMock.sessionNote!.findMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // ============================================================================
  // UPDATE NOTE
  // ============================================================================

  describe('updateNote', () => {
    const noteId = 'note-1';
    const authorId = 'user-1';
    const organizationId = 'org-1';

    it('should allow author to update their own note', async () => {
      const note = createNoteFixture({ id: noteId, authorId, content: 'Old content' });
      const updatedNote = createNoteFixture({ id: noteId, authorId, content: 'New content' });

      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue(updatedNote);

      const result = await service.updateNote(noteId, authorId, organizationId, {
        content: 'New content',
      });

      expect(result).toEqual(updatedNote);
      expect(prismaMock.sessionNote!.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          content: 'New content',
          isPrivate: note.isPrivate,
        },
      });
    });

    it('should throw when user tries to edit another user\'s note', async () => {
      const note = createNoteFixture({ id: noteId, authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expectToThrow(
        () => service.updateNote(noteId, 'user-2', organizationId, { content: 'New content' }),
        ForbiddenException,
        'You can only edit your own notes'
      );
    });

    it('should throw when note does not exist', async () => {
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.updateNote('non-existent', authorId, organizationId, { content: 'New content' }),
        NotFoundException,
        'Note not found'
      );
    });

    it('should allow making note private if user is assigned counselor', async () => {
      const note = createNoteFixture({ id: noteId, authorId, isPrivate: false, sessionId: 'session-1' });
      const noteWithSession = {
        ...note,
        session: { userId: 'member-1' },
      };
      const assignment = createAssignmentFixture({
        counselorId: authorId,
        memberId: 'member-1',
        organizationId,
        status: 'active',
      });
      const updatedNote = createNoteFixture({ id: noteId, authorId, isPrivate: true });

      prismaMock.sessionNote!.findUnique = jest.fn()
        .mockResolvedValueOnce(note)
        .mockResolvedValueOnce(noteWithSession);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue(updatedNote);

      const result = await service.updateNote(noteId, authorId, organizationId, {
        isPrivate: true,
      });

      expect(result.isPrivate).toBe(true);
    });

    it('should throw when non-assigned counselor tries to make note private', async () => {
      const note = createNoteFixture({ id: noteId, authorId, isPrivate: false, sessionId: 'session-1' });
      const noteWithSession = {
        ...note,
        session: { userId: 'member-1' },
      };

      prismaMock.sessionNote!.findUnique = jest.fn()
        .mockResolvedValueOnce(note)
        .mockResolvedValueOnce(noteWithSession);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.updateNote(noteId, authorId, organizationId, { isPrivate: true }),
        ForbiddenException,
        'Only assigned counselors can create private notes'
      );
    });

    it('should update content only when isPrivate is not provided', async () => {
      const note = createNoteFixture({ id: noteId, authorId, isPrivate: false });
      const updatedNote = createNoteFixture({ id: noteId, authorId, content: 'Updated', isPrivate: false });

      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue(updatedNote);

      await service.updateNote(noteId, authorId, organizationId, { content: 'Updated' });

      expect(prismaMock.sessionNote!.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          content: 'Updated',
          isPrivate: false,
        },
      });
    });

    it('should keep existing content when only updating isPrivate', async () => {
      const note = createNoteFixture({ id: noteId, authorId, content: 'Existing', isPrivate: false, sessionId: 'session-1' });
      const noteWithSession = {
        ...note,
        session: { userId: 'member-1' },
      };
      const assignment = createAssignmentFixture({
        counselorId: authorId,
        memberId: 'member-1',
        status: 'active',
      });

      prismaMock.sessionNote!.findUnique = jest.fn()
        .mockResolvedValueOnce(note)
        .mockResolvedValueOnce(noteWithSession);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue(note);

      await service.updateNote(noteId, authorId, organizationId, { isPrivate: true });

      expect(prismaMock.sessionNote!.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          content: 'Existing',
          isPrivate: true,
        },
      });
    });
  });

  // ============================================================================
  // DELETE NOTE
  // ============================================================================

  describe('deleteNote', () => {
    const noteId = 'note-1';
    const authorId = 'user-1';

    it('should allow author to delete their own note', async () => {
      const note = createNoteFixture({ id: noteId, authorId });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue({ ...note, deletedAt: new Date() });

      await service.deleteNote(noteId, authorId);

      expect(prismaMock.sessionNote!.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw when user tries to delete another user\'s note', async () => {
      const note = createNoteFixture({ id: noteId, authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expectToThrow(
        () => service.deleteNote(noteId, 'user-2'),
        ForbiddenException,
        'You can only delete your own notes'
      );
    });

    it('should throw when note does not exist', async () => {
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.deleteNote('non-existent', authorId),
        NotFoundException,
        'Note not found'
      );
    });

    it('should soft delete note by setting deletedAt timestamp', async () => {
      const note = createNoteFixture({ id: noteId, authorId });
      const deletedNote = { ...note, deletedAt: new Date() };
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);
      prismaMock.sessionNote!.update = jest.fn().mockResolvedValue(deletedNote);

      await service.deleteNote(noteId, authorId);

      expect(prismaMock.sessionNote!.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
