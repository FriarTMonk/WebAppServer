import { Test, TestingModule } from '@nestjs/testing';
import { MemberTaskService } from './member-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemberTaskStatus } from '@prisma/client';

describe('MemberTaskService', () => {
  let service: MemberTaskService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    memberTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberTaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MemberTaskService>(MemberTaskService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a conversation prompt task', async () => {
      const dto = {
        memberId: 'member-123',
        counselorId: 'counselor-456',
        type: 'conversation_prompt' as const,
        title: 'Discuss forgiveness',
        description: 'Have a conversation about forgiving others',
        dueDate: new Date('2025-01-15'),
      };

      const expectedTask = {
        id: 'task-789',
        ...dto,
        status: 'pending',
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.memberTask.create.mockResolvedValue(expectedTask);

      const result = await service.createTask(dto);

      expect(result).toEqual(expectedTask);
      expect(prisma.memberTask.create).toHaveBeenCalledWith({
        data: {
          memberId: dto.memberId,
          counselorId: dto.counselorId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate,
          status: 'pending',
        },
      });
    });
  });

  describe('getMemberTasks', () => {
    it('should get all tasks for a member', async () => {
      const memberId = 'member-123';
      const tasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date('2025-01-15'),
          status: 'pending',
          completedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(tasks);

      const result = await service.getMemberTasks(memberId);

      expect(result).toEqual(tasks);
      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter tasks by status', async () => {
      const memberId = 'member-123';
      const status = 'pending' as MemberTaskStatus;

      mockPrismaService.memberTask.findMany.mockResolvedValue([]);

      await service.getMemberTasks(memberId, status);

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: { memberId, status },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markComplete', () => {
    it('should mark task as completed and emit event', async () => {
      const taskId = 'task-789';
      const existingTask = {
        id: taskId,
        memberId: 'member-123',
        counselorId: 'counselor-456',
        type: 'offline_task',
        title: 'Read Psalm 23',
        description: 'Daily reading',
        dueDate: new Date(),
        status: 'pending',
        completedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const completedTask = {
        ...existingTask,
        status: 'completed',
        completedAt: new Date(),
      };

      mockPrismaService.memberTask.findUnique.mockResolvedValue(existingTask);
      mockPrismaService.memberTask.update.mockResolvedValue(completedTask);

      const result = await service.markComplete(taskId);

      expect(result).toEqual(completedTask);
      expect(prisma.memberTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.completed', {
        memberId: existingTask.memberId,
        taskId: existingTask.id,
        taskType: existingTask.type,
        counselorId: existingTask.counselorId,
        timestamp: expect.any(Date),
      });
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrismaService.memberTask.findUnique.mockResolvedValue(null);

      await expect(service.markComplete('nonexistent')).rejects.toThrow(
        'Task not found',
      );
    });
  });
});
