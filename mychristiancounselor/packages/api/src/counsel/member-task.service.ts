import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemberTaskStatus, Prisma } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';

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

    try {
      return await this.prisma.memberTask.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `Database error creating task: ${error.code} - ${error.message}`,
        );
        throw new InternalServerErrorException('Failed to create task');
      }
      throw error;
    }
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

    try {
      return await this.prisma.memberTask.findMany({
        where: {
          memberId,
          ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `Database error fetching tasks: ${error.code} - ${error.message}`,
        );
        throw new InternalServerErrorException('Failed to fetch tasks');
      }
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTaskById(taskId: string) {
    const task = await this.prisma.memberTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Mark a task as completed and emit event
   */
  async markComplete(taskId: string) {
    this.logger.log(`Marking task ${taskId} as completed`);

    try {
      // Use a single update with where clause to avoid race condition
      const updatedTask = await this.prisma.memberTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Emit task.completed event
      this.eventEmitter.emit('task.completed', {
        memberId: updatedTask.memberId,
        taskId: updatedTask.id,
        taskType: updatedTask.type,
        counselorId: updatedTask.counselorId,
        timestamp: new Date(),
      });

      return updatedTask;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Record not found
        throw new NotFoundException('Task not found');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `Database error completing task: ${error.code} - ${error.message}`,
        );
        throw new InternalServerErrorException('Failed to complete task');
      }
      throw error;
    }
  }
}
