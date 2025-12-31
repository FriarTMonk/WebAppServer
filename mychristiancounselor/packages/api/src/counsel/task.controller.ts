import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberTaskService } from './member-task.service';
import { TaskTemplateService } from './task-template.service';
import { MemberTaskStatus, MemberTaskType } from '@prisma/client';

@Controller('counsel/tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private memberTaskService: MemberTaskService,
    private taskTemplateService: TaskTemplateService,
  ) {}

  /**
   * GET /counsel/tasks/templates
   * Get all available task templates
   */
  @Get('templates')
  async getTemplates(@Query('type') type?: MemberTaskType) {
    if (type) {
      return this.taskTemplateService.getTemplatesByType(type);
    }
    return this.taskTemplateService.getPlatformTemplates();
  }

  /**
   * GET /counsel/tasks/templates/:id
   * Get specific template by ID
   */
  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.taskTemplateService.getTemplateById(id);
  }

  /**
   * GET /counsel/tasks
   * Get tasks assigned to authenticated member
   */
  @Get()
  async getMyTasks(
    @Request() req,
    @Query('status') status?: MemberTaskStatus,
  ) {
    return this.memberTaskService.getMemberTasks(req.user.id, status);
  }

  /**
   * GET /counsel/tasks/member/:memberId
   * Get tasks for specific member (counselor only)
   * Note: Requires counselor permission check
   */
  @Get('member/:memberId')
  async getMemberTasks(
    @Param('memberId') memberId: string,
    @Query('status') status?: MemberTaskStatus,
    @Request() req,
  ) {
    // Verify user is a counselor
    if (!req.user.isCounselor) {
      throw new ForbiddenException('Only counselors can view member tasks');
    }
    return this.memberTaskService.getMemberTasks(memberId, status);
  }

  /**
   * GET /counsel/tasks/:id
   * Get specific task by ID
   */
  @Get(':id')
  async getTask(@Param('id') id: string, @Request() req) {
    const task = await this.memberTaskService.getTaskById(id);
    // Verify member owns this task
    if (task.memberId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return task;
  }

  /**
   * POST /counsel/tasks
   * Create new task (counselor only)
   * Note: Requires isCounselor check
   */
  @Post()
  async createTask(@Body() dto: any, @Request() req) {
    // Verify user is a counselor
    if (!req.user.isCounselor) {
      throw new ForbiddenException('Only counselors can create tasks');
    }
    return this.memberTaskService.createTask({
      ...dto,
      counselorId: req.user.id,
    });
  }

  /**
   * PATCH /counsel/tasks/:id/complete
   * Mark task as completed
   */
  @Patch(':id/complete')
  async completeTask(@Param('id') id: string, @Request() req) {
    // Verify member owns this task
    const task = await this.memberTaskService.getTaskById(id);
    if (task.memberId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return this.memberTaskService.markComplete(id);
  }
}
