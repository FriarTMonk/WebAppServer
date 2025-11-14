import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { IsPlatformAdminGuard } from './guards/is-platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

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

  @Get('metrics')
  async getMetrics(@CurrentUser() user: User) {
    try {
      await this.adminService.logAdminAction(
        user.id,
        'view_metrics',
        { timestamp: new Date() },
      );

      return this.adminService.getPlatformMetrics();
    } catch (error) {
      this.logger.error(`Failed to retrieve metrics for user ${user.id}`, error);
      throw error;
    }
  }

  @Get('organizations')
  async getOrganizations(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('licenseStatus') licenseStatus?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_organizations',
      { filters: { search, licenseStatus, skip, take } },
    );

    return this.adminService.getAllOrganizations({
      search,
      licenseStatus,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('users')
  async getUsers(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('accountType') accountType?: string,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_users',
      { filters: { search, accountType, isActive, skip, take } },
    );

    return this.adminService.getAllUsers({
      search,
      accountType,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
