import { Controller, Get, Post, Patch, Put, Delete, Logger, Param, Body, UseGuards, Request, ForbiddenException, Query, HttpCode } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { OrgAdminService } from './org-admin.service';
import { IsOrgAdminGuard } from '../admin/guards/is-org-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminResetPasswordDto, UpdateMemberRoleRequest, CreateCounselorAssignmentDto } from '@mychristiancounselor/shared';
import { EmailMetricsService } from '../email/email-metrics.service';
import { OrgBookSettingsService, UpdateOrgBookSettingsDto } from './services/org-book-settings.service';
import { BookQueryService } from '../book/services/book-query.service';
import { BookQueryDto } from '../book/dto';

/**
 * Controller for organization admin operations.
 * Organization admins can only manage users within their own organization.
 */
@Controller('org-admin')
@UseGuards(JwtAuthGuard, IsOrgAdminGuard)
export class OrgAdminController {
  private readonly logger = new Logger(OrgAdminController.name);

  constructor(
    private adminService: AdminService,
    private orgAdminService: OrgAdminService,
    private emailMetricsService: EmailMetricsService,
    private orgBookSettingsService: OrgBookSettingsService,
    private bookQueryService: BookQueryService,
  ) {}

  /**
   * Get the admin's organization info
   * GET /org-admin/organization
   */
  @Get('organization')
  async getOrganization(@Request() req: any) {
    const orgInfo = req.userOrganization;
    return {
      id: orgInfo.id,
      name: orgInfo.name,
    };
  }

  /**
   * Get all members of the admin's organization
   * GET /org-admin/members
   */
  @Get('members')
  async getOrganizationMembers(
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    await this.adminService.logAdminAction(
      user.id,
      'org_admin_view_members',
      { organizationId },
      undefined,
      organizationId,
    );

    return this.adminService.getOrganizationMembers(organizationId);
  }

  /**
   * Get organization-specific metrics
   * GET /org-admin/metrics
   */
  @Get('metrics')
  async getOrganizationMetrics(
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    await this.adminService.logAdminAction(
      user.id,
      'org_admin_view_metrics',
      { organizationId },
      undefined,
      organizationId,
    );

    return this.adminService.getOrganizationMetrics(organizationId);
  }

  /**
   * Get audit log for the organization
   * GET /org-admin/audit-log
   */
  @Get('audit-log')
  async getAuditLog(
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    await this.adminService.logAdminAction(
      user.id,
      'org_admin_view_audit_log',
      { organizationId },
      undefined,
      organizationId,
    );

    // Get audit log filtered for this organization only
    return this.adminService.getAuditLog({
      organizationId,
    });
  }

  /**
   * Reset a user's password (must be in admin's organization)
   * POST /org-admin/users/:id/reset-password
   */
  @Post('users/:id/reset-password')
  async resetUserPassword(
    @CurrentUser() user: User,
    @Param('id') targetUserId: string,
    @Body() dto: AdminResetPasswordDto,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    // Verify the target user is in the admin's organization
    await this.verifyUserInOrganization(targetUserId, organizationId);

    return this.adminService.resetUserPassword(user.id, targetUserId, dto.newPassword);
  }

  /**
   * Start morphing into another user (must be in admin's organization)
   * POST /org-admin/morph/start/:userId
   */
  @Post('morph/start/:userId')
  async startMorph(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    // Verify the target user is in the admin's organization
    await this.verifyUserInOrganization(targetUserId, organizationId);

    return this.adminService.startMorph(user.id, targetUserId);
  }

  /**
   * End morph session
   * POST /org-admin/morph/end
   */
  @Post('morph/end')
  async endMorph(@CurrentUser() user: any) {
    const originalAdminId = user.originalAdminId || user.id;
    const morphSessionId = user.morphSessionId;

    return this.adminService.endMorph(originalAdminId, morphSessionId);
  }

  /**
   * Update a user's role in the organization
   * PATCH /org-admin/members/:userId/role
   */
  @Patch('members/:userId/role')
  async updateMemberRole(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleRequest,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    return this.adminService.updateMemberRole(
      user.id,
      organizationId,
      targetUserId,
      dto.roleId,
    );
  }

  /**
   * Release a member from the organization
   * The user becomes an individual user and retains their account/data
   * POST /org-admin/members/:userId/release
   */
  @Post('members/:userId/release')
  async releaseMember(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
    @Request() req: any,
  ) {
    const organizationId = req.userOrganization.id;

    // Verify the target user is in the admin's organization
    await this.verifyUserInOrganization(targetUserId, organizationId);

    return this.adminService.releaseMember(
      user.id,
      organizationId,
      targetUserId,
    );
  }

