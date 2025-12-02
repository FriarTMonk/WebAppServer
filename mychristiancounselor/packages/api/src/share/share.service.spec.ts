import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ShareService } from './share.service';
import {
  createPrismaMock,
  createEmailServiceMock,
  createConfigServiceMock,
  createUserFixture,
  createSessionFixture,
  createShareFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

describe('ShareService', () => {
  let service: ShareService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let emailMock: ReturnType<typeof createEmailServiceMock>;
  let configMock: ReturnType<typeof createConfigServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    emailMock = createEmailServiceMock();
    configMock = createConfigServiceMock({ WEB_APP_URL: 'http://localhost:3699' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
  });

  // ============================================================================
  // CREATE SHARE
  // ============================================================================

  describe('createShare', () => {
    const userId = 'user-1';
    const sessionId = 'session-1';

    it('should create share successfully', async () => {
      const session = createSessionFixture({
        id: sessionId,
        userId,
        title: 'Test Session',
        user: createUserFixture({ id: userId, firstName: 'John', lastName: 'Doe' }),
      });

      const shareDto = {
        sessionId,
        expiresInDays: 7,
        allowNotesAccess: true,
      };

      const createdShare = createShareFixture({
        sessionId,
        sharedBy: userId,
        shareToken: 'mock-token-123',
        allowNotesAccess: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.create = jest.fn().mockResolvedValue(createdShare);

      const result = await service.createShare(userId, shareDto);

      expect(result.share).toEqual(createdShare);
      expect(result.shareUrl).toContain('/shared/');
      expect(prismaMock.sessionShare!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          sharedBy: userId,
          allowNotesAccess: true,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createShare(userId, { sessionId: 'non-existent' }),
        NotFoundException,
        'Session not found'
      );
    });

    it('should throw when user does not own session', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'other-user' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      await expectToThrow(
        () => service.createShare(userId, { sessionId }),
        ForbiddenException,
        'You can only share your own conversations'
      );
    });

    it('should create share with specific recipient', async () => {
      const session = createSessionFixture({
        id: sessionId,
        userId,
        user: createUserFixture({ id: userId }),
      });

      const recipient = createUserFixture({
        id: 'recipient-1',
        email: 'recipient@test.com',
        emailVerified: true,
      });

      const shareDto = {
        sessionId,
        sharedWith: 'recipient@test.com',
        allowNotesAccess: false,
      };

      const createdShare = createShareFixture({
        sessionId,
        sharedBy: userId,
        sharedWith: 'recipient@test.com',
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.user!.findUnique = jest.fn()
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(recipient);
      prismaMock.sessionShare!.create = jest.fn().mockResolvedValue(createdShare);

      await service.createShare(userId, shareDto);

      expect(prismaMock.sessionShare!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sharedWith: 'recipient@test.com',
        }),
      });
    });

    it('should throw when recipient is not registered', async () => {
      const session = createSessionFixture({ id: sessionId, userId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createShare(userId, {
          sessionId,
          sharedWith: 'unregistered@test.com',
        }),
        BadRequestException,
        'This person is not registered yet. Please invite them to register first.'
      );
    });

    it('should throw when recipient email is not verified', async () => {
      const session = createSessionFixture({ id: sessionId, userId });
      const recipient = createUserFixture({
        email: 'unverified@test.com',
        emailVerified: false,
      });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(recipient);

      await expectToThrow(
        () => service.createShare(userId, {
          sessionId,
          sharedWith: 'unverified@test.com',
        }),
        BadRequestException,
        'This user has not verified their email yet. Please ask them to verify their email first.'
      );
    });

    it('should send email notification to recipient', async () => {
      const session = createSessionFixture({
        id: sessionId,
        userId,
        title: 'Test Session',
        topics: ['faith', 'prayer'],
        user: createUserFixture({ id: userId, firstName: 'John', lastName: 'User', email: 'john@test.com' }),
      });

      const recipient = createUserFixture({
        id: 'recipient-1',
        email: 'recipient@test.com',
        firstName: 'Jane',
        emailVerified: true,
      });

      const shareDto = {
        sessionId,
        sharedWith: 'recipient@test.com',
      };

      const createdShare = createShareFixture({ sessionId, sharedBy: userId });

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.user!.findUnique = jest.fn()
        .mockResolvedValueOnce(recipient)
        .mockResolvedValueOnce(recipient);
      prismaMock.sessionShare!.create = jest.fn().mockResolvedValue(createdShare);

      await service.createShare(userId, shareDto);

      expect(emailMock.sendSessionShareEmail).toHaveBeenCalledWith(
        'recipient@test.com',
        expect.objectContaining({
          recipientName: 'Jane',
          senderName: 'John User',
          sessionTitle: 'Test Session',
          sessionTopics: ['faith', 'prayer'],
        }),
        recipient.id
      );
    });

    it('should create share without expiration when expiresInDays not provided', async () => {
      const session = createSessionFixture({ id: sessionId, userId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.create = jest.fn().mockResolvedValue(createShareFixture());

      await service.createShare(userId, { sessionId });

      expect(prismaMock.sessionShare!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: null,
        }),
      });
    });

    it('should set allowNotesAccess to false by default', async () => {
      const session = createSessionFixture({ id: sessionId, userId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionShare!.create = jest.fn().mockResolvedValue(createShareFixture());

      await service.createShare(userId, { sessionId });

      expect(prismaMock.sessionShare!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allowNotesAccess: false,
        }),
      });
    });
  });

  // ============================================================================
  // RECORD ACCESS
  // ============================================================================

  describe('recordAccess', () => {
    const shareId = 'share-1';
    const userId = 'user-1';

    it('should create new access record when none exists', async () => {
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.sessionShareAccess!.create = jest.fn().mockResolvedValue({
        id: 'access-1',
        shareId,
        userId,
        lastAccessedAt: new Date(),
      });

      await service.recordAccess(shareId, userId);

      expect(prismaMock.sessionShareAccess!.create).toHaveBeenCalledWith({
        data: {
          shareId,
          userId,
        },
      });
    });

    it('should update last accessed time when access record exists', async () => {
      const existingAccess = {
        id: 'access-1',
        shareId,
        userId,
        lastAccessedAt: new Date('2025-01-01'),
      };

      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(existingAccess);
      prismaMock.sessionShareAccess!.update = jest.fn().mockResolvedValue({
        ...existingAccess,
        lastAccessedAt: new Date(),
      });

      await service.recordAccess(shareId, userId);

      expect(prismaMock.sessionShareAccess!.update).toHaveBeenCalledWith({
        where: { id: existingAccess.id },
        data: { lastAccessedAt: expect.any(Date) },
      });
    });
  });

  // ============================================================================
  // VALIDATE SHARE
  // ============================================================================

  describe('validateShare', () => {
    const shareToken = 'valid-token-123';
    const userId = 'user-1';

    it('should validate share and return session with permissions', async () => {
      const session = createSessionFixture({ id: 'session-1', userId: 'owner-1' });
      const share = {
        ...createShareFixture({ shareToken, sessionId: session.id }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.sessionShareAccess!.create = jest.fn().mockResolvedValue({});

      const result = await service.validateShare(shareToken, userId);

      expect(result.session).toEqual(session);
      expect(result.canView).toBe(true);
    });

    it('should throw when share does not exist', async () => {
      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.validateShare('invalid-token', userId),
        NotFoundException,
        'Share link not found or expired'
      );
    });

    it('should throw when share has expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const share = {
        ...createShareFixture({ shareToken, expiresAt: yesterday }),
        session: createSessionFixture(),
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);

      await expectToThrow(
        () => service.validateShare(shareToken, userId),
        ForbiddenException,
        'Share link has expired'
      );
    });

    it('should throw when share is restricted to different user', async () => {
      const share = {
        ...createShareFixture({ shareToken, sharedWith: 'other-user@test.com' }),
        session: createSessionFixture(),
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);

      await expectToThrow(
        () => service.validateShare(shareToken, 'different-user@test.com'),
        ForbiddenException,
        'This share link is not for you'
      );
    });

    it('should allow owner to add notes regardless of allowNotesAccess', async () => {
      const ownerId = 'owner-1';
      const session = createSessionFixture({ id: 'session-1', userId: ownerId });
      const share = {
        ...createShareFixture({ shareToken, sessionId: session.id, allowNotesAccess: false }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);

      const result = await service.validateShare(shareToken, ownerId);

      expect(result.canAddNotes).toBe(true);
    });

    it('should allow notes when allowNotesAccess is true', async () => {
      const session = createSessionFixture({ id: 'session-1', userId: 'owner-1' });
      const share = {
        ...createShareFixture({ shareToken, sessionId: session.id, allowNotesAccess: true }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.sessionShareAccess!.create = jest.fn().mockResolvedValue({});

      const result = await service.validateShare(shareToken, userId);

      expect(result.canAddNotes).toBe(true);
    });

    it('should not allow notes when allowNotesAccess is false', async () => {
      const session = createSessionFixture({ id: 'session-1', userId: 'owner-1' });
      const share = {
        ...createShareFixture({ shareToken, sessionId: session.id, allowNotesAccess: false }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.sessionShareAccess!.create = jest.fn().mockResolvedValue({});

      const result = await service.validateShare(shareToken, userId);

      expect(result.canAddNotes).toBe(false);
    });

    it('should record access for non-owners', async () => {
      const session = createSessionFixture({ id: 'session-1', userId: 'owner-1' });
      const share = {
        ...createShareFixture({ id: 'share-1', shareToken, sessionId: session.id }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.sessionShareAccess!.create = jest.fn().mockResolvedValue({});

      await service.validateShare(shareToken, userId);

      expect(prismaMock.sessionShareAccess!.create).toHaveBeenCalledWith({
        data: {
          shareId: share.id,
          userId,
        },
      });
    });

    it('should not record access for owner', async () => {
      const ownerId = 'owner-1';
      const session = createSessionFixture({ id: 'session-1', userId: ownerId });
      const share = {
        ...createShareFixture({ shareToken, sessionId: session.id }),
        session,
      };

      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);

      await service.validateShare(shareToken, ownerId);

      expect(prismaMock.sessionShareAccess!.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET USER SHARES
  // ============================================================================

  describe('getUserShares', () => {
    const userId = 'user-1';

    it('should return all shares created by user', async () => {
      const shares = [
        {
          ...createShareFixture({ sharedBy: userId }),
          session: createSessionFixture({ id: 'session-1', title: 'Session 1' }),
        },
        {
          ...createShareFixture({ sharedBy: userId }),
          session: createSessionFixture({ id: 'session-2', title: 'Session 2' }),
        },
      ];

      prismaMock.sessionShare!.findMany = jest.fn().mockResolvedValue(shares);

      const result = await service.getUserShares(userId);

      expect(result).toEqual(shares);
      expect(result).toHaveLength(2);
    });

    it('should return shares ordered by creation date descending', async () => {
      prismaMock.sessionShare!.findMany = jest.fn().mockResolvedValue([]);

      await service.getUserShares(userId);

      expect(prismaMock.sessionShare!.findMany).toHaveBeenCalledWith({
        where: { sharedBy: userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no shares', async () => {
      prismaMock.sessionShare!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getUserShares(userId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // DELETE SHARE
  // ============================================================================

  describe('deleteShare', () => {
    const userId = 'user-1';
    const shareId = 'share-1';

    it('should delete share successfully', async () => {
      const share = createShareFixture({ id: shareId, sharedBy: userId });
      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);
      prismaMock.sessionShare!.delete = jest.fn().mockResolvedValue(share);

      const result = await service.deleteShare(userId, shareId);

      expect(result.message).toBe('Share deleted successfully');
      expect(prismaMock.sessionShare!.delete).toHaveBeenCalledWith({
        where: { id: shareId },
      });
    });

    it('should throw when share does not exist', async () => {
      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.deleteShare(userId, 'non-existent'),
        NotFoundException,
        'Share not found'
      );
    });

    it('should throw when user is not the creator', async () => {
      const share = createShareFixture({ id: shareId, sharedBy: 'other-user' });
      prismaMock.sessionShare!.findUnique = jest.fn().mockResolvedValue(share);

      await expectToThrow(
        () => service.deleteShare(userId, shareId),
        ForbiddenException,
        'You can only delete your own shares'
      );
    });
  });

  // ============================================================================
  // GET ACCESSED SHARES
  // ============================================================================

  describe('getAccessedShares', () => {
    const userId = 'user-1';

    it('should return accessed shares with formatted data', async () => {
      const owner = createUserFixture({ id: 'owner-1', firstName: 'John', lastName: 'Doe' });
      const accesses = [
        {
          shareId: 'share-1',
          userId,
          lastAccessedAt: new Date(),
          isDismissed: false,
          share: {
            id: 'share-1',
            shareToken: 'token-123',
            allowNotesAccess: true,
            expiresAt: null,
            session: {
              id: 'session-1',
              title: 'Test Session',
              createdAt: new Date('2025-01-01'),
              userId: owner.id,
              user: owner,
            },
          },
        },
      ];

      prismaMock.sessionShareAccess!.findMany = jest.fn().mockResolvedValue(accesses);

      const result = await service.getAccessedShares(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        shareId: 'share-1',
        shareToken: 'token-123',
        sessionId: 'session-1',
        sessionTitle: 'Test Session',
        ownerName: 'John Doe',
        allowNotesAccess: true,
      });
    });

    it('should exclude dismissed shares', async () => {
      prismaMock.sessionShareAccess!.findMany = jest.fn().mockResolvedValue([]);

      await service.getAccessedShares(userId);

      expect(prismaMock.sessionShareAccess!.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          isDismissed: false,
        }),
        include: expect.any(Object),
        orderBy: { lastAccessedAt: 'desc' },
      });
    });

    it('should exclude expired shares', async () => {
      prismaMock.sessionShareAccess!.findMany = jest.fn().mockResolvedValue([]);

      await service.getAccessedShares(userId);

      expect(prismaMock.sessionShareAccess!.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          share: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: expect.any(Date) } },
            ],
          },
        }),
        include: expect.any(Object),
        orderBy: { lastAccessedAt: 'desc' },
      });
    });

    it('should return empty array when no accessed shares', async () => {
      prismaMock.sessionShareAccess!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getAccessedShares(userId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // DISMISS SHARE
  // ============================================================================

  describe('dismissShare', () => {
    const userId = 'user-1';
    const shareId = 'share-1';

    it('should dismiss share successfully', async () => {
      const access = {
        id: 'access-1',
        shareId,
        userId,
        isDismissed: false,
      };

      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(access);
      prismaMock.sessionShareAccess!.update = jest.fn().mockResolvedValue({
        ...access,
        isDismissed: true,
        dismissedAt: new Date(),
      });

      const result = await service.dismissShare(userId, shareId);

      expect(result.message).toBe('Share dismissed successfully');
      expect(prismaMock.sessionShareAccess!.update).toHaveBeenCalledWith({
        where: { id: access.id },
        data: {
          isDismissed: true,
          dismissedAt: expect.any(Date),
        },
      });
    });

    it('should throw when access record does not exist', async () => {
      prismaMock.sessionShareAccess!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.dismissShare(userId, shareId),
        NotFoundException,
        'Access record not found'
      );
    });
  });
});
