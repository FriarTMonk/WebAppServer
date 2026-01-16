import { Controller, Post, Body, Get, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import {
  AuthResponse,
  AuthTokens,
  User
} from '@mychristiancounselor/shared';
import { Request } from 'express';
import { Public, CurrentUser } from './decorators';
import {
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../email/dto/send-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Public()
  @Post('login/verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verifyLogin2FA(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Body('method') method: 'email' | 'totp',
    @Req() req: Request,
  ): Promise<AuthResponse> {
    return this.authService.verifyLogin2FA(
      userId,
      code,
      method,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.refreshAccessToken(
      dto.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: User): Promise<void> {
    await this.authService.logoutAll(user.id);
  }

  // ===== EMAIL VERIFICATION ENDPOINTS =====

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.resendVerificationEmail(dto.email, req.ip || '');
    return { message: 'Verification email sent if account exists' };
  }

  // ===== PASSWORD RESET ENDPOINTS =====

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email, req.ip || '');
    return { message: 'Password reset email sent if account exists' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }
}