  /**
   * Helper method to verify a user belongs to the specified organization
   */
  private async verifyUserInOrganization(userId: string, organizationId: string): Promise<void> {
    const isInOrg = await this.adminService['prisma'].organizationMember.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (!isInOrg) {
      throw new ForbiddenException('User is not in your organization');
    }
  }

  /**
   * Create counselor assignment
   * POST /org-admin/counselor-assignments
   */
  @Post('counselor-assignments')
  async createCounselorAssignment(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
    @Body() dto: CreateCounselorAssignmentDto,
  ) {
    return this.orgAdminService.createCounselorAssignment(
      user.id,
      organizationId,
      dto
    );
  }

  /**
   * Get all counselor assignments
   * GET /org-admin/counselor-assignments?organizationId=xxx
   */
  @Get('counselor-assignments')
  async getCounselorAssignments(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
  ) {
    return this.orgAdminService.getCounselorAssignments(user.id, organizationId);
  }

  /**
   * End counselor assignment
   * DELETE /org-admin/counselor-assignments/:id
   */
  @Delete('counselor-assignments/:id')
  @HttpCode(204)
  async endCounselorAssignment(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
    @Param('id') assignmentId: string,
  ) {
    await this.orgAdminService.endCounselorAssignment(
      user.id,
      organizationId,
      assignmentId
    );
  }

  /**
   * Get counselor workload statistics
   * GET /org-admin/counselor-workload?organizationId=xxx
   */
  @Get('counselor-workload')
  async getCounselorWorkloads(
    @CurrentUser() user: User,
    @Query('organizationId') organizationId: string,
  ) {
    return this.orgAdminService.getCounselorWorkloads(user.id, organizationId);
  }

  /**
   * Get email metrics for the organization (Org Admin only)
   * Only shows metrics for emails sent to members of this organization
   * GET /org-admin/email-metrics
   */
  @Get('email-metrics')
  async getEmailMetrics(
    @CurrentUser() user: User,
    @Request() req: any,
    @Query('daysAgo') daysAgo?: string,
  ) {
    const organizationId = req.userOrganization.id;

    await this.adminService.logAdminAction(
      user.id,
      'org_admin_view_email_metrics',
      { organizationId, daysAgo },
      undefined,
      organizationId,
    );

    const days = daysAgo ? parseInt(daysAgo, 10) : 30;
    return this.emailMetricsService.getOrganizationMetrics(organizationId, days);
  }

  /**
   * Get detailed email logs for the organization (Org Admin only)
   * Supports pagination and filtering
   * GET /org-admin/email-logs
   */
  @Get('email-logs')
  async getEmailLogs(
    @CurrentUser() user: User,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('emailType') emailType?: string,
    @Query('status') status?: string,
  ) {
    const organizationId = req.userOrganization.id;

    await this.adminService.logAdminAction(
      user.id,
      'org_admin_view_email_logs',
      { organizationId, limit, offset, emailType, status },
      undefined,
      organizationId,
    );

    return this.emailMetricsService.getOrganizationEmailLogs(organizationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      emailType,
      status,
    });
  }

  /**
   * Get organization book settings
   * GET /org-admin/books/settings
   */
  @Get('books/settings')
  async getOrgBookSettings(@Request() req: any) {
    const organizationId = req.userOrganization.id;
    return this.orgBookSettingsService.getOrgBookSettings(organizationId);
  }

  /**
   * Update organization book settings
   * PUT /org-admin/books/settings
   */
  @Put('books/settings')
  async updateOrgBookSettings(
    @Request() req: any,
    @Body() dto: UpdateOrgBookSettingsDto,
  ) {
    const organizationId = req.userOrganization.id;
    return this.orgBookSettingsService.updateOrgBookSettings(organizationId, dto);
  }

  /**
   * Get books filtered for organization
   * GET /org-admin/books
   */
  @Get('books')
  async getOrganizationBooks(
    @CurrentUser() user: User,
    @Request() req: any,
    @Query() query: BookQueryDto,
  ) {
    const organizationId = req.userOrganization.id;
    return this.bookQueryService.findBooksForOrganization(query, user.id, organizationId);
  }

  /**
   * Get all available books (for setting up filters)
   * GET /org-admin/books/available
   */
  @Get('books/available')
  async getAvailableBooks(
    @CurrentUser() user: User,
    @Query() query: BookQueryDto,
  ) {
    return this.bookQueryService.findBooks(query, user.id);
  }
}
