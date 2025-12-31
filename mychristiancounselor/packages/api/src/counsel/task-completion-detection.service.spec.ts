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
    session: {
      findUnique: jest.fn(),
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

    it('should handle Prisma query failure', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about forgiveness';

      mockPrismaService.memberTask.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.checkConversationTopicCompletion(memberId, conversationText),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle AI service failure', async () => {
      const memberId = 'member-123';
      const conversationText = 'I talked about forgiveness';

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
      mockAiService.extractTheologicalThemes.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(
        service.checkConversationTopicCompletion(memberId, conversationText),
      ).rejects.toThrow('AI service unavailable');
    });

    it('should handle taskService.markComplete failure', async () => {
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
      mockTaskService.markComplete.mockRejectedValue(
        new Error('Failed to mark task complete'),
      );

      await expect(
        service.checkConversationTopicCompletion(memberId, conversationText),
      ).rejects.toThrow('Failed to mark task complete');
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
        userId: event.memberId,
        title: 'Test Session',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredTranslation: 'ASV',
        topics: [],
        archivedAt: null,
        deletedAt: null,
        questionCount: 3,
        messages: [
          {
            id: 'msg-1',
            sessionId: event.sessionId,
            role: 'user',
            content: 'I want to talk about forgiveness',
            scriptureReferences: [],
            constitutionalReferences: [],
            timestamp: new Date(),
            isClarifyingQuestion: false,
            crisisResources: null,
            griefResources: null,
          },
          {
            id: 'msg-2',
            sessionId: event.sessionId,
            role: 'assistant',
            content: 'Tell me more',
            scriptureReferences: [],
            constitutionalReferences: [],
            timestamp: new Date(),
            isClarifyingQuestion: false,
            crisisResources: null,
            griefResources: null,
          },
          {
            id: 'msg-3',
            sessionId: event.sessionId,
            role: 'user',
            content: 'I forgave my father',
            scriptureReferences: [],
            constitutionalReferences: [],
            timestamp: new Date(),
            isClarifyingQuestion: false,
            crisisResources: null,
            griefResources: null,
          },
        ],
      };

      mockPrismaService.session.findUnique.mockResolvedValue(session);

      const checkSpy = jest
        .spyOn(service, 'checkConversationTopicCompletion')
        .mockResolvedValue(undefined);

      await service.handleSessionCompleted(event);

      expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: event.sessionId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      expect(checkSpy).toHaveBeenCalledWith(
        event.memberId,
        'I want to talk about forgiveness I forgave my father',
      );
    });

    it('should handle session not found', async () => {
      const event = {
        sessionId: 'session-123',
        memberId: 'member-456',
        messageCount: 5,
        timestamp: new Date(),
      };

      mockPrismaService.session.findUnique.mockResolvedValue(null);

      const checkSpy = jest
        .spyOn(service, 'checkConversationTopicCompletion')
        .mockResolvedValue(undefined);

      await service.handleSessionCompleted(event);

      expect(checkSpy).not.toHaveBeenCalled();
    });

    it('should not crash if checkConversationTopicCompletion throws error', async () => {
      const event = {
        sessionId: 'session-123',
        memberId: 'member-456',
        messageCount: 5,
        timestamp: new Date(),
      };

      const session = {
        id: event.sessionId,
        userId: event.memberId,
        title: 'Test Session',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredTranslation: 'ASV',
        topics: [],
        archivedAt: null,
        deletedAt: null,
        questionCount: 1,
        messages: [
          {
            id: 'msg-1',
            sessionId: event.sessionId,
            role: 'user',
            content: 'I want to talk about forgiveness',
            scriptureReferences: [],
            constitutionalReferences: [],
            timestamp: new Date(),
            isClarifyingQuestion: false,
            crisisResources: null,
            griefResources: null,
          },
        ],
      };

      mockPrismaService.session.findUnique.mockResolvedValue(session);

      const checkSpy = jest
        .spyOn(service, 'checkConversationTopicCompletion')
        .mockRejectedValue(new Error('Internal error'));

      // Should not throw - error is caught and logged
      await expect(
        service.handleSessionCompleted(event),
      ).resolves.not.toThrow();

      expect(checkSpy).toHaveBeenCalled();
    });
  });
});
