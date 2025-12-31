import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TaskOverdueService {
  private readonly logger = new Logger(TaskOverdueService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run daily at midnight to check for overdue tasks
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processOverdueTasks() {
    this.logger.log('Starting overdue task detection...');

    const now = new Date();

    // Find all pending tasks with dueDate in the past
    const overdueTasks = await this.prisma.memberTask.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
    });

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

    for (const task of overdueTasks) {
      // Update status to overdue
      await this.prisma.memberTask.update({
        where: { id: task.id },
        data: { status: 'overdue' },
      });

      // Emit task.overdue event
      this.eventEmitter.emit('task.overdue', {
        taskId: task.id,
        memberId: task.memberId,
        counselorId: task.counselorId,
        taskType: task.type,
        dueDate: task.dueDate,
        timestamp: new Date(),
      });

      this.logger.log(`Task ${task.id} marked as overdue`);
    }

    this.logger.log('Overdue task detection complete');
  }
}
