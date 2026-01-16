import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { encrypt, decrypt, generateRandomString } from '../../common/utils/encryption.util';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ========== EMAIL 2FA ==========

  async enableEmail2FA(userId: string): Promise<void> {
    // Send test code
    await this.sendEmailCode(userId);

    return;
  }

  async sendEmailCode(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        emailCodeAttempts: true,
        lastEmailCodeRequestAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Throttle: Max 3 codes per hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (
      user.lastEmailCodeRequestAt &&
      user.lastEmailCodeRequestAt > oneHourAgo &&
      user.emailCodeAttempts >= 3
    ) {
      throw new BadRequestException(
        'Too many code requests. Please try again in an hour.',
      );
    }

    // Reset attempts counter if last request was >1 hour ago
    const attempts =
      user.lastEmailCodeRequestAt && user.lastEmailCodeRequestAt > oneHourAgo
        ? user.emailCodeAttempts + 1
        : 1;

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    // Store code
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: code,
        emailCodeExpiresAt: expiresAt,
        emailCodeUsedAt: null, // Reset used flag
        emailCodeAttempts: attempts,
        lastEmailCodeRequestAt: now,
      },
    });

    // Send email
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Your MyChristianCounselor Verification Code',
      html: `
        <p>Hi ${user.firstName},</p>
        <p>Your verification code is: <strong style="font-size: 24px;">${code}</strong></p>
        <p>This code will expire in 30 minutes and can only be used once.</p>
        <p>If you didn't request this code, please contact support immediately.</p>
        <p><em>Security Tip: Never share this code with anyone.</em></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          MyChristianCounselor Support<br>
          support@mychristiancounselor.online
        </p>
      `,
      text: `
Hi ${user.firstName},

Your verification code is: ${code}

This code will expire in 30 minutes and can only be used once.

If you didn't request this code, please contact support immediately.

Security Tip: Never share this code with anyone.

---
MyChristianCounselor Support
support@mychristiancounselor.online
      `,
    });
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerificationCode: true,
        emailCodeExpiresAt: true,
        emailCodeUsedAt: true,
      },
    });

    if (!user || !user.emailVerificationCode || !user.emailCodeExpiresAt) {
      throw new BadRequestException('No verification code found');
    }

    // Check if already used
    if (user.emailCodeUsedAt) {
      throw new BadRequestException('This code has already been used');
    }

    // Check if expired
    if (new Date() > user.emailCodeExpiresAt) {
      throw new BadRequestException('Code has expired');
    }

    // Verify code
    if (user.emailVerificationCode !== code) {
      return false;
    }

    // Mark code as used
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailCodeUsedAt: new Date(),
      },
    });

    return true;
  }

  async completeEmail2FASetup(userId: string, code: string): Promise<void> {
    const verified = await this.verifyEmailCode(userId, code);

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable email 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'email',
        twoFactorEnabledAt: new Date(),
      },
    });
  }

  // ========== TOTP 2FA (to be implemented in next tasks) ==========

  // ========== COMMON ==========

  async disable2FA(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        emailVerificationCode: null,
        emailCodeExpiresAt: null,
        emailCodeUsedAt: null,
      },
    });
  }

  async get2FAStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorEnabledAt: true,
        lastSecurityBannerShown: true,
        deploymentBannerDismissed: true,
      },
    });

    return user;
  }
}
