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

    try {
      const now = new Date();

      // Find all pending tasks with dueDate in the past
      const overdueTasks = await this.prisma.memberTask.findMany({
        where: {
          status: 'pending',
          dueDate: { lt: now },
        },
      });

      this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

      if (overdueTasks.length === 0) {
        this.logger.log('No overdue tasks to process');
        return;
      }

      // Extract task IDs for bulk update
      const taskIds = overdueTasks.map((task) => task.id);

      // Bulk update all overdue tasks
      await this.prisma.memberTask.updateMany({
        where: { id: { in: taskIds } },
        data: { status: 'overdue' },
      });

      this.logger.log(`Updated ${taskIds.length} tasks to overdue status`);

      // Emit events for each task with individual error handling
      let successCount = 0;
      let failedCount = 0;

      for (const task of overdueTasks) {
        try {
          this.eventEmitter.emit('task.overdue', {
            taskId: task.id,
            memberId: task.memberId,
            counselorId: task.counselorId,
            taskType: task.type,
            dueDate: task.dueDate,
            timestamp: new Date(),
          });
          successCount++;
        } catch (error) {
          failedCount++;
          this.logger.error(
            `Failed to emit event for task ${task.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Overdue task detection complete: ${successCount} events emitted, ${failedCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Error in processOverdueTasks:',
        error.stack,
      );
    }
  }
}
