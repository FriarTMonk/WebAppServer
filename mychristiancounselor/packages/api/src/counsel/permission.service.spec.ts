import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PermissionService } from './permission.service';
import {
  createPrismaMock,
  createSubscriptionServiceMock,
  createUserFixture,
  createSessionFixture,
  createNoteFixture,
  createAssignmentFixture,
  createCoverageGrantFixture,
  createShareFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let subscriptionMock: ReturnType<typeof createSubscriptionServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    subscriptionMock = createSubscriptionServiceMock(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SubscriptionService, useValue: subscriptionMock },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  // ============================================================================
  // ROLE CHECKS
  // ============================================================================

  describe('isSessionOwner', () => {
    it('should return true when user owns the session', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.isSessionOwner('user-1', session.id);

      expect(result).toBe(true);
    });

    it('should return false when user does not own the session', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.isSessionOwner('user-2', session.id);

      expect(result).toBe(false);
    });

    it('should return false when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.isSessionOwner('user-1', 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('isAssignedCounselor', () => {
    it('should return true when user is assigned counselor', async () => {
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        organizationId: 'org-1',
        status: 'active',
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);

      const result = await service.isAssignedCounselor('counselor-1', 'member-1', 'org-1');

      expect(result).toBe(true);
    });

    it('should return false when no assignment exists', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isAssignedCounselor('counselor-1', 'member-1', 'org-1');

      expect(result).toBe(false);
    });

    it('should return false when assignment is not active', async () => {
      // Service filters for status: 'active', so inactive assignments won't be found
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isAssignedCounselor('counselor-1', 'member-1', 'org-1');

      expect(result).toBe(false);
    });
  });

  describe('isCoverageCounselor', () => {
    it('should return true when user is coverage counselor but not assigned', async () => {
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
        revokedAt: null,
      });
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isCoverageCounselor('counselor-2', 'member-1');

      expect(result).toBe(true);
    });

    it('should return false when user is both assigned and has coverage (assigned takes precedence)', async () => {
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-1',
        memberId: 'member-1',
      });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);

      const result = await service.isCoverageCounselor('counselor-1', 'member-1');

      expect(result).toBe(false);
    });

    it('should return false when coverage grant is revoked', async () => {
      // Service filters for revokedAt: null, so revoked grants won't be found
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isCoverageCounselor('counselor-2', 'member-1');

      expect(result).toBe(false);
    });

    it('should return false when coverage grant has expired', async () => {
      // Service filters for expiresAt >= now, so expired grants won't be found
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isCoverageCounselor('counselor-2', 'member-1');

      expect(result).toBe(false);
    });

    it('should return false when no coverage grant exists', async () => {
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.isCoverageCounselor('counselor-2', 'member-1');

      expect(result).toBe(false);
    });
  });

  describe('getCounselorRole', () => {
    it('should return assigned role when user is assigned counselor', async () => {
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getCounselorRole('counselor-1', 'member-1', 'org-1');

      expect(result).toEqual({
        isAssigned: true,
        isCoverage: false,
        hasAccess: true,
        role: 'assigned',
      });
    });

    it('should return coverage role when user is coverage counselor but not assigned', async () => {
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      const result = await service.getCounselorRole('counselor-2', 'member-1', 'org-1');

      expect(result).toEqual({
        isAssigned: false,
        isCoverage: true,
        hasAccess: true,
        role: 'coverage',
      });
    });

    it('should return none role when user has no relationship with member', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getCounselorRole('counselor-1', 'member-1', 'org-1');

      expect(result).toEqual({
        isAssigned: false,
        isCoverage: false,
        hasAccess: false,
        role: 'none',
      });
    });

    it('should prioritize assigned over coverage when both exist', async () => {
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-1',
        memberId: 'member-1',
      });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      const result = await service.getCounselorRole('counselor-1', 'member-1', 'org-1');

      expect(result).toEqual({
        isAssigned: true,
        isCoverage: false,
        hasAccess: true,
        role: 'assigned',
      });
    });
  });

  // ============================================================================
  // SHARE ACCESS
  // ============================================================================

  describe('getShareAccess', () => {
    it('should return access when share exists for specific user', async () => {
      const share = createShareFixture({
        sessionId: 'session-1',
        sharedWith: 'user-2',
        allowNotesAccess: true,
        expiresAt: null,
      });
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      const result = await service.getShareAccess('user-2', 'session-1');

      expect(result).toEqual({
        hasAccess: true,
        allowNotesAccess: true,
        shareId: share.id,
      });
    });

    it('should return access when share is open to anyone', async () => {
      const share = createShareFixture({
        sessionId: 'session-1',
        sharedWith: null,
        allowNotesAccess: false,
        expiresAt: null,
      });
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      const result = await service.getShareAccess('any-user', 'session-1');

      expect(result).toEqual({
        hasAccess: true,
        allowNotesAccess: false,
        shareId: share.id,
      });
    });

    it('should return no access when share does not exist', async () => {
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getShareAccess('user-2', 'session-1');

      expect(result).toEqual({
        hasAccess: false,
        allowNotesAccess: false,
      });
    });

    it('should return no access when share has expired', async () => {
      // Service filters for expiresAt > now, so expired shares won't be found
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getShareAccess('user-2', 'session-1');

      expect(result).toEqual({
        hasAccess: false,
        allowNotesAccess: false,
      });
    });
  });

  describe('hasWriteShare', () => {
    it('should return true when user has share with write access', async () => {
      const share = createShareFixture({
        allowNotesAccess: true,
      });
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      const result = await service.hasWriteShare('user-2', 'session-1');

      expect(result).toBe(true);
    });

    it('should return false when user has share without write access', async () => {
      const share = createShareFixture({
        allowNotesAccess: false,
      });
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      const result = await service.hasWriteShare('user-2', 'session-1');

      expect(result).toBe(false);
    });

    it('should return false when user has no share', async () => {
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.hasWriteShare('user-2', 'session-1');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // NOTE PERMISSIONS
  // ============================================================================

  describe('canCreateNote', () => {
    it('should allow session owner with subscription to create note', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });

      await expect(
        service.canCreateNote('user-1', session.id, 'org-1', false)
      ).resolves.not.toThrow();
    });

    it('should throw when session owner lacks subscription', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.canCreateNote('user-1', session.id, 'org-1', false),
        ForbiddenException,
        'Session notes are only available to subscribed users'
      );
    });

    it('should allow user with write share access to create note', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      const share = createShareFixture({ allowNotesAccess: true });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      await expect(
        service.canCreateNote('user-2', session.id, 'org-1', false)
      ).resolves.not.toThrow();
    });

    it('should allow assigned counselor to create note', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.canCreateNote('counselor-1', session.id, 'org-1', false)
      ).resolves.not.toThrow();
    });

    it('should throw when coverage counselor tries to create private note', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      await expectToThrow(
        () => service.canCreateNote('counselor-2', session.id, 'org-1', true),
        ForbiddenException,
        'Coverage counselors cannot create private notes'
      );
    });

    it('should allow coverage counselor to create public note', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      await expect(
        service.canCreateNote('counselor-2', session.id, 'org-1', false)
      ).resolves.not.toThrow();
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.canCreateNote('user-1', 'non-existent', 'org-1', false),
        ForbiddenException,
        'Session not found'
      );
    });
  });

  describe('canAccessNotes', () => {
    it('should allow session owner with subscription to access notes', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: true,
      });

      await expect(
        service.canAccessNotes('user-1', session.id, 'org-1')
      ).resolves.not.toThrow();
    });

    it('should allow user with share access to view notes', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      const share = createShareFixture({ allowNotesAccess: false });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      await expect(
        service.canAccessNotes('user-2', session.id, 'org-1')
      ).resolves.not.toThrow();
    });

    it('should allow counselor to access notes', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.canAccessNotes('counselor-1', session.id, 'org-1')
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks access', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);
      subscriptionMock.getSubscriptionStatus = jest.fn().mockResolvedValue({
        hasHistoryAccess: false,
      });

      await expectToThrow(
        () => service.canAccessNotes('user-2', session.id, 'org-1'),
        ForbiddenException,
        'Session notes are only available to subscribed users or via shared access'
      );
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.canAccessNotes('user-1', 'non-existent', 'org-1'),
        ForbiddenException,
        'Session not found'
      );
    });
  });

  describe('canViewNote', () => {
    it('should allow anyone to view public notes', async () => {
      const note = createNoteFixture({ isPrivate: false });

      const result = await service.canViewNote('any-user', note, 'session-1', 'org-1');

      expect(result).toBe(true);
    });

    it('should allow note author to view their own private note', async () => {
      const note = createNoteFixture({ authorId: 'user-1', isPrivate: true });

      const result = await service.canViewNote('user-1', note, 'session-1', 'org-1');

      expect(result).toBe(true);
    });

    it('should allow member to view private counselor notes in their session', async () => {
      const note = createNoteFixture({
        authorId: 'counselor-1',
        authorRole: 'counselor',
        isPrivate: true,
      });
      const session = createSessionFixture({ userId: 'member-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.canViewNote('member-1', note, session.id, 'org-1');

      expect(result).toBe(true);
    });

    it('should allow assigned counselor to view private notes', async () => {
      const note = createNoteFixture({ authorId: 'other-user', isPrivate: true });
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.canViewNote('counselor-1', note, session.id, 'org-1');

      expect(result).toBe(true);
    });

    it('should not allow coverage counselor to view private notes', async () => {
      const note = createNoteFixture({ authorId: 'other-user', isPrivate: true });
      const session = createSessionFixture({ userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      const result = await service.canViewNote('counselor-2', note, session.id, 'org-1');

      expect(result).toBe(false);
    });

    it('should return false when session does not exist', async () => {
      const note = createNoteFixture({ isPrivate: true });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.canViewNote('user-1', note, 'non-existent', 'org-1');

      expect(result).toBe(false);
    });
  });

  describe('canEditNote', () => {
    it('should allow user to edit their own note', async () => {
      const note = createNoteFixture({ authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expect(
        service.canEditNote('user-1', note.id)
      ).resolves.not.toThrow();
    });

    it('should throw when user tries to edit another user\'s note', async () => {
      const note = createNoteFixture({ authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expectToThrow(
        () => service.canEditNote('user-2', note.id),
        ForbiddenException,
        'You can only edit your own notes'
      );
    });

    it('should throw when note does not exist', async () => {
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.canEditNote('user-1', 'non-existent'),
        ForbiddenException,
        'Note not found'
      );
    });
  });

  describe('canDeleteNote', () => {
    it('should allow user to delete their own note', async () => {
      const note = createNoteFixture({ authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expect(
        service.canDeleteNote('user-1', note.id)
      ).resolves.not.toThrow();
    });

    it('should throw when user tries to delete another user\'s note', async () => {
      const note = createNoteFixture({ authorId: 'user-1' });
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(note);

      await expectToThrow(
        () => service.canDeleteNote('user-2', note.id),
        ForbiddenException,
        'You can only delete your own notes'
      );
    });

    it('should throw when note does not exist', async () => {
      prismaMock.sessionNote!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.canDeleteNote('user-1', 'non-existent'),
        ForbiddenException,
        'Note not found'
      );
    });
  });

  describe('canMakeNotePrivate', () => {
    it('should allow session owner to make note private', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.canMakeNotePrivate('member-1', session.id, 'org-1');

      expect(result).toBe(true);
    });

    it('should allow assigned counselor to make note private', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.canMakeNotePrivate('counselor-1', session.id, 'org-1');

      expect(result).toBe(true);
    });

    it('should not allow coverage counselor to make note private', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const coverageGrant = createCoverageGrantFixture({
        backupCounselorId: 'counselor-2',
        memberId: 'member-1',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(coverageGrant);

      const result = await service.canMakeNotePrivate('counselor-2', session.id, 'org-1');

      expect(result).toBe(false);
    });

    it('should allow when session has no userId', async () => {
      const session = createSessionFixture({ userId: null });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.canMakeNotePrivate('any-user', session.id, 'org-1');

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // SESSION PERMISSIONS
  // ============================================================================

  describe('canAccessSession', () => {
    it('should allow session owner to access session', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.canAccessSession('user-1', session.id);

      expect(result).toBe(true);
    });

    it('should allow user with share access to access session', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      const share = createShareFixture();
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(share);

      const result = await service.canAccessSession('user-2', session.id);

      expect(result).toBe(true);
    });

    it('should allow counselor to access session', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.canAccessSession('counselor-1', session.id);

      expect(result).toBe(true);
    });

    it('should return false when user has no access', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.canAccessSession('user-2', session.id);

      expect(result).toBe(false);
    });

    it('should return false when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.canAccessSession('user-1', 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('determineAuthorRole', () => {
    it('should return "user" for session owner', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.determineAuthorRole('user-1', session.id, 'org-1');

      expect(result).toBe('user');
    });

    it('should return "counselor" for counselor', async () => {
      const session = createSessionFixture({ userId: 'member-1' });
      const assignment = createAssignmentFixture({
        counselorId: 'counselor-1',
        memberId: 'member-1',
        status: 'active',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.determineAuthorRole('counselor-1', session.id, 'org-1');

      expect(result).toBe('counselor');
    });

    it('should return "viewer" for non-owner non-counselor', async () => {
      const session = createSessionFixture({ userId: 'user-1' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorCoverageGrant!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.determineAuthorRole('user-2', session.id, 'org-1');

      expect(result).toBe('viewer');
    });

    it('should return "viewer" when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.determineAuthorRole('user-1', 'non-existent', 'org-1');

      expect(result).toBe('viewer');
    });
  });
});
