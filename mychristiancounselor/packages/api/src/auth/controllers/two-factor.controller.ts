import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TwoFactorService } from '../services/two-factor.service';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  // ========== EMAIL 2FA ==========

  @Post('email/enable')
  async enableEmail2FA(@Req() req: any) {
    await this.twoFactorService.enableEmail2FA(req.user.id);
    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  }

  @Post('email/verify')
  async verifyEmailCode(
    @Req() req: any,
    @Body('code') code: string,
  ) {
    await this.twoFactorService.completeEmail2FASetup(req.user.id, code);
    return {
      success: true,
      message: 'Email 2FA enabled successfully',
    };
  }

  @Post('email/resend')
  async resendEmailCode(@Req() req: any) {
    await this.twoFactorService.sendEmailCode(req.user.id);
    return {
      success: true,
      message: 'New verification code sent',
    };
  }

  // ========== TOTP 2FA ==========

  @Post('totp/setup')
  async setupTOTP(@Req() req: any) {
    const result = await this.twoFactorService.setupTOTP(req.user.id);
    return {
      success: true,
      message: 'TOTP setup initiated. Scan QR code and verify.',
      data: result,
    };
  }

  @Post('totp/verify')
  async verifyTOTPCode(
    @Req() req: any,
    @Body('code') code: string,
  ) {
    await this.twoFactorService.completeTOTPSetup(req.user.id, code);
    return {
      success: true,
      message: 'TOTP 2FA enabled successfully',
    };
  }

  @Post('totp/regenerate-backup-codes')
  async regenerateBackupCodes(@Req() req: any) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(req.user.id);
    return {
      success: true,
      message: 'Backup codes regenerated',
      backupCodes,
    };
  }

  @Post('upgrade')
  async upgrade2FA(
    @Req() req: any,
    @Body('newMethod') newMethod: 'totp',
  ) {
    const result = await this.twoFactorService.upgrade2FAMethod(req.user.id, newMethod);
    return {
      success: true,
      message: `Upgrading to ${newMethod}. Scan QR code and verify.`,
      data: result,
    };
  }

  // ========== COMMON ==========

  @Get('status')
  async get2FAStatus(@Req() req: any) {
    return this.twoFactorService.get2FAStatus(req.user.id);
  }

  @Post('disable')
  async disable2FA(@Req() req: any) {
    await this.twoFactorService.disable2FA(req.user.id);
    return {
      success: true,
      message: '2FA disabled successfully',
    };
  }
}
