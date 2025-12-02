import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { EmailRateLimitService } from '../email/email-rate-limit.service';
import { createEmailServiceMock } from '../testing';
import { UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;
  let emailRateLimit: EmailRateLimitService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    emailVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '30d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EmailService,
          useValue: createEmailServiceMock(),
        },
        {
          provide: EmailRateLimitService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, retryAfter: 0 }),
            incrementRateLimit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
    emailRateLimit = module.get<EmailRateLimitService>(EmailRateLimitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$')).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate JWT access token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await service.generateAccessToken(payload);

      expect(token).toBe('mock-jwt-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: 'test-secret',
        expiresIn: '15m',
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate and store refresh token', async () => {
      const userId = 'user-123';
      const ipAddress = '127.0.0.1';
      const userAgent = 'Mozilla/5.0';

      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-123',
        userId,
        token: 'mock-refresh-token',
        expiresAt: new Date(),
        ipAddress,
        userAgent,
        createdAt: new Date(),
      });

      const token = await service.generateRefreshToken(userId, ipAddress, userAgent);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          token: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress,
          userAgent,
        }),
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-123',
        userId: user.id,
        token: 'mock-refresh-token',
        expiresAt: new Date(),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const tokens = await service.generateTokens(user as any);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBe('mock-jwt-token');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should successfully register a new user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({ ...mockUser, ...registerDto });
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-123',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should bypass email verification when flag is true', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        ...mockUser,
        ...registerDto,
        emailVerified: true,
        verificationToken: null
      });
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-123',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.register(registerDto, true);

      expect(result.user.emailVerified).toBe(true);
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'testPassword123!',
    };

    it('should successfully login with valid credentials', async () => {
      const hashedPassword = await service.hashPassword(loginDto.password);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockUser, passwordHash: hashedPassword });
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        id: 'token-123',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const hashedPassword = await service.hashPassword(loginDto.password);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        isActive: false
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshAccessToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh access token with valid refresh token', async () => {
      const tokenRecord = {
        id: 'token-123',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        user: mockUser,
      };

      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(tokenRecord);
      jest.spyOn(prisma.refreshToken, 'delete').mockResolvedValue(tokenRecord);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({
        ...tokenRecord,
        id: 'new-token-123',
        token: 'new-refresh-token',
      });

      const result = await service.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredTokenRecord = {
        id: 'token-123',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        user: mockUser,
      };

      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(expiredTokenRecord);
      jest.spyOn(prisma.refreshToken, 'delete').mockResolvedValue(expiredTokenRecord);

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const tokenRecord = {
        id: 'token-123',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 86400000),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        user: { ...mockUser, isActive: false },
      };

      jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(tokenRecord);

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token on logout', async () => {
      const refreshToken = 'token-to-delete';
      jest.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({ count: 1 });

      await service.logout(refreshToken);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
    });
  });

  describe('logoutAll', () => {
    it('should delete all refresh tokens for user', async () => {
      const userId = 'user-123';
      jest.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({ count: 3 });

      await service.logoutAll(userId);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('getUserById', () => {
    it('should return sanitized user by ID', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const verificationToken = 'valid-verification-token';
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        verificationToken
      });
      jest.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        verificationToken: null
      });

      await service.verifyEmail(verificationToken);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          emailVerified: true,
          verificationToken: null,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email for unverified user', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        emailVerified: false
      });
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);

      await service.resendVerificationEmail(email, ipAddress);

      expect(emailRateLimit.checkRateLimit).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(emailRateLimit.incrementRateLimit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rate limited', async () => {
      jest.spyOn(emailRateLimit, 'checkRateLimit').mockResolvedValue({
        allowed: false,
        retryAfter: 3600
      });

      await expect(
        service.resendVerificationEmail('test@example.com', '127.0.0.1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not send email for already verified user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        emailVerified: true
      });

      await service.resendVerificationEmail('test@example.com', '127.0.0.1');

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail('nonexistent@example.com', '127.0.0.1')
      ).resolves.not.toThrow();

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);

      await service.forgotPassword(email, ipAddress);

      expect(emailRateLimit.checkRateLimit).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(emailRateLimit.incrementRateLimit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rate limited', async () => {
      jest.spyOn(emailRateLimit, 'checkRateLimit').mockResolvedValue({
        allowed: false,
        retryAfter: 3600
      });

      await expect(
        service.forgotPassword('test@example.com', '127.0.0.1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not reveal if email does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.forgotPassword('nonexistent@example.com', '127.0.0.1')
      ).resolves.not.toThrow();

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        resetToken,
        resetTokenExpiry: futureDate
      });
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);
      jest.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({ count: 2 });

      await service.resetPassword(resetToken, newPassword);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: expect.any(String),
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPass123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const resetToken = 'expired-token';
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        resetToken,
        resetTokenExpiry: pastDate
      });

      await expect(
        service.resetPassword(resetToken, 'NewPass123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing expiry', async () => {
      const resetToken = 'valid-token';

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        resetToken,
        resetTokenExpiry: null
      });

      await expect(
        service.resetPassword(resetToken, 'NewPass123!')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
