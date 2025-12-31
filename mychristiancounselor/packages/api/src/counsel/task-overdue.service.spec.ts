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
      update: jest.fn(),
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
      mockPrismaService.memberTask.update.mockResolvedValue({
        ...overdueTasks[0],
        status: 'overdue',
      });

      await service.processOverdueTasks();

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: { lt: expect.any(Date) },
        },
      });
      expect(prisma.memberTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
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

      expect(prisma.memberTask.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
