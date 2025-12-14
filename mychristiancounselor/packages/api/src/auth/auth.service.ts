import { Injectable, Logger, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
  User,
  AuthTokens
} from '@mychristiancounselor/shared';
import { EmailService } from '../email/email.service';
import { EmailRateLimitService } from '../email/email-rate-limit.service';
import { SessionLimitService } from '../counsel/session-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_EXPIRY_MINUTES = 60; // 60 minutes for session timeout
  private readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
  private readonly PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private emailRateLimit: EmailRateLimitService,
    private sessionLimitService: SessionLimitService,
    private subscriptionService: SubscriptionService,
  ) {}

  // ===== PASSWORD METHODS =====

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ===== TOKEN GENERATION =====

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    this.logger.debug(`[AUTH] Generating JWT with payload: ${JSON.stringify(payload, null, 2)}`);
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });
    this.logger.debug(`[AUTH] Generated JWT token (first 50 chars): ${token.substring(0, 50)}`);
    return token;
  }

  async generateRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.REFRESH_TOKEN_EXPIRY_MINUTES);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  async generateTokens(user: User, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id, ipAddress, userAgent);

    return { accessToken, refreshToken };
  }

  // ===== REGISTRATION & LOGIN =====

  async register(dto: RegisterDto, bypassEmailVerification = false): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Generate email verification token (unless bypassing)
    const verificationToken = bypassEmailVerification ? null : randomBytes(32).toString('hex');

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        verificationToken,
        emailVerified: bypassEmailVerification, // Auto-verify if from org invite
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(this.sanitizeUser(user));

    // Send verification email (unless bypassing - e.g., org invitation)
    if (!bypassEmailVerification && verificationToken) {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.firstName || undefined,
        verificationToken,
        user.id,
      );
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // Check session limit and create login session
    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(user.id);
    const limitStatus = await this.sessionLimitService.checkLimit(user.id, subscriptionStatus.hasHistoryAccess);

    // Create a Session record for this login
    // Each login creates a new session that counts against the daily limit
    await this.prisma.session.create({
      data: {
        userId: user.id,
        title: 'Session',
        status: 'active',
        preferredTranslation: 'ASV', // Default translation
      },
    });
    this.logger.log(`User ${user.id} logged in - created login session - session limit: ${limitStatus.used}/${limitStatus.limit}`);

    // Generate tokens
    const tokens = await this.generateTokens(this.sanitizeUser(user), ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
      sessionLimitStatus: limitStatus, // Return limit status for frontend to handle
    };
  }

  // ===== TOKEN REFRESH =====

  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    // Find refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    // Generate new tokens
    return this.generateTokens(this.sanitizeUser(tokenRecord.user), ipAddress, userAgent);
  }

  // ===== LOGOUT =====

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // ===== UTILITY =====

  private sanitizeUser(user: any): User {
    const { passwordHash, verificationToken, resetToken, resetTokenExpiry, ...sanitized } = user;
    return sanitized;
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  // ===== EMAIL VERIFICATION =====

  /**
   * Verify user's email address using verification token
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user to mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null, // Clear token after use
      },
    });
  }

  /**
   * Resend verification email (with rate limiting)
   */
  async resendVerificationEmail(email: string, ipAddress: string): Promise<void> {
    // Check rate limit (1 per hour per email + IP)
    const rateLimitCheck = await this.emailRateLimit.checkRateLimit(
      email,
      ipAddress,
      'verification_resend',
    );

    if (!rateLimitCheck.allowed) {
      throw new BadRequestException(
        `Too many verification emails sent. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
      );
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // For security, don't reveal if email exists or not
    // But only send email if user exists and is not verified
    if (user && !user.emailVerified) {
      // Generate new verification token
      const verificationToken = randomBytes(32).toString('hex');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationToken },
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(
        user.email,
        user.firstName || undefined,
        verificationToken,
        user.id,
      );

      // Increment rate limit counter
      await this.emailRateLimit.incrementRateLimit(email, ipAddress, 'verification_resend');
    }

    // Always return success (don't reveal if email exists)
  }

  // ===== PASSWORD RESET =====

  /**
   * Initiate password reset (with rate limiting)
   */
  async forgotPassword(email: string, ipAddress: string): Promise<void> {
    // Check rate limit (3 per hour per email + IP)
    const rateLimitCheck = await this.emailRateLimit.checkRateLimit(email, ipAddress, 'password_reset');

    if (!rateLimitCheck.allowed) {
      throw new BadRequestException(
        `Too many password reset requests. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
      );
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // For security, don't reveal if email exists or not
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + this.PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

      // Invalidate any existing reset tokens
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName || undefined,
        resetToken,
        user.id,
      );

      // Increment rate limit counter
      await this.emailRateLimit.incrementRateLimit(email, ipAddress, 'password_reset');
    }

    // Always return success (don't reveal if email exists)
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Logout all sessions for security
    await this.logoutAll(user.id);
  }
}
