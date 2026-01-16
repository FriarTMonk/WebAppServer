import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IsPlatformAdminGuard } from '../guards/is-platform-admin.guard';
import { SecurityStatsService } from '../services/security-stats.service';

@Controller('admin/security')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class SecurityStatsController {
  constructor(private securityStatsService: SecurityStatsService) {}

  @Get('2fa/stats')
  async get2FAStats() {
    return this.securityStatsService.get2FAStats();
  }

  @Get('2fa/users')
  async get2FAUsers(
    @Query('method') method?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.securityStatsService.get2FAUserList({
      method,
      enabled: enabled ? enabled === 'true' : undefined,
    });
  }
}
