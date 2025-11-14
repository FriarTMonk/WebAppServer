import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { IsPlatformAdminGuard } from './guards/is-platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('audit-log')
  async getAuditLog(
    @CurrentUser() user: User,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Log this access
    await this.adminService.logAdminAction(
      user.id,
      'view_audit_log',
      { filters: { action, startDate, endDate } },
    );

    return this.adminService.getAuditLog({
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('health-check')
  async healthCheck(@CurrentUser() user: User) {
    const isPlatformAdmin = await this.adminService.isPlatformAdmin(user.id);
    return {
      isPlatformAdmin,
      userId: user.id,
      message: 'Admin access verified',
    };
  }
}
