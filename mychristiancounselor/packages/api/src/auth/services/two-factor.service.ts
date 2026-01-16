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
      emailType: '2fa_verification',
      userId: userId,
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

  // ========== TOTP 2FA ==========

  async setupTOTP(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `MyChristianCounselor (${user.email})`,
      issuer: 'MyChristianCounselor',
      length: 32,
    });

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = Array.from({ length: 10 }, () => generateRandomString(8));

    // Encrypt and store secret and backup codes (not enabled yet)
    const encryptedSecret = encrypt(secret.base32);
    const encryptedBackupCodes = backupCodes.map((code) => encrypt(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
        // Don't enable yet - user must verify first
      },
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes, // Return plain text for user to save
    };
  }

  async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('TOTP not set up for this user');
    }

    // Decrypt secret
    const secret = decrypt(user.twoFactorSecret);

    // Verify code with 1-step window (allows for slight time drift)
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    return verified;
  }

  async completeTOTPSetup(userId: string, code: string): Promise<void> {
    const verified = await this.verifyTOTPCode(userId, code);

    if (!verified) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Enable TOTP 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'totp',
        twoFactorEnabledAt: new Date(),
      },
    });
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
      return false;
    }

    // Try to match against encrypted backup codes
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const encryptedCode = user.twoFactorBackupCodes[i];
      try {
        const decryptedCode = decrypt(encryptedCode);
        if (decryptedCode === code) {
          // Found matching code - remove it (one-time use)
          const updatedCodes = user.twoFactorBackupCodes.filter((_, index) => index !== i);
          await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: updatedCodes },
          });
          return true;
        }
      } catch (error) {
        // Decryption failed, skip this code
        continue;
      }
    }

    return false;
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () => generateRandomString(8));
    const encryptedBackupCodes = backupCodes.map((code) => encrypt(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: encryptedBackupCodes },
    });

    return backupCodes;
  }

  async upgrade2FAMethod(userId: string, newMethod: 'totp'): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorMethod: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled. Use setup instead.');
    }

    if (user.twoFactorMethod === newMethod) {
      throw new BadRequestException(`2FA is already set to ${newMethod}`);
    }

    // For now, only support upgrading from email to TOTP
    if (user.twoFactorMethod !== 'email' || newMethod !== 'totp') {
      throw new BadRequestException('Only upgrading from email to TOTP is supported');
    }

    // Set up TOTP (this will store the secret but not enable it yet)
    return this.setupTOTP(userId);
  }

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

  async dismissBanner(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deploymentBannerDismissed: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deploymentBannerDismissed: user.deploymentBannerDismissed ? undefined : true,
        lastSecurityBannerShown: new Date(),
      },
    });
  }
}
