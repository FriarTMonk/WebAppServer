import { Test, TestingModule } from '@nestjs/testing';
import { SessionSummaryService } from './session-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CounselingAiService } from '../ai/counseling-ai.service';

describe('SessionSummaryService', () => {
  let service: SessionSummaryService;

  const mockPrisma = {
    sessionSummary: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
  };

  const mockAiService = {
    chatCompletion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionSummaryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CounselingAiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<SessionSummaryService>(SessionSummaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSummary', () => {
    it('should generate AI summary for conversation', async () => {
      const sessionId = 'session-123';
      const memberId = 'member-123';

      mockPrisma.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId: memberId,
        messages: JSON.stringify([
          { role: 'user', content: 'I feel anxious about my job' },
          { role: 'assistant', content: 'Tell me more about that anxiety' },
          { role: 'user', content: 'I worry about losing my job' },
          { role: 'assistant', content: 'Let me share some scripture about worry' },
        ]),
      });

      const aiResponseJson = JSON.stringify({
        summary: 'Member expressed anxiety about job security. Discussed Biblical perspectives on worry and trust in God.',
        topics: ['anxiety', 'worry', 'trust', 'work'],
        sentiment: 'negative',
      });

      mockAiService.chatCompletion.mockResolvedValue(aiResponseJson);

      mockPrisma.sessionSummary.create.mockResolvedValue({
        id: 'summary-123',
        sessionId,
        memberId,
        summary: 'Member expressed anxiety about job security. Discussed Biblical perspectives on worry and trust in God.',
        topics: ['anxiety', 'worry', 'trust', 'work'],
        sentiment: 'negative',
        createdAt: new Date(),
      });

      const result = await service.generateSummary(sessionId, memberId);

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
      expect(mockAiService.chatCompletion).toHaveBeenCalled();
      expect(mockPrisma.sessionSummary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          memberId,
          summary: expect.any(String),
          topics: expect.any(Array),
          sentiment: expect.any(String),
        }),
      });
      expect(result.summary).toContain('anxiety');
      expect(result.topics).toContain('anxiety');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const sessionId = 'session-123';
      const memberId = 'member-123';

      mockPrisma.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId: memberId,
        messages: JSON.stringify([
          { role: 'user', content: 'I need help' },
          { role: 'assistant', content: 'How can I help you?' },
        ]),
      });

      // AI returns invalid JSON
      mockAiService.chatCompletion.mockResolvedValue('This is not valid JSON');

      mockPrisma.sessionSummary.create.mockResolvedValue({
        id: 'summary-123',
        sessionId,
        memberId,
        summary: 'This is not valid JSON',
        topics: [],
        sentiment: 'neutral',
        createdAt: new Date(),
      });

      const result = await service.generateSummary(sessionId, memberId);

      expect(result.summary).toBe('This is not valid JSON');
      expect(result.topics).toEqual([]);
      expect(result.sentiment).toBe('neutral');
    });

    it('should throw error if session not found', async () => {
      const sessionId = 'nonexistent-session';
      const memberId = 'member-123';

      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.generateSummary(sessionId, memberId)).rejects.toThrow(
        `Session ${sessionId} not found`
      );
    });
  });

  describe('getSummary', () => {
    it('should retrieve summary for a session', async () => {
      const sessionId = 'session-123';

      const mockSummary = {
        id: 'summary-123',
        sessionId,
        memberId: 'member-123',
        summary: 'Test summary',
        topics: ['test'],
        sentiment: 'neutral',
        createdAt: new Date(),
      };

      mockPrisma.sessionSummary.findUnique.mockResolvedValue(mockSummary);

      const result = await service.getSummary(sessionId);

      expect(mockPrisma.sessionSummary.findUnique).toHaveBeenCalledWith({
        where: { sessionId },
      });
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getRecentSummaries', () => {
    it('should retrieve recent summaries with default limit', async () => {
      const memberId = 'member-123';

      const mockSummaries = [
        {
          id: 'summary-1',
          sessionId: 'session-1',
          memberId,
          summary: 'Summary 1',
          topics: ['topic1'],
          sentiment: 'positive',
          createdAt: new Date(),
        },
        {
          id: 'summary-2',
          sessionId: 'session-2',
          memberId,
          summary: 'Summary 2',
          topics: ['topic2'],
          sentiment: 'neutral',
          createdAt: new Date(),
        },
      ];

      mockPrisma.sessionSummary.findMany.mockResolvedValue(mockSummaries);

      const result = await service.getRecentSummaries(memberId);

      expect(mockPrisma.sessionSummary.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      expect(result).toEqual(mockSummaries);
    });

    it('should retrieve recent summaries with custom limit', async () => {
      const memberId = 'member-123';
      const limit = 10;

      mockPrisma.sessionSummary.findMany.mockResolvedValue([]);

      await service.getRecentSummaries(memberId, limit);

      expect(mockPrisma.sessionSummary.findMany).toHaveBeenCalledWith({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });
});
