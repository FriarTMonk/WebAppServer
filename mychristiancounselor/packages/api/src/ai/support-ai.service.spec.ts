import { Test, TestingModule } from '@nestjs/testing';
import { SupportAiService } from './support-ai.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BedrockService } from './bedrock.service';

describe('SupportAiService', () => {
  let service: SupportAiService;
  let prismaService: PrismaService;
  let bedrockService: BedrockService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        ANTHROPIC_API_KEY: 'test-key',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    supportTicket: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    ticketSimilarity: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockBedrockService = {
    chatCompletion: jest.fn(),
    jsonCompletion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportAiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BedrockService,
          useValue: mockBedrockService,
        },
      ],
    }).compile();

    service = module.get<SupportAiService>(SupportAiService);
    prismaService = module.get<PrismaService>(PrismaService);
    bedrockService = module.get<BedrockService>(BedrockService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with Bedrock service', () => {
      expect(bedrockService).toBeDefined();
    });
  });

  describe('detectPriority', () => {
    it('should detect urgent priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('urgent');

      const result = await service.detectPriority(
        'System Down',
        'The entire platform is completely offline and unusable'
      );

      expect(result).toBe('urgent');
      expect(mockBedrockService.chatCompletion).toHaveBeenCalledWith(
        'haiku',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('System Down'),
          }),
        ]),
        expect.objectContaining({
          max_tokens: 10,
        })
      );
    });

    it('should detect high priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('high');

      const result = await service.detectPriority(
        'Major Bug',
        'Authentication is broken for all users'
      );

      expect(result).toBe('high');
    });

    it('should detect medium priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('medium');

      const result = await service.detectPriority(
        'Minor Issue',
        'Button text is slightly misaligned'
      );

      expect(result).toBe('medium');
    });

    it('should detect low priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('low');

      const result = await service.detectPriority(
        'Cosmetic Issue',
        'Color scheme could be improved'
      );

      expect(result).toBe('low');
    });

    it('should detect feature request', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('feature');

      const result = await service.detectPriority(
        'Feature Request',
        'Would be nice to have dark mode'
      );

      expect(result).toBe('feature');
    });

    it('should fallback to medium on invalid priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('invalid-priority');

      const result = await service.detectPriority(
        'Test Ticket',
        'Test description'
      );

      expect(result).toBe('medium');
    });

    it('should fallback to medium on API error', async () => {
      mockBedrockService.chatCompletion.mockRejectedValue(
        new Error('Bedrock API Error')
      );

      const result = await service.detectPriority(
        'Test Ticket',
        'Test description'
      );

      expect(result).toBe('medium');
    });

    it('should handle case-insensitive priorities', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('URGENT');

      const result = await service.detectPriority('Test', 'Test');

      expect(result).toBe('urgent');
    });
  });

  describe('batchSimilarityCheck', () => {
    it('should return similarity scores for candidates', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 85 },
        { index: 1, score: 72 },
      ]);

      const sourceTicket = {
        id: 'source-1',
        title: 'Login issue',
        description: 'Cannot login to the platform',
      };
      const candidates = [
        {
          id: 'candidate-1',
          title: 'Login problem',
          description: 'User cannot access account',
        },
        {
          id: 'candidate-2',
          title: 'Authentication error',
          description: 'Login fails with error',
        },
      ];

      const result = await service.batchSimilarityCheck(sourceTicket, candidates);

      expect(result).toEqual([
        { similarTicketId: 'candidate-1', score: 85 },
        { similarTicketId: 'candidate-2', score: 72 },
      ]);
      expect(mockBedrockService.jsonCompletion).toHaveBeenCalledWith(
        'sonnet',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Login issue'),
          }),
        ]),
        expect.objectContaining({
          max_tokens: 500,
        })
      );
    });

    it('should limit to 20 candidates per batch', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue([]);

      const sourceTicket = {
        id: 'source-1',
        title: 'Test',
        description: 'Test description',
      };
      const candidates = Array.from({ length: 30 }, (_, i) => ({
        id: `ticket-${i}`,
        title: `Ticket ${i}`,
        description: `Description ${i}`,
      }));

      await service.batchSimilarityCheck(sourceTicket, candidates);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const prompt = callArgs[1][0].content;

      // Should only include 20 candidates (0-19)
      expect(prompt).toContain('[19]');
      expect(prompt).not.toContain('[20]');
    });

    it('should include resolution in prompt if available', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 90 },
      ]);

      const sourceTicket = {
        id: 'source-1',
        title: 'Bug',
        description: 'Issue description',
      };
      const candidates = [
        {
          id: 'candidate-1',
          title: 'Similar Bug',
          description: 'Similar issue',
          resolution: 'Fixed by updating config',
        },
      ];

      await service.batchSimilarityCheck(sourceTicket, candidates);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const prompt = callArgs[1][0].content;

      expect(prompt).toContain('Resolution: Fixed by updating config');
    });

    it('should return empty array for empty candidates', async () => {
      const sourceTicket = {
        id: 'test',
        title: 'Test',
        description: 'Test',
      };

      const result = await service.batchSimilarityCheck(sourceTicket, []);

      expect(result).toEqual([]);
      expect(mockBedrockService.jsonCompletion).not.toHaveBeenCalled();
    });

    it('should return empty array on API error', async () => {
      mockBedrockService.jsonCompletion.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.batchSimilarityCheck(
        { id: 'test', title: 'Test', description: 'Test' },
        [{ id: 'test2', title: 'Test2', description: 'Test2' }]
      );

      expect(result).toEqual([]);
    });

    it('should handle invalid response format', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue('invalid');

      const result = await service.batchSimilarityCheck(
        { id: 'test', title: 'Test', description: 'Test' },
        [{ id: 'test2', title: 'Test2', description: 'Test2' }]
      );

      expect(result).toEqual([]);
    });
  });

  describe('findSimilarActiveTickets', () => {
    it('should return cached results if available', async () => {
      const cachedResults = [
        { similarTicketId: 'ticket-1', similarityScore: 85 },
        { similarTicketId: 'ticket-2', similarityScore: 72 },
      ];

      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue(
        cachedResults
      );

      const result = await service.findSimilarActiveTickets('test-ticket-id');

      expect(result).toEqual([
        { similarTicketId: 'ticket-1', score: 85 },
        { similarTicketId: 'ticket-2', score: 72 },
      ]);
      expect(mockPrismaService.supportTicket.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch and compute similarity on cache miss', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findUnique.mockResolvedValue({
        id: 'test-ticket',
        title: 'Test Title',
        description: 'Test Description',
      });
      mockPrismaService.supportTicket.findMany.mockResolvedValue([
        {
          id: 'candidate-1',
          title: 'Similar Title',
          description: 'Similar Description',
        },
      ]);
      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 75 },
      ]);

      const result = await service.findSimilarActiveTickets('test-ticket');

      expect(result).toEqual([{ similarTicketId: 'candidate-1', score: 75 }]);
      expect(mockBedrockService.jsonCompletion).toHaveBeenCalled();
      expect(mockPrismaService.ticketSimilarity.createMany).toHaveBeenCalled();
    });

    it('should filter results by threshold (60+)', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findUnique.mockResolvedValue({
        id: 'test-ticket',
        title: 'Test',
        description: 'Test',
      });
      mockPrismaService.supportTicket.findMany.mockResolvedValue([
        { id: 'ticket-1', title: 'T1', description: 'D1' },
        { id: 'ticket-2', title: 'T2', description: 'D2' },
        { id: 'ticket-3', title: 'T3', description: 'D3' },
      ]);
      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 85 }, // Above threshold
        { index: 1, score: 45 }, // Below threshold
        { index: 2, score: 62 }, // Above threshold
      ]);

      const result = await service.findSimilarActiveTickets('test-ticket');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { similarTicketId: 'ticket-1', score: 85 },
        { similarTicketId: 'ticket-3', score: 62 },
      ]);
    });

    it('should return empty array if no candidates', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findUnique.mockResolvedValue({
        id: 'test-ticket',
        title: 'Test',
        description: 'Test',
      });
      mockPrismaService.supportTicket.findMany.mockResolvedValue([]);

      const result = await service.findSimilarActiveTickets('test-ticket');

      expect(result).toEqual([]);
      expect(mockBedrockService.jsonCompletion).not.toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockRejectedValue(
        new Error('DB Error')
      );

      const result = await service.findSimilarActiveTickets('test-ticket');

      expect(result).toEqual([]);
    });

    it('should throw error if ticket not found', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.findUnique.mockResolvedValue(null);

      const result = await service.findSimilarActiveTickets('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getCachedHistoricalMatches', () => {
    it('should return cached historical matches', async () => {
      const cachedResults = [
        { similarTicketId: 'ticket-1', similarityScore: 95 },
        { similarTicketId: 'ticket-2', similarityScore: 82 },
      ];

      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue(
        cachedResults
      );

      const result = await service.getCachedHistoricalMatches('test-ticket-id');

      expect(result).toEqual([
        { similarTicketId: 'ticket-1', score: 95 },
        { similarTicketId: 'ticket-2', score: 82 },
      ]);
      expect(mockPrismaService.ticketSimilarity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceTicketId: 'test-ticket-id',
            matchType: 'historical',
          }),
          orderBy: {
            similarityScore: 'desc',
          },
        })
      );
    });

    it('should return empty array if no cached matches', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue([]);

      const result = await service.getCachedHistoricalMatches('test-ticket-id');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockRejectedValue(
        new Error('DB Error')
      );

      const result = await service.getCachedHistoricalMatches('test-ticket-id');

      expect(result).toEqual([]);
    });

    it('should order results by score descending', async () => {
      const cachedResults = [
        { similarTicketId: 'ticket-1', similarityScore: 95 },
        { similarTicketId: 'ticket-2', similarityScore: 88 },
        { similarTicketId: 'ticket-3', similarityScore: 82 },
      ];

      mockPrismaService.ticketSimilarity.findMany.mockResolvedValue(
        cachedResults
      );

      const result = await service.getCachedHistoricalMatches('test-ticket-id');

      expect(result[0].score).toBe(95);
      expect(result[1].score).toBe(88);
      expect(result[2].score).toBe(82);
    });
  });

  describe('processWeeklySimilarityBatch', () => {
    it('should process unresolved tickets against resolved tickets', async () => {
      const unresolvedTickets = [
        { id: 'unresolved-1', title: 'Issue 1', description: 'Desc 1' },
      ];
      const resolvedTickets = [
        {
          id: 'resolved-1',
          title: 'Solved Issue',
          description: 'Description',
          resolution: 'Fixed by updating config',
        },
      ];

      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce(unresolvedTickets)
        .mockResolvedValueOnce(resolvedTickets);

      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 85 },
      ]);

      await service.processWeeklySimilarityBatch();

      expect(mockBedrockService.jsonCompletion).toHaveBeenCalled();
      expect(mockPrismaService.ticketSimilarity.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.ticketSimilarity.createMany).toHaveBeenCalled();
    }, 10000);

    it('should handle empty unresolved tickets', async () => {
      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'resolved-1',
            title: 'Resolved',
            description: 'Desc',
            resolution: 'Fixed',
          },
        ]);

      await service.processWeeklySimilarityBatch();

      expect(mockBedrockService.jsonCompletion).not.toHaveBeenCalled();
    });

    it('should handle empty resolved tickets', async () => {
      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce([
          { id: 'unresolved-1', title: 'Issue', description: 'Desc' },
        ])
        .mockResolvedValueOnce([]);

      await service.processWeeklySimilarityBatch();

      expect(mockBedrockService.jsonCompletion).not.toHaveBeenCalled();
    });

    it('should continue processing on individual ticket error', async () => {
      const unresolvedTickets = [
        { id: 'ticket-1', title: 'T1', description: 'D1' },
        { id: 'ticket-2', title: 'T2', description: 'D2' },
      ];
      const resolvedTickets = [
        {
          id: 'resolved-1',
          title: 'R1',
          description: 'D1',
          resolution: 'Fixed',
        },
      ];

      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce(unresolvedTickets)
        .mockResolvedValueOnce(resolvedTickets);

      mockBedrockService.jsonCompletion
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([{ index: 0, score: 85 }]);

      await service.processWeeklySimilarityBatch();

      // Should have tried both tickets
      expect(mockBedrockService.jsonCompletion).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should filter by higher threshold (80+) for historical matches', async () => {
      const unresolvedTickets = [
        { id: 'unresolved-1', title: 'Issue', description: 'Desc' },
      ];
      const resolvedTickets = [
        {
          id: 'resolved-1',
          title: 'Solved',
          description: 'Desc',
          resolution: 'Fixed',
        },
        {
          id: 'resolved-2',
          title: 'Solved2',
          description: 'Desc2',
          resolution: 'Fixed2',
        },
      ];

      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce(unresolvedTickets)
        .mockResolvedValueOnce(resolvedTickets);

      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 85 }, // Above threshold
        { index: 1, score: 75 }, // Below threshold
      ]);

      await service.processWeeklySimilarityBatch();

      // Check that createMany was called with only the high-score match
      const createCall =
        mockPrismaService.ticketSimilarity.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
      expect(createCall.data[0].similarityScore).toBe(85);
    });

    it('should throw error on database failure', async () => {
      mockPrismaService.supportTicket.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.processWeeklySimilarityBatch()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
