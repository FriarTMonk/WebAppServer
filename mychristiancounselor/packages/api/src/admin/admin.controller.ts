import { Controller, Get, Post, Patch, Delete, Logger, Query, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { IsPlatformAdminGuard } from './guards/is-platform-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminResetPasswordDto, UpdateMemberRoleRequest } from '@mychristiancounselor/shared';
import { EmailMetricsService } from '../email/email-metrics.service';
import { CreateAdminOrganizationDto } from './dto/create-admin-organization.dto';
import { UpdateAdminOrganizationDto } from './dto/update-admin-organization.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { queueConfig } from '../config/queue.config';
import { CreateFrameworkDto } from './dto/create-framework.dto';
import { EvaluationFrameworkService } from './services/evaluation-framework.service';
import { QueueMonitoringService } from './services/queue-monitoring.service';
import { CostAnalyticsService, CostAnalyticsQuery } from './services/cost-analytics.service';
import { BulkReEvaluationService, BulkReEvaluationOptions } from './services/bulk-re-evaluation.service';
import { AnalyticsChartsService } from './services/analytics-charts.service';
import { AnalyticsChartQueryDto } from './dto/analytics-chart-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private adminService: AdminService,
    private emailMetricsService: EmailMetricsService,
    private prisma: PrismaService,
    @InjectQueue(queueConfig.evaluationQueue.name)
    private readonly evaluationQueue: Queue,
    private evaluationFramework: EvaluationFrameworkService,
    private queueMonitoring: QueueMonitoringService,
    private costAnalytics: CostAnalyticsService,
    private bulkReEvaluation: BulkReEvaluationService,
    private analyticsCharts: AnalyticsChartsService,
  ) {}

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

  /**
   * Get all members of an organization
   * GET /admin/organizations/:id/members
   */
  @Get('organizations/:id/members')
  async getOrganizationMembers(
    @CurrentUser() user: User,
    @Param('id') organizationId: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_organization_members',
      { organizationId },
      undefined,
      organizationId,
    );

    return this.adminService.getOrganizationMembers(organizationId);
  }

  /**
   * Reset a user's password
   * POST /admin/users/:id/reset-password
   */
  @Post('users/:id/reset-password')
  async resetUserPassword(
    @CurrentUser() user: User,
    @Param('id') targetUserId: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.adminService.resetUserPassword(user.id, targetUserId, dto.newPassword);
  }

  /**
   * Start morphing into another user
   * POST /admin/morph/start/:userId
   */
  @Post('morph/start/:userId')
  async startMorph(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
  ) {
    return this.adminService.startMorph(user.id, targetUserId);
  }

  /**
   * End morph session
   * POST /admin/morph/end
   */
  @Post('morph/end')
  async endMorph(@CurrentUser() user: any) {
    // user should have morph metadata if morphed
    const originalAdminId = user.originalAdminId || user.id;
    const morphSessionId = user.morphSessionId;

    return this.adminService.endMorph(originalAdminId, morphSessionId);
  }

  /**
   * Update a user's role in an organization
   * PATCH /admin/organizations/:orgId/members/:userId/role
   */
  @Patch('organizations/:orgId/members/:userId/role')
  async updateMemberRole(
    @CurrentUser() user: User,
    @Param('orgId') organizationId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleRequest,
  ) {
    return this.adminService.updateMemberRole(
      user.id,
      organizationId,
      targetUserId,
      dto.roleId,
    );
  }

  /**
   * Manually update user subscription (Platform Admin only)
   * PATCH /admin/users/:id/subscription
   */
  @Patch('users/:id/subscription')
  async updateUserSubscription(
    @CurrentUser() user: User,
    @Param('id') targetUserId: string,
    @Body() dto: any, // Will use UpdateUserSubscriptionRequest from shared
  ) {
    return this.adminService.updateUserSubscription(
      user.id,
      targetUserId,
      {
        subscriptionStatus: dto.subscriptionStatus,
        subscriptionTier: dto.subscriptionTier,
        subscriptionStart: dto.subscriptionStart ? new Date(dto.subscriptionStart) : undefined,
        subscriptionEnd: dto.subscriptionEnd ? new Date(dto.subscriptionEnd) : undefined,
      },
    );
  }

  /**
   * Update organization subscription limits (Platform Admin only)
   * PATCH /admin/organizations/:id/subscription-limit
   */
  @Patch('organizations/:id/subscription-limit')
  async updateOrganizationSubscription(
    @CurrentUser() user: User,
    @Param('id') organizationId: string,
    @Body() dto: any, // Will use UpdateOrganizationSubscriptionRequest from shared
  ) {
    return this.adminService.updateOrganizationSubscription(
      user.id,
      organizationId,
      {
        maxMembers: dto.maxMembers,
        licenseStatus: dto.licenseStatus,
        licenseType: dto.licenseType,
        licenseExpiresAt: dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : undefined,
      },
    );
  }

  /**
   * Create a new organization with a designated owner
   *
   * The owner will be added immediately if they have an existing account,
   * or will receive an invitation email if they don't.
   *
   * POST /admin/organizations
   */
  @Post('organizations')
  async createOrganization(
    @CurrentUser() user: User,
    @Body() dto: CreateAdminOrganizationDto,
  ) {
    return this.adminService.createOrganization(user.id, dto);
  }

  /**
   * Update an existing client organization
   * PATCH /admin/organizations/:id
   */
  @Patch('organizations/:id')
  async updateOrganization(
    @CurrentUser() user: User,
    @Param('id') organizationId: string,
    @Body() dto: UpdateAdminOrganizationDto,
  ) {
    return this.adminService.updateOrganization(user.id, organizationId, dto);
  }

  /**
   * Archive an organization
   * POST /admin/organizations/:id/archive
   */
  @Post('organizations/:id/archive')
  async archiveOrganization(
    @CurrentUser() user: User,
    @Param('id') organizationId: string,
  ) {
    return this.adminService.archiveOrganization(user.id, organizationId);
  }

  /**
   * Unarchive an organization
   * POST /admin/organizations/:id/unarchive
   */
  @Post('organizations/:id/unarchive')
  async unarchiveOrganization(
    @CurrentUser() user: User,
    @Param('id') organizationId: string,
  ) {
    return this.adminService.unarchiveOrganization(user.id, organizationId);
  }

  /**
   * Clean up stale sessions and expired refresh tokens
   * POST /admin/system/cleanup-sessions
   */
  @Post('system/cleanup-sessions')
  async cleanupStaleSessions(@CurrentUser() user: User) {
    return this.adminService.cleanupStaleSessions(user.id);
  }

  /**
   * Check user session status for debugging
   * POST /admin/system/check-user-sessions
   * Body: { emails?: string[] } - If emails not provided, returns all users (up to 100)
   */
  @Post('system/check-user-sessions')
  async checkUserSessions(
    @CurrentUser() user: User,
    @Body() dto: { emails?: string[] },
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'check_user_sessions',
      { emails: dto.emails || 'all' },
    );

    return this.adminService.checkUserSessions(dto.emails);
  }

  /**
   * Get platform-wide email metrics (Platform Admin only)
   * GET /admin/email-metrics
   */
  @Get('email-metrics')
  async getEmailMetrics(
    @CurrentUser() user: User,
    @Query('daysAgo') daysAgo?: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_email_metrics',
      { daysAgo },
    );

    const days = daysAgo ? parseInt(daysAgo, 10) : 30;
    return this.emailMetricsService.getPlatformMetrics(days);
  }

  /**
   * Get email metrics for all organizations (Platform Admin only)
   * Returns individual metrics for each organization
   * GET /admin/email-metrics/organizations
   */
  @Get('email-metrics/organizations')
  async getOrganizationEmailMetrics(
    @CurrentUser() user: User,
    @Query('daysAgo') daysAgo?: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_organization_email_metrics',
      { daysAgo },
    );

    const days = daysAgo ? parseInt(daysAgo, 10) : 30;
    return this.emailMetricsService.getAllOrganizationMetrics(days);
  }

  /**
   * Get detailed email logs for platform (Platform Admin only)
   * Supports pagination and filtering
   * GET /admin/email-logs
   */
  @Get('email-logs')
  async getEmailLogs(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('emailType') emailType?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'view_email_logs',
      { limit, offset, emailType, status, organizationId },
    );

    return this.emailMetricsService.getPlatformEmailLogs({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      emailType,
      status,
      organizationId,
    });
  }

  /**
   * Manually trigger book evaluation
   * POST /api/admin/books/:id/trigger-evaluation
   *
   * Platform admin only. Queues an evaluation job for a specific book.
   * Useful for re-triggering evaluations or fixing books stuck in pending status.
   */
  @Post('books/:id/trigger-evaluation')
  async triggerBookEvaluation(
    @CurrentUser() user: User,
    @Param('id') bookId: string,
  ) {
    await this.adminService.logAdminAction(
      user.id,
      'trigger_book_evaluation',
      { bookId },
    );

    // Verify book exists
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        author: true,
        evaluationStatus: true,
      },
    });

    if (!book) {
      return {
        success: false,
        message: 'Book not found',
      };
    }

    // Queue evaluation job
    await this.evaluationQueue.add(
      'evaluate-book',
      { bookId: book.id },
      {
        priority: 1, // High priority for manual trigger
        attempts: queueConfig.defaultJobOptions.attempts,
        backoff: queueConfig.defaultJobOptions.backoff,
      }
    );

    this.logger.log(`Manually triggered evaluation for book ${book.id} by admin ${user.id}`);

    return {
      success: true,
      message: `Evaluation job queued for "${book.title}" by ${book.author}`,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        currentStatus: book.evaluationStatus,
      },
    };
  }

  // Evaluation Framework Management
  @Get('evaluation/frameworks')
  async getFrameworks() {
    return this.evaluationFramework.getAll();
  }

  @Get('evaluation/frameworks/active')
  async getActiveFramework() {
    return this.evaluationFramework.getActive();
  }

  @Post('evaluation/frameworks')
  async createFramework(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFrameworkDto,
  ) {
    return this.evaluationFramework.create(userId, dto);
  }

  @Patch('evaluation/frameworks/:id/activate')
  async activateFramework(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.evaluationFramework.activate(userId, id);
  }

  // Queue Monitoring
  @Get('evaluation/queue/status')
  async getQueueStatus() {
    return this.queueMonitoring.getQueueStatus();
  }

  @Get('evaluation/queue/jobs')
  async getQueueJobs(@Query('status') status?: string) {
    return this.queueMonitoring.getJobs(status);
  }

  @Post('evaluation/queue/jobs/:jobId/retry')
  async retryJob(@Param('jobId') jobId: string) {
    return this.queueMonitoring.retryJob(jobId);
  }

  @Delete('evaluation/queue/jobs/:jobId')
  async removeJob(@Param('jobId') jobId: string) {
    return this.queueMonitoring.removeJob(jobId);
  }

  @Post('evaluation/queue/pause')
  async pauseQueue() {
    return this.queueMonitoring.pauseQueue();
  }

  @Post('evaluation/queue/resume')
  async resumeQueue() {
    return this.queueMonitoring.resumeQueue();
  }

  @Get('evaluation/analytics/costs')
  async getCostAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('frameworkVersion') frameworkVersion?: string,
  ) {
    const query: CostAnalyticsQuery = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      frameworkVersion,
    };
    return this.costAnalytics.getAnalytics(query);
  }

  @Post('evaluation/re-evaluate')
  async triggerBulkReEvaluation(
    @CurrentUser('id') userId: string,
    @Body() dto: { scope: 'all' | 'pending' | 'failed' | 'completed'; frameworkId?: string },
  ) {
    const options: BulkReEvaluationOptions = {
      scope: dto.scope,
      frameworkId: dto.frameworkId,
      triggeredBy: userId,
    };
    return this.bulkReEvaluation.triggerBulkReEvaluation(options);
  }

  /**
   * Get evaluation costs chart data
   * GET /admin/analytics-charts/evaluation-costs
   *
   * Returns AI evaluation cost trends and aggregates.
   * Uses EvaluationCostLog model for actual cost tracking.
   */
  @Get('analytics-charts/evaluation-costs')
  async getEvaluationCosts(@Query() query: AnalyticsChartQueryDto) {
    return this.analyticsCharts.getEvaluationCosts(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  /**
   * Get email health chart data
   * GET /admin/analytics-charts/email-health
   *
   * Returns email campaign performance metrics including bounce, open, and click rates.
   * Uses EmailCampaign and EmailCampaignRecipient models.
   */
  @Get('analytics-charts/email-health')
  async getEmailHealth(@Query() query: AnalyticsChartQueryDto) {
    return this.analyticsCharts.getEmailHealth(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  /**
   * Get user growth chart data
   * GET /admin/analytics-charts/user-growth
   *
   * Returns user registration trends, total users, and active user counts.
   * Active users determined by RefreshToken activity (proxy for login tracking).
   */
  @Get('analytics-charts/user-growth')
  async getUserGrowth(@Query() query: AnalyticsChartQueryDto) {
    return this.analyticsCharts.getUserGrowth(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  /**
   * Get revenue chart data
   * GET /admin/analytics-charts/revenue
   *
   * Returns subscription-based metrics.
   * Note: Uses subscription counts as proxy since Subscription model lacks amount field.
   */
  @Get('analytics-charts/revenue')
  async getRevenue(@Query() query: AnalyticsChartQueryDto) {
    return this.analyticsCharts.getRevenue(
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }
}
