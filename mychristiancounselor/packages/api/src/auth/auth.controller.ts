import { Controller, Post, Body, Get, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponse,
  AuthTokens,
  User
} from '@mychristiancounselor/shared';
import { Request } from 'express';
import { Public, CurrentUser } from './decorators';

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
}
