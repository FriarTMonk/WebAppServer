import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BedrockService } from './bedrock.service';

describe('AiService', () => {
  let service: AiService;
  let prismaService: PrismaService;
  let bedrockService: BedrockService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        OPENAI_API_KEY: 'test-key',
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
        AiService,
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

    service = module.get<AiService>(AiService);
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

  describe('generateResponse', () => {
    it('should generate a counseling response requiring clarification', async () => {
      const mockResponse = {
        requiresClarification: true,
        clarifyingQuestion: 'Can you tell me more about your situation?',
      };

      mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateResponse(
        'I need help',
        [],
        [],
        0,
        3
      );

      expect(result).toEqual({
        requiresClarification: true,
        content: 'Can you tell me more about your situation?',
      });
      expect(mockBedrockService.jsonCompletion).toHaveBeenCalledWith(
        'sonnet',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 800,
        })
      );
    });

    it('should generate a guidance response without clarification', async () => {
      const mockResponse = {
        requiresClarification: false,
        guidance: 'Based on scripture, I recommend...',
      };

      mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateResponse(
        'I need guidance on forgiveness',
        [
          {
            book: 'Matthew',
            chapter: 6,
            verseStart: 14,
            verseEnd: 15,
            translation: 'NIV',
            text: 'For if you forgive other people...',
          },
        ],
        [{ role: 'user', content: 'Previous message' }],
        1,
        3
      );

      expect(result).toEqual({
        requiresClarification: false,
        content: 'Based on scripture, I recommend...',
      });
    });

    it('should include scripture references in prompt', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: false,
        guidance: 'Guidance text',
      });

      await service.generateResponse(
        'Help me understand grace',
        [
          {
            book: 'Ephesians',
            chapter: 2,
            verseStart: 8,
            verseEnd: 9,
            translation: 'ESV',
            text: 'For by grace you have been saved...',
          },
        ],
        [],
        0,
        3
      );

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const userPrompt = callArgs[1].find((m) => m.role === 'user').content;

      expect(userPrompt).toContain('Ephesians 2:8 (ESV)');
    });

    it('should enforce question limit in system prompt', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: false,
        guidance: 'Final answer',
      });

      await service.generateResponse('Question', [], [], 3, 3);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain(
        'You have reached the maximum number of clarifying questions'
      );
    });

    it('should retry on failure', async () => {
      // Mock first call to fail with retryable error, second to succeed
      const networkError = new Error('Network timeout error');
      mockBedrockService.jsonCompletion
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          requiresClarification: false,
          guidance: 'Success on retry',
        });

      const result = await service.generateResponse('Test', [], [], 0, 3);

      expect(result.content).toBe('Success on retry');
      expect(mockBedrockService.jsonCompletion).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractTheologicalThemes', () => {
    it('should extract single theme', () => {
      const result = service.extractTheologicalThemes('I need forgiveness');
      expect(result).toContain('forgiveness');
    });

    it('should extract multiple themes', () => {
      const result = service.extractTheologicalThemes(
        'I pray for grace and mercy in my suffering'
      );
      expect(result).toEqual(expect.arrayContaining(['prayer', 'grace', 'suffering']));
    });

    it('should return general for unmatched themes', () => {
      const result = service.extractTheologicalThemes('Random topic');
      expect(result).toEqual(['general']);
    });

    it('should be case insensitive', () => {
      const result = service.extractTheologicalThemes('FAITH and SALVATION');
      expect(result).toEqual(expect.arrayContaining(['faith', 'salvation']));
    });
  });

  describe('extractScriptureReferences', () => {
    it('should extract simple verse reference', () => {
      const result = service.extractScriptureReferences('Consider John 3:16 for guidance');
      expect(result).toEqual([
        {
          book: 'John',
          chapter: 3,
          verse: 16,
          verseEnd: undefined,
        },
      ]);
    });

    it('should extract verse range', () => {
      const result = service.extractScriptureReferences('Consider John 3:16-18 today');
      expect(result).toEqual([
        {
          book: 'John',
          chapter: 3,
          verse: 16,
          verseEnd: 18,
        },
      ]);
    });

    it('should extract numbered books', () => {
      const result = service.extractScriptureReferences(
        'Consider 1 Corinthians 13:4-7 today'
      );
      expect(result).toEqual([
        {
          book: '1 Corinthians',
          chapter: 13,
          verse: 4,
          verseEnd: 7,
        },
      ]);
    });

    it('should extract multiple references', () => {
      const result = service.extractScriptureReferences(
        'Consider Genesis 1:1, also John 3:16, and Romans 8:28'
      );
      expect(result).toHaveLength(3);
      expect(result[0].book).toBe('Genesis');
      expect(result[1].book).toBe('John');
      expect(result[2].book).toBe('Romans');
    });

    it('should return empty array when no references found', () => {
      const result = service.extractScriptureReferences('No verses here');
      expect(result).toEqual([]);
    });
  });

  describe('detectCrisisContextual', () => {
    it('should detect true crisis', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('true');

      const result = await service.detectCrisisContextual(
        'I am planning to harm myself tonight'
      );

      expect(result).toBe(true);
      expect(mockBedrockService.chatCompletion).toHaveBeenCalledWith(
        'haiku',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Active suicidal ideation'),
          }),
        ]),
        expect.objectContaining({
          temperature: 0.1,
          max_tokens: 10,
        })
      );
    });

    it('should not flag spiritual seeking as crisis', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectCrisisContextual(
        'God, are you listening to me?'
      );

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockBedrockService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await service.detectCrisisContextual('Some message');

      expect(result).toBe(false);
    });

    it('should handle case-insensitive response', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('TRUE');

      const result = await service.detectCrisisContextual('Crisis message');

      expect(result).toBe(true);
    });
  });

  describe('detectGriefContextual', () => {
    it('should detect true grief from recent loss', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('true');

      const result = await service.detectGriefContextual(
        'My mother died last month and I cannot cope'
      );

      expect(result).toBe(true);
      expect(mockBedrockService.chatCompletion).toHaveBeenCalledWith(
        'haiku',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('RECENT ACTUAL LOSS'),
          }),
        ]),
        expect.objectContaining({
          temperature: 0.1,
          max_tokens: 10,
        })
      );
    });

    it('should not flag spiritual distance as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual(
        'I feel so distant from God'
      );

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockBedrockService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await service.detectGriefContextual('Some message');

      expect(result).toBe(false);
    });
  });

  describe('detectPriority', () => {
    it('should detect urgent priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('urgent');

      const result = await service.detectPriority(
        'System Down',
        'The entire platform is offline'
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

    it('should detect feature request', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('feature');

      const result = await service.detectPriority(
        'Feature Request',
        'Would be nice to have dark mode'
      );

      expect(result).toBe('feature');
    });

    it('should fallback to medium on invalid priority', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('invalid');

      const result = await service.detectPriority('Test', 'Test description');

      expect(result).toBe('medium');
    });

    it('should fallback to medium on error', async () => {
      mockBedrockService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await service.detectPriority('Test', 'Test description');

      expect(result).toBe('medium');
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
        description: 'Cannot login',
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
          description: 'Login fails',
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

    it('should limit to 20 candidates', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue([]);

      const sourceTicket = {
        id: 'source-1',
        title: 'Test',
        description: 'Test',
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

    it('should return empty array on error', async () => {
      mockBedrockService.jsonCompletion.mockRejectedValue(
        new Error('API Error')
      );

      const result = await service.batchSimilarityCheck(
        { id: 'test', title: 'Test', description: 'Test' },
        [{ id: 'test2', title: 'Test2', description: 'Test2' }]
      );

      expect(result).toEqual([]);
    });

    it('should return empty array for empty candidates', async () => {
      const result = await service.batchSimilarityCheck(
        { id: 'test', title: 'Test', description: 'Test' },
        []
      );

      expect(result).toEqual([]);
      expect(mockBedrockService.jsonCompletion).not.toHaveBeenCalled();
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

    it('should fetch and compute similarity if cache miss', async () => {
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
      ]);
      mockBedrockService.jsonCompletion.mockResolvedValue([
        { index: 0, score: 85 }, // Above threshold
        { index: 1, score: 45 }, // Below threshold
      ]);

      const result = await service.findSimilarActiveTickets('test-ticket');

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(85);
    });

    it('should return empty array on error', async () => {
      mockPrismaService.ticketSimilarity.findMany.mockRejectedValue(
        new Error('DB Error')
      );

      const result = await service.findSimilarActiveTickets('test-ticket');

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
          resolution: 'Fixed',
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

    it('should handle empty tickets gracefully', async () => {
      mockPrismaService.supportTicket.findMany
        .mockResolvedValueOnce([])
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
        { id: 'resolved-1', title: 'R1', description: 'D1', resolution: 'Fixed' },
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
  });
});
