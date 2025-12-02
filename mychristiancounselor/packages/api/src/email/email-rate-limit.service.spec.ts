import { Test, TestingModule } from '@nestjs/testing';
import { EmailRateLimitService } from './email-rate-limit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmailRateLimitService', () => {
  let service: EmailRateLimitService;
  let prisma: PrismaService;

  const mockPrisma = {
    emailRateLimit: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailRateLimitService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmailRateLimitService>(EmailRateLimitService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow operation when no existing record', async () => {
      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(null);

      const result = await service.checkRateLimit(
        'test@example.com',
        '127.0.0.1',
        'verification_resend'
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow operation when existing record has expired', async () => {
      const expiredRecord = {
        id: 'record-123',
        identifier: 'test@example.com',
        identifierType: 'email',
        operation: 'verification_resend',
        attemptCount: 5,
        windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(expiredRecord as any);
      jest.spyOn(prisma.emailRateLimit, 'delete').mockResolvedValue(expiredRecord as any);

      const result = await service.checkRateLimit(
        'test@example.com',
        '127.0.0.1',
        'verification_resend'
      );

      expect(result.allowed).toBe(true);
      expect(prisma.emailRateLimit.delete).toHaveBeenCalled();
    });

    it('should block operation when email rate limit exceeded', async () => {
      const activeRecord = {
        id: 'record-123',
        identifier: 'test@example.com',
        identifierType: 'email',
        operation: 'verification_resend',
        attemptCount: 1, // Limit is 1 for verification_resend
        windowStart: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(activeRecord as any);

      const result = await service.checkRateLimit(
        'test@example.com',
        '127.0.0.1',
        'verification_resend'
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should block operation when IP rate limit exceeded', async () => {
      const activeIpRecord = {
        id: 'record-456',
        identifier: '127.0.0.1',
        identifierType: 'ip',
        operation: 'verification_resend',
        attemptCount: 5, // Limit is 5 for IP
        windowStart: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique')
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce(activeIpRecord as any); // IP check fails

      const result = await service.checkRateLimit(
        'test@example.com',
        '127.0.0.1',
        'verification_resend'
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should allow operation when under rate limit', async () => {
      const underLimitRecord = {
        id: 'record-123',
        identifier: 'test@example.com',
        identifierType: 'email',
        operation: 'password_reset',
        attemptCount: 1, // Under limit of 3
        windowStart: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(underLimitRecord as any);

      const result = await service.checkRateLimit(
        'test@example.com',
        '127.0.0.1',
        'password_reset'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('incrementRateLimit', () => {
    it('should create new records for first attempt', async () => {
      jest.spyOn(prisma.emailRateLimit, 'upsert').mockResolvedValue({} as any);

      await service.incrementRateLimit(
        'test@example.com',
        '127.0.0.1',
        'verification_resend'
      );

      expect(prisma.emailRateLimit.upsert).toHaveBeenCalledTimes(2); // Once for email, once for IP
      expect(prisma.emailRateLimit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            identifier_identifierType_operation: {
              identifier: 'test@example.com',
              identifierType: 'email',
              operation: 'verification_resend',
            },
          }),
          create: expect.objectContaining({
            attemptCount: 1,
          }),
        })
      );
    });

    it('should increment existing record', async () => {
      jest.spyOn(prisma.emailRateLimit, 'upsert').mockResolvedValue({} as any);

      await service.incrementRateLimit(
        'test@example.com',
        '127.0.0.1',
        'password_reset'
      );

      expect(prisma.emailRateLimit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            attemptCount: { increment: 1 },
          },
        })
      );
    });
  });

  describe('cleanupExpiredRecords', () => {
    it('should delete expired records', async () => {
      jest.spyOn(prisma.emailRateLimit, 'deleteMany').mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredRecords();

      expect(result).toBe(5);
      expect(prisma.emailRateLimit.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific identifier', async () => {
      jest.spyOn(prisma.emailRateLimit, 'deleteMany').mockResolvedValue({ count: 1 });

      await service.resetRateLimit('test@example.com', 'email', 'verification_resend');

      expect(prisma.emailRateLimit.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: 'test@example.com',
          identifierType: 'email',
          operation: 'verification_resend',
        },
      });
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return not limited when no records exist', async () => {
      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(null);

      const result = await service.getRateLimitStatus('test@example.com', '127.0.0.1');

      expect(result.verificationResend.email).toEqual({ limited: false, attempts: 0 });
      expect(result.verificationResend.ip).toEqual({ limited: false, attempts: 0 });
      expect(result.passwordReset.email).toEqual({ limited: false, attempts: 0 });
      expect(result.passwordReset.ip).toEqual({ limited: false, attempts: 0 });
    });

    it('should return limited status when limit exceeded', async () => {
      const limitedRecord = {
        id: 'record-123',
        identifier: 'test@example.com',
        identifierType: 'email',
        operation: 'verification_resend',
        attemptCount: 1,
        windowStart: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique')
        .mockResolvedValueOnce(limitedRecord as any) // verification email
        .mockResolvedValueOnce(null) // verification IP
        .mockResolvedValueOnce(null) // password reset email
        .mockResolvedValueOnce(null); // password reset IP

      const result = await service.getRateLimitStatus('test@example.com', '127.0.0.1');

      expect(result.verificationResend.email.limited).toBe(true);
      expect(result.verificationResend.email.attempts).toBe(1);
      expect(result.verificationResend.email.limit).toBe(1);
    });

    it('should ignore expired records', async () => {
      const expiredRecord = {
        id: 'record-123',
        identifier: 'test@example.com',
        identifierType: 'email',
        operation: 'verification_resend',
        attemptCount: 5,
        windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.emailRateLimit, 'findUnique').mockResolvedValue(expiredRecord as any);

      const result = await service.getRateLimitStatus('test@example.com', '127.0.0.1');

      expect(result.verificationResend.email.limited).toBe(false);
      expect(result.verificationResend.email.attempts).toBe(0);
    });
  });
});
