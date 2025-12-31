import { Test, TestingModule } from '@nestjs/testing';
import { TaskCompletionDetectionService } from './task-completion-detection.service';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';
import { MemberTaskService } from './member-task.service';

describe('TaskCompletionDetectionService', () => {
  let service: TaskCompletionDetectionService;
  let prisma: PrismaService;
  let aiService: CounselingAiService;
  let taskService: MemberTaskService;

  const mockPrismaService = {
    memberTask: {
      findMany: jest.fn(),
    },
  };

  const mockAiService = {
    extractTheologicalThemes: jest.fn(),
  };

  const mockTaskService = {
    markComplete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCompletionDetectionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CounselingAiService, useValue: mockAiService },
        { provide: MemberTaskService, useValue: mockTaskService },
      ],
    }).compile();

    service = module.get<TaskCompletionDetectionService>(
      TaskCompletionDetectionService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<CounselingAiService>(CounselingAiService);
    taskService = module.get<MemberTaskService>(MemberTaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConversationTopicCompletion', () => {
    it('should detect topic match and mark task complete', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about forgiving my father today';

      const pendingTasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date(),
          status: 'pending',
          completedAt: null,
          metadata: { keywords: ['forgiveness', 'forgiving'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(pendingTasks);
      mockAiService.extractTheologicalThemes.mockResolvedValue([
        'Forgiveness',
        'Family Relationships',
      ]);

      await service.checkConversationTopicCompletion(
        memberId,
        conversationText,
      );

      expect(prisma.memberTask.findMany).toHaveBeenCalledWith({
        where: {
          memberId,
          type: 'conversation_prompt',
          status: 'pending',
        },
      });
      expect(aiService.extractTheologicalThemes).toHaveBeenCalledWith(
        conversationText,
      );
      expect(taskService.markComplete).toHaveBeenCalledWith('task-1');
    });

    it('should not mark task complete if topic does not match', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about prayer today';

      const pendingTasks = [
        {
          id: 'task-1',
          memberId,
          counselorId: 'counselor-456',
          type: 'conversation_prompt',
          title: 'Discuss forgiveness',
          description: 'Talk about forgiving others',
          dueDate: new Date(),
          status: 'pending',
          completedAt: null,
          metadata: { keywords: ['forgiveness', 'forgiving'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.memberTask.findMany.mockResolvedValue(pendingTasks);
      mockAiService.extractTheologicalThemes.mockResolvedValue(['Prayer']);

      await service.checkConversationTopicCompletion(
        memberId,
        conversationText,
      );

      expect(taskService.markComplete).not.toHaveBeenCalled();
    });
  });

  describe('handleSessionCompleted', () => {
    it('should check topic completion when session completes', async () => {
      const event = {
        sessionId: 'session-123',
        memberId: 'member-456',
        messageCount: 5,
        timestamp: new Date(),
      };

      const session = {
        id: event.sessionId,
        messages: JSON.stringify([
          { role: 'user', content: 'I want to talk about forgiveness' },
          { role: 'assistant', content: 'Tell me more' },
          { role: 'user', content: 'I forgave my father' },
        ]),
      };

      mockPrismaService.session = {
        findUnique: jest.fn().mockResolvedValue(session),
      };

      const checkSpy = jest
        .spyOn(service, 'checkConversationTopicCompletion')
        .mockResolvedValue(undefined);

      await service.handleSessionCompleted(event);

      expect(checkSpy).toHaveBeenCalledWith(
        event.memberId,
        'I want to talk about forgiveness I forgave my father',
      );
    });
  });
});
