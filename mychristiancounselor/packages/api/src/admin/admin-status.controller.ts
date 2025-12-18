import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for checking admin status without requiring admin privileges
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminStatusController {
  constructor(private adminService: AdminService) {}

  /**
   * Check if the current user is a platform admin or sales rep
   * This endpoint only requires authentication, not admin privileges
   */
  @Get('health-check')
  async healthCheck(@CurrentUser() user: User) {
    const isPlatformAdmin = await this.adminService.isPlatformAdmin(user.id);
    return {
      isPlatformAdmin,
      isSalesRep: user.isSalesRep || false,
      userId: user.id,
      message: 'Admin access verified',
    };
  }
}
