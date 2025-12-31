import { Test, TestingModule } from '@nestjs/testing';
import { TaskOverdueService } from './task-overdue.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('TaskOverdueService', () => {
  let service: TaskOverdueService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    memberTask: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskOverdueService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TaskOverdueService>(TaskOverdueService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOverdueTasks', () => {
    it('should mark overdue tasks and emit events', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueTasks = [
        {
          id: 'task-1',
          memberId: 'member-123',
          counselorId: 'counselor-456',
          type: 'offline_task',
          title: 'Read Psalm 23',
          description: 'Daily reading',
          dueDate: yesterday,
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(overdueTasks);
      mockPrismaService.memberTask.updateMany.mockResolvedValue({ count: 1 });

      await service.processOverdueTasks();

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: { lt: expect.any(Date) },
        },
      });
      expect(prisma.memberTask.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1'] } },
        data: { status: 'overdue' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.overdue', {
        taskId: 'task-1',
        memberId: 'member-123',
        counselorId: 'counselor-456',
        taskType: 'offline_task',
        dueDate: yesterday,
        timestamp: expect.any(Date),
      });
    });

    it('should handle no overdue tasks', async () => {
      mockPrismaService.memberTask.findMany.mockResolvedValue([]);

      await service.processOverdueTasks();

      expect(prisma.memberTask.updateMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should handle database failure gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaService.memberTask.findMany.mockRejectedValue(dbError);

      // Should not throw
      await expect(service.processOverdueTasks()).resolves.not.toThrow();

      expect(prisma.memberTask.updateMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should continue processing if event emission fails', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueTasks = [
        {
          id: 'task-1',
          memberId: 'member-123',
          counselorId: 'counselor-456',
          type: 'offline_task',
          title: 'Read Psalm 23',
          description: 'Daily reading',
          dueDate: yesterday,
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-2',
          memberId: 'member-456',
          counselorId: 'counselor-789',
          type: 'offline_task',
          title: 'Prayer journal',
          description: 'Daily prayer',
          dueDate: yesterday,
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(overdueTasks);
      mockPrismaService.memberTask.updateMany.mockResolvedValue({ count: 2 });

      // First emit fails, second succeeds
      mockEventEmitter.emit
        .mockImplementationOnce(() => {
          throw new Error('Event emission failed');
        })
        .mockImplementationOnce(() => true);

      await service.processOverdueTasks();

      // Both tasks should be updated via bulk update
      expect(prisma.memberTask.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: { status: 'overdue' },
      });

      // Both events should be attempted
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it('should handle bulk update failure gracefully', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueTasks = [
        {
          id: 'task-1',
          memberId: 'member-123',
          counselorId: 'counselor-456',
          type: 'offline_task',
          title: 'Read Psalm 23',
          description: 'Daily reading',
          dueDate: yesterday,
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(overdueTasks);
      mockPrismaService.memberTask.updateMany.mockRejectedValue(
        new Error('Update failed'),
      );

      // Should not throw
      await expect(service.processOverdueTasks()).resolves.not.toThrow();

      // Events should not be emitted if update failed
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
