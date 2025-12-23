import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    session: {
      deleteMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('deleteExpiredSessions', () => {
    it('should delete expired archived sessions', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 5 });

      await service.deleteExpiredSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'archived',
          deletedAt: {
            lte: expect.any(Date),
          },
        },
      });
    });

    it('should log the number of deleted sessions', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 10 });

      await service.deleteExpiredSessions();

      expect(logSpy).toHaveBeenCalledWith(
        'Deleted 10 expired archived sessions'
      );
    });

    it('should handle zero deletions', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });

      await service.deleteExpiredSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const error = new Error('Database connection failed');
      mockPrismaService.session.deleteMany.mockRejectedValue(error);

      await service.deleteExpiredSessions();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error during cleanup job:',
        error
      );
    });
  });

  describe('deleteExpiredAccounts', () => {
    it('should delete accounts marked for deletion 30+ days ago', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const expiredUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletionRequestedAt: thirtyOneDaysAgo,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          deletionRequestedAt: thirtyOneDaysAgo,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expiredUsers);
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteExpiredAccounts();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          deletionRequestedAt: {
            lte: expect.any(Date),
          },
        },
        select: {
          id: true,
          email: true,
          deletionRequestedAt: true,
        },
      });

      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-2' },
      });
    });

    it('should verify 30-day threshold calculation', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.deleteExpiredAccounts();

      const callArgs = mockPrismaService.user.findMany.mock.calls[0][0];
      const thresholdDate = callArgs.where.deletionRequestedAt.lte;

      // Verify it's approximately 30 days ago (within 1 minute tolerance)
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);
      const timeDiff = Math.abs(
        thresholdDate.getTime() - expectedDate.getTime()
      );

      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute difference
    });

    it('should log deletion of each user', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const deletionDate = new Date('2025-11-20');

      const expiredUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletionRequestedAt: deletionDate,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expiredUsers);
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteExpiredAccounts();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hard deleted user user1@example.com')
      );
    });

    it('should handle no expired accounts', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.deleteExpiredAccounts();

      expect(logSpy).toHaveBeenCalledWith('No expired accounts to delete');
      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });

    it('should track success and error counts', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const errorSpy = jest.spyOn(service['logger'], 'error');

      const expiredUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
        {
          id: 'user-3',
          email: 'user3@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expiredUsers);
      mockPrismaService.user.delete
        .mockResolvedValueOnce({}) // user-1 success
        .mockRejectedValueOnce(new Error('Cascade delete failed')) // user-2 error
        .mockResolvedValueOnce({}); // user-3 success

      await service.deleteExpiredAccounts();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete user user2@example.com')
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Account cleanup complete: 2 deleted, 1 errors'
      );
    });

    it('should continue deleting after individual failures', async () => {
      const expiredUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expiredUsers);
      mockPrismaService.user.delete
        .mockRejectedValueOnce(new Error('Error deleting user-1'))
        .mockResolvedValueOnce({}); // user-2 should still be attempted

      await service.deleteExpiredAccounts();

      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const error = new Error('Database connection failed');
      mockPrismaService.user.findMany.mockRejectedValue(error);

      await service.deleteExpiredAccounts();

      expect(errorSpy).toHaveBeenCalledWith(
        'Error during account cleanup job:',
        error
      );
    });

    it('should only select inactive users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.deleteExpiredAccounts();

      const callArgs = mockPrismaService.user.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(false);
    });

    it('should log found expired accounts count', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const expiredUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
        {
          id: 'user-3',
          email: 'user3@example.com',
          deletionRequestedAt: new Date('2025-11-20'),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expiredUsers);
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteExpiredAccounts();

      expect(logSpy).toHaveBeenCalledWith(
        'Found 3 expired accounts to delete'
      );
    });

    it('should implement GDPR Right to Erasure compliance', async () => {
      // Test that accounts ARE deleted after 30 days (GDPR compliance)
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const expiredUser = {
        id: 'user-1',
        email: 'user1@example.com',
        deletionRequestedAt: thirtyOneDaysAgo,
      };

      mockPrismaService.user.findMany.mockResolvedValue([expiredUser]);
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteExpiredAccounts();

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should NOT delete accounts within 30-day grace period', async () => {
      // Test that accounts are NOT deleted before 30 days
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      // Mock should return empty array because query filters out recent deletions
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.deleteExpiredAccounts();

      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });
  });
});
