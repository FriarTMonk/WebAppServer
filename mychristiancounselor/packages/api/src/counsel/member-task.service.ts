import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemberTaskType, MemberTaskStatus } from '@prisma/client';

export interface CreateTaskDto {
  memberId: string;
  counselorId: string;
  type: MemberTaskType;
  title: string;
  description: string;
  dueDate?: Date;
  metadata?: any;
}

@Injectable()
export class MemberTaskService {
  private readonly logger = new Logger(MemberTaskService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new task assigned to a member
   */
  async createTask(dto: CreateTaskDto) {
    this.logger.log(
      `Creating ${dto.type} task for member ${dto.memberId} by counselor ${dto.counselorId}`,
    );

    return this.prisma.memberTask.create({
      data: {
        memberId: dto.memberId,
        counselorId: dto.counselorId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        status: 'pending',
        metadata: dto.metadata,
      },
    });
  }

  /**
   * Get all tasks for a member
   * @param memberId - The member's ID
   * @param status - Optional filter by status
   */
  async getMemberTasks(memberId: string, status?: MemberTaskStatus) {
    this.logger.log(
      `Fetching tasks for member ${memberId}${status ? ` with status ${status}` : ''}`,
    );

    return this.prisma.memberTask.findMany({
      where: {
        memberId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark a task as completed and emit event
   */
  async markComplete(taskId: string) {
    this.logger.log(`Marking task ${taskId} as completed`);

    const task = await this.prisma.memberTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.prisma.memberTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Emit task.completed event
    this.eventEmitter.emit('task.completed', {
      memberId: task.memberId,
      taskId: task.id,
      taskType: task.type,
      counselorId: task.counselorId,
      timestamp: new Date(),
    });

    return updatedTask;
  }
}
