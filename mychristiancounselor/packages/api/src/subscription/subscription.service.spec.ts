import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionService, SubscriptionFeature } from './subscription.service';
import {
  createPrismaMock,
  createEmailServiceMock,
  createUserFixture,
  createOrganizationFixture,
  createMembershipFixture,
  createSubscriptionFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let emailMock: ReturnType<typeof createEmailServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    emailMock = createEmailServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              STRIPE_SECRET_KEY: undefined, // Disable Stripe in tests
              STRIPE_WEBHOOK_SECRET: '',
            }),
          ],
        }),
      ],
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('getSubscriptionStatus', () => {
    it('should return "none" status for anonymous users', async () => {
      const result = await service.getSubscriptionStatus(null);

      expect(result).toEqual({
        subscriptionStatus: 'none',
        maxClarifyingQuestions: 0,
        hasHistoryAccess: false,
        hasSharingAccess: false,
        hasArchiveAccess: false,
      });
    });

    it('should return "none" status for undefined userId', async () => {
      const result = await service.getSubscriptionStatus(undefined);

      expect(result).toEqual({
        subscriptionStatus: 'none',
        maxClarifyingQuestions: 0,
        hasHistoryAccess: false,
        hasSharingAccess: false,
        hasArchiveAccess: false,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getSubscriptionStatus('non-existent-user'),
        NotFoundException,
        /User with ID .* not found/
      );
    });

    it('should return subscribed status for user with active subscription', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        subscriptionTier: 'basic',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getSubscriptionStatus(user.id);

      expect(result).toEqual({
        subscriptionStatus: 'active',
        subscriptionTier: 'basic',
        maxClarifyingQuestions: 9,
        hasHistoryAccess: true,
        hasSharingAccess: true,
        hasArchiveAccess: true,
      });
    });

    it('should return subscribed status for organization member without individual subscription', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        subscriptionTier: null,
        organizationMemberships: [createMembershipFixture()],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getSubscriptionStatus(user.id);

      expect(result).toEqual({
        subscriptionStatus: 'none',
        subscriptionTier: undefined,
        maxClarifyingQuestions: 9,
        hasHistoryAccess: true,
        hasSharingAccess: true,
        hasArchiveAccess: true,
      });
    });

    it('should return limited access for unsubscribed user', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        subscriptionTier: null,
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getSubscriptionStatus(user.id);

      expect(result).toEqual({
        subscriptionStatus: 'none',
        subscriptionTier: undefined,
        maxClarifyingQuestions: 3,
        hasHistoryAccess: false,
        hasSharingAccess: false,
        hasArchiveAccess: false,
      });
    });

    it('should consider past_due subscription as not subscribed', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'past_due',
        subscriptionTier: 'basic',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getSubscriptionStatus(user.id);

      expect(result).toEqual({
        subscriptionStatus: 'past_due',
        subscriptionTier: 'basic',
        maxClarifyingQuestions: 3,
        hasHistoryAccess: false,
        hasSharingAccess: false,
        hasArchiveAccess: false,
      });
    });
  });

  describe('canAccessFeature', () => {
    it('should return true for HISTORY_ACCESS when user is subscribed', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.canAccessFeature(user.id, SubscriptionFeature.HISTORY_ACCESS);

      expect(result).toBe(true);
    });

    it('should return false for HISTORY_ACCESS when user is not subscribed', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.canAccessFeature(user.id, SubscriptionFeature.HISTORY_ACCESS);

      expect(result).toBe(false);
    });

    it('should return true for NOTE_ACCESS when user has history access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.canAccessFeature(user.id, SubscriptionFeature.NOTE_ACCESS);

      expect(result).toBe(true);
    });

    it('should return true for SHARING_ACCESS when user is subscribed', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.canAccessFeature(user.id, SubscriptionFeature.SHARING_ACCESS);

      expect(result).toBe(true);
    });

    it('should return true for CLARIFYING_QUESTIONS when user has any questions limit', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.canAccessFeature(user.id, SubscriptionFeature.CLARIFYING_QUESTIONS);

      expect(result).toBe(true); // Even unsubscribed users get 3 questions
    });

    it('should return false for anonymous user', async () => {
      const result = await service.canAccessFeature(null, SubscriptionFeature.HISTORY_ACCESS);

      expect(result).toBe(false);
    });
  });

  describe('requireFeature', () => {
    it('should not throw when user has feature access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expect(
        service.requireFeature(user.id, SubscriptionFeature.HISTORY_ACCESS)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks feature access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireFeature(user.id, SubscriptionFeature.HISTORY_ACCESS),
        ForbiddenException,
        'Session history is only available to subscribed users'
      );
    });

    it('should use custom error message when provided', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireFeature(
          user.id,
          SubscriptionFeature.HISTORY_ACCESS,
          'Custom error message'
        ),
        ForbiddenException,
        'Custom error message'
      );
    });

    it('should throw correct message for NOTE_ACCESS', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireFeature(user.id, SubscriptionFeature.NOTE_ACCESS),
        ForbiddenException,
        'Session notes are only available to subscribed users'
      );
    });
  });

  describe('requireHistoryAccess', () => {
    it('should not throw when user has history access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expect(
        service.requireHistoryAccess(user.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks history access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireHistoryAccess(user.id),
        ForbiddenException,
        'Session history is only available to subscribed users'
      );
    });
  });

  describe('requireNoteAccess', () => {
    it('should not throw when user has note access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expect(
        service.requireNoteAccess(user.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks note access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireNoteAccess(user.id),
        ForbiddenException,
        'Session notes are only available to subscribed users'
      );
    });
  });

  describe('requireSharingAccess', () => {
    it('should not throw when user has sharing access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expect(
        service.requireSharingAccess(user.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks sharing access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireSharingAccess(user.id),
        ForbiddenException,
        'Session sharing is only available to subscribed users'
      );
    });
  });

  describe('requireExportAccess', () => {
    it('should not throw when user has export access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expect(
        service.requireExportAccess(user.id)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user lacks export access', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      await expectToThrow(
        () => service.requireExportAccess(user.id),
        ForbiddenException,
        'Session export is only available to subscribed users'
      );
    });
  });

  describe('getMaxClarifyingQuestions', () => {
    it('should return 9 for subscribed user', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'active',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getMaxClarifyingQuestions(user.id);

      expect(result).toBe(9);
    });

    it('should return 3 for unsubscribed user', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getMaxClarifyingQuestions(user.id);

      expect(result).toBe(3);
    });

    it('should return 0 for anonymous user', async () => {
      const result = await service.getMaxClarifyingQuestions(null);

      expect(result).toBe(0);
    });

    it('should return 9 for organization member', async () => {
      const user = createUserFixture({
        subscriptionStatus: 'none',
        organizationMemberships: [createMembershipFixture()],
      });
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

      const result = await service.getMaxClarifyingQuestions(user.id);

      expect(result).toBe(9);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with default tier', async () => {
      const userId = 'test-user-id';
      const subscription = createSubscriptionFixture({ userId });

      const txMock = {
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        subscription: {
          create: jest.fn().mockResolvedValue(subscription),
        },
      };

      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => callback(txMock)
      );

      const result = await service.createSubscription(userId);

      expect(result).toEqual(subscription);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          subscriptionStatus: 'active',
          subscriptionTier: 'basic',
          subscriptionStart: expect.any(Date),
        },
      });
      expect(txMock.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          status: 'active',
          tier: 'basic',
          startDate: expect.any(Date),
        },
      });
    });

    it('should create subscription with premium tier', async () => {
      const userId = 'test-user-id';
      const subscription = createSubscriptionFixture({ userId, tier: 'premium' });

      const txMock = {
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        subscription: {
          create: jest.fn().mockResolvedValue(subscription),
        },
      };

      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => callback(txMock)
      );

      const result = await service.createSubscription(userId, 'premium');

      expect(result).toEqual(subscription);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          subscriptionStatus: 'active',
          subscriptionTier: 'premium',
          subscriptionStart: expect.any(Date),
        },
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel user subscription', async () => {
      const userId = 'test-user-id';
      const subscription = createSubscriptionFixture({ userId, status: 'active' });

      const txMock = {
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        subscription: {
          findFirst: jest.fn().mockResolvedValue(subscription),
          update: jest.fn().mockResolvedValue({ ...subscription, status: 'canceled' }),
        },
      };

      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => callback(txMock)
      );

      await service.cancelSubscription(userId);

      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionEnd: expect.any(Date),
        },
      });
      expect(txMock.subscription.update).toHaveBeenCalledWith({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          endDate: expect.any(Date),
        },
      });
    });

    it('should handle case when no active subscription exists', async () => {
      const userId = 'test-user-id';

      const txMock = {
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        subscription: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      };

      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => callback(txMock)
      );

      await service.cancelSubscription(userId);

      expect(txMock.user.update).toHaveBeenCalled();
      expect(txMock.subscription.update).not.toHaveBeenCalled();
    });
  });
});
