import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionLimitService } from '../counsel/session-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;
  let sessionLimitService: SessionLimitService;
  let subscriptionService: SubscriptionService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    accountType: 'individual',
    emailVerified: true,
    isActive: true,
    isPlatformAdmin: false,
    preferredTranslation: 'ESV',
    comparisonTranslations: ['KJV', 'NIV'],
    completedTours: ['welcome-tour'],
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date(),
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    status: 'active',
    topics: ['faith', 'prayer'],
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    deletedAt: null,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'This is a test message for excerpt generation',
        timestamp: new Date(),
      },
    ],
    _count: {
      notes: 2,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            organizationMember: {
              findMany: jest.fn(),
            },
            session: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            counselorAssignment: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: SessionLimitService,
          useValue: {
            checkLimit: jest.fn().mockResolvedValue({
              allowed: true,
              remaining: 10,
              limit: 10,
            }),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getSubscriptionStatus: jest.fn().mockResolvedValue({
              hasHistoryAccess: false,
              hasArchiveAccess: false,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
    sessionLimitService = module.get<SessionLimitService>(SessionLimitService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          accountType: true,
          birthDate: true,
          emailVerified: true,
          isActive: true,
          isPlatformAdmin: true,
          preferredTranslation: true,
          comparisonTranslations: true,
          completedTours: true,
          createdAt: true,
        },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const updatedUser = { ...mockUser, ...updateDto };

      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-123', updateDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          accountType: true,
          birthDate: true,
          preferredTranslation: true,
          comparisonTranslations: true,
        },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$newhash' as never);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);

      const result = await service.changePassword('user-123', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(result.message).toBe('Password changed successfully');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: '$2b$10$newhash' },
      });
    });

    it('should throw UnauthorizedException with invalid current password', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'wrongpass',
          newPassword: 'newpass123',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          currentPassword: 'pass',
          newPassword: 'newpass',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organization memberships', async () => {
      const mockMemberships = [
        {
          organization: {
            id: 'org-1',
            name: 'Test Org',
            description: 'Test Description',
            licenseStatus: 'active',
          },
          role: {
            name: 'member',
            description: 'Organization Member',
          },
          joinedAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.organizationMember, 'findMany').mockResolvedValue(mockMemberships as any);

      const result = await service.getUserOrganizations('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].organization.name).toBe('Test Org');
      expect(result[0].role.name).toBe('member');
    });

    it('should return empty array when user has no organizations', async () => {
      jest.spyOn(prismaService.organizationMember, 'findMany').mockResolvedValue([]);

      const result = await service.getUserOrganizations('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('should return session history with active status', async () => {
      jest.spyOn(prismaService.session, 'findMany').mockResolvedValue([mockSession as any]);

      const result = await service.getHistory('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-123');
      expect(result[0].title).toBe('Test Session');
      expect(result[0].noteCount).toBe(2);
      expect(result[0].excerpt).toContain('This is a test message');
    });

    it('should filter by search query', async () => {
      const sessions = [
        { ...mockSession, title: 'Prayer Session' },
        { ...mockSession, id: 'session-2', title: 'Faith Session' },
      ];

      jest.spyOn(prismaService.session, 'findMany').mockResolvedValue(sessions as any);

      const result = await service.getHistory('user-123', 'prayer');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Prayer Session');
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      jest.spyOn(prismaService.session, 'findMany').mockResolvedValue([mockSession as any]);

      await service.getHistory('user-123', undefined, undefined, dateFrom, dateTo);

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
        })
      );
    });

    it('should return archived sessions when status is completed', async () => {
      const archivedSession = { ...mockSession, status: 'archived' };
      jest.spyOn(prismaService.session, 'findMany').mockResolvedValue([archivedSession as any]);

      const result = await service.getHistory('user-123', undefined, undefined, undefined, undefined, 'completed');

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'completed',
          }),
        })
      );
    });

    it('should only return sessions with messages', async () => {
      jest.spyOn(prismaService.session, 'findMany').mockResolvedValue([mockSession as any]);

      await service.getHistory('user-123');

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            messages: {
              some: {},
            },
          }),
        })
      );
    });
  });

  describe('archiveConversation', () => {
    it('should archive conversation for organization user', async () => {
      const orgUser = { ...mockUser, accountType: 'organization' };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(orgUser);
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.session, 'update').mockResolvedValue({
        ...mockSession,
        status: 'archived',
        archivedAt: new Date(),
      } as any);

      const result = await service.archiveConversation('user-123', 'session-123');

      expect(result.status).toBe('archived');
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'archived',
          archivedAt: expect.any(Date),
          deletedAt: expect.any(Date),
        }),
      });
    });

    it('should throw ForbiddenException for individual user without subscription', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      await expect(
        service.archiveConversation('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when archiving another user\'s conversation', async () => {
      const orgUser = { ...mockUser, accountType: 'organization' };
      const otherUserSession = { ...mockSession, userId: 'other-user' };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(orgUser);
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(otherUserSession as any);

      await expect(
        service.archiveConversation('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('restoreConversation', () => {
    it('should restore archived conversation', async () => {
      const archivedSession = {
        ...mockSession,
        status: 'archived',
        archivedAt: new Date(),
        deletedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(archivedSession as any);
      jest.spyOn(prismaService.session, 'update').mockResolvedValue({
        ...archivedSession,
        status: 'active',
        archivedAt: null,
        deletedAt: null,
      } as any);

      const result = await service.restoreConversation('user-123', 'session-123');

      expect(result.status).toBe('active');
      expect(result.archivedAt).toBeNull();
      expect(result.deletedAt).toBeNull();
    });

    it('should throw ForbiddenException when restoring another user\'s conversation', async () => {
      const otherUserSession = { ...mockSession, userId: 'other-user' };
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(otherUserSession as any);

      await expect(
        service.restoreConversation('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('hardDeleteConversation', () => {
    it('should delete conversation past deletedAt date', async () => {
      const deletableSession = {
        ...mockSession,
        deletedAt: new Date(Date.now() - 1000), // Past date
      };

      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(deletableSession as any);
      jest.spyOn(prismaService.session, 'delete').mockResolvedValue(deletableSession as any);

      await service.hardDeleteConversation('user-123', 'session-123');

      expect(prismaService.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should throw ForbiddenException when trying to delete before deletedAt date', async () => {
      const sessionWithFutureDelete = {
        ...mockSession,
        deletedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
      };

      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(sessionWithFutureDelete as any);

      await expect(
        service.hardDeleteConversation('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when deleting another user\'s conversation', async () => {
      const otherUserSession = { ...mockSession, userId: 'other-user' };
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(otherUserSession as any);

      await expect(
        service.hardDeleteConversation('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCounselorAssignments', () => {
    it('should return counselor assignments', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          counselor: {
            id: 'counselor-1',
            firstName: 'Jane',
            lastName: 'Counselor',
            email: 'jane@example.com',
          },
          organization: {
            id: 'org-1',
            name: 'Test Org',
            description: 'Description',
          },
          status: 'active',
          assignedAt: new Date(),
          endedAt: null,
        },
      ];

      jest.spyOn(prismaService.counselorAssignment, 'findMany').mockResolvedValue(mockAssignments as any);

      const result = await service.getCounselorAssignments('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].counselor.name).toBe('Jane Counselor');
      expect(result[0].status).toBe('active');
    });

    it('should handle counselor with no name gracefully', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          counselor: {
            id: 'counselor-1',
            firstName: null,
            lastName: null,
            email: 'counselor@example.com',
          },
          organization: {
            id: 'org-1',
            name: 'Test Org',
            description: 'Description',
          },
          status: 'active',
          assignedAt: new Date(),
          endedAt: null,
        },
      ];

      jest.spyOn(prismaService.counselorAssignment, 'findMany').mockResolvedValue(mockAssignments as any);

      const result = await service.getCounselorAssignments('user-123');

      expect(result[0].counselor.name).toBe('counselor@example.com');
    });
  });

  describe('deleteAccount', () => {
    it('should mark account for deletion with valid password', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        isActive: false,
        deletionRequestedAt: new Date(),
      } as any);

      const result = await service.deleteAccount('user-123', 'correctpassword');

      expect(result.message).toBe('Account deletion requested');
      expect(result.deletionDate).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          isActive: false,
          deletionRequestedAt: expect.any(Date),
          deletionRequestedBy: 'user-123',
        },
      });
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.deleteAccount('user-123', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if account already marked for deletion', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(inactiveUser);

      await expect(
        service.deleteAccount('user-123', 'password')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tour Management', () => {
    describe('getCompletedTours', () => {
      it('should return completed tours', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

        const result = await service.getCompletedTours('user-123');

        expect(result).toEqual(['welcome-tour']);
      });

      it('should return empty array when user has no completed tours', async () => {
        const userWithNoTours = { ...mockUser, completedTours: [] };
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(userWithNoTours);

        const result = await service.getCompletedTours('user-123');

        expect(result).toEqual([]);
      });
    });

    describe('completeTour', () => {
      it('should add tour to completed list', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
        jest.spyOn(prismaService.user, 'update').mockResolvedValue({
          ...mockUser,
          completedTours: ['welcome-tour', 'new-tour'],
        } as any);

        const result = await service.completeTour('user-123', 'new-tour');

        expect(result).toContain('new-tour');
        expect(result).toContain('welcome-tour');
      });

      it('should not duplicate tour if already completed', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

        const result = await service.completeTour('user-123', 'welcome-tour');

        expect(result).toEqual(['welcome-tour']);
        expect(prismaService.user.update).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when user not found', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

        await expect(
          service.completeTour('nonexistent', 'tour')
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('resetTour', () => {
      it('should remove tour from completed list', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
        jest.spyOn(prismaService.user, 'update').mockResolvedValue({
          ...mockUser,
          completedTours: [],
        } as any);

        const result = await service.resetTour('user-123', 'welcome-tour');

        expect(result).toEqual([]);
      });

      it('should throw BadRequestException when user not found', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

        await expect(
          service.resetTour('nonexistent', 'tour')
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('getSessionLimitStatus', () => {
    it('should return session limit status', async () => {
      const mockSubscriptionStatus = {
        hasHistoryAccess: true,
        hasArchiveAccess: true,
      };
      const mockLimitStatus = {
        allowed: true,
        remaining: 5,
        limit: 10,
      };

      jest.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue(mockSubscriptionStatus as any);
      jest.spyOn(sessionLimitService, 'checkLimit').mockResolvedValue(mockLimitStatus);

      const result = await service.getSessionLimitStatus('user-123');

      expect(result).toEqual(mockLimitStatus);
      expect(sessionLimitService.checkLimit).toHaveBeenCalledWith('user-123', true);
    });

    it('should check limit with hasHistoryAccess false for free users', async () => {
      const mockSubscriptionStatus = {
        hasHistoryAccess: false,
        hasArchiveAccess: false,
      };

      jest.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue(mockSubscriptionStatus as any);

      await service.getSessionLimitStatus('user-123');

      expect(sessionLimitService.checkLimit).toHaveBeenCalledWith('user-123', false);
    });
  });
});
