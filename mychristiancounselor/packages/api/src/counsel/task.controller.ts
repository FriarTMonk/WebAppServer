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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsCounselorGuard } from './guards/is-counselor.guard';
import { MemberTaskService } from './member-task.service';
import { TaskTemplateService } from './task-template.service';
import { AssignmentService } from './assignment.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MemberTaskStatus, MemberTaskType } from '@prisma/client';

@Controller('counsel/tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private memberTaskService: MemberTaskService,
    private taskTemplateService: TaskTemplateService,
    private assignmentService: AssignmentService,
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
   * Note: Requires counselor permission check and assignment verification
   */
  @Get('member/:memberId')
  @UseGuards(IsCounselorGuard)
  async getMemberTasks(
    @Param('memberId') memberId: string,
    @Query('status') status?: MemberTaskStatus,
    @Query('organizationId') organizationId?: string,
    @Request() req,
  ) {
    // Verify counselor has assignment to this member
    if (organizationId) {
      const hasAssignment = await this.assignmentService.verifyCounselorAssignment(
        req.user.id,
        memberId,
        organizationId,
      );

      if (!hasAssignment) {
        throw new ForbiddenException('You are not assigned to this member');
      }
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
      throw new ForbiddenException('You do not have permission to access this task');
    }
    return task;
  }

  /**
   * POST /counsel/tasks
   * Create new task (counselor only)
   * Note: Requires counselor guard and assignment verification
   */
  @Post()
  @UseGuards(IsCounselorGuard)
  async createTask(
    @Body() dto: CreateTaskDto,
    @Query('organizationId') organizationId?: string,
    @Request() req,
  ) {
    // Verify counselor has assignment to this member
    if (organizationId) {
      const hasAssignment = await this.assignmentService.verifyCounselorAssignment(
        req.user.id,
        dto.memberId,
        organizationId,
      );

      if (!hasAssignment) {
        throw new ForbiddenException('You are not assigned to this member');
      }
    }

    return this.memberTaskService.createTask({
      ...dto,
      counselorId: req.user.id,
    });
  }

  /**
   * PATCH /counsel/tasks/:id
   * Update task (member or counselor only)
   */
  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req,
  ) {
    // Get the task to check authorization
    const task = await this.memberTaskService.getTaskById(id);

    // Check if user is the member or counselor
    const isMember = task.memberId === req.user.id;
    const isCounselor = task.counselorId === req.user.id;

    if (!isMember && !isCounselor) {
      throw new ForbiddenException('Not authorized to edit this task');
    }

    return this.memberTaskService.updateTask(id, dto);
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
      throw new ForbiddenException('You do not have permission to complete this task');
    }
    return this.memberTaskService.markComplete(id);
  }
}
