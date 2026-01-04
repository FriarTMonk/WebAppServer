import { Test, TestingModule } from '@nestjs/testing';
import { CounselingAiService } from './counseling-ai.service';
import { ConfigService } from '@nestjs/config';
import { BedrockService } from './bedrock.service';

describe('CounselingAiService', () => {
  let service: CounselingAiService;
  let bedrockService: BedrockService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        AWS_REGION: 'us-east-1',
      };
      return config[key];
    }),
  };

  const mockBedrockService = {
    chatCompletion: jest.fn(),
    jsonCompletion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounselingAiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BedrockService,
          useValue: mockBedrockService,
        },
      ],
    }).compile();

    service = module.get<CounselingAiService>(CounselingAiService);
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
    it('should generate response requiring clarification', async () => {
      const mockResponse = {
        requiresClarification: true,
        clarifyingQuestion: 'Can you tell me more about your situation?',
      };

      mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateResponse(
        'I need help with something',
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

    it('should generate guidance response without clarification', async () => {
      const mockResponse = {
        requiresClarification: false,
        guidance: 'Based on scripture, I recommend...',
      };

      mockBedrockService.jsonCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateResponse(
        'I need guidance on forgiveness',
        [],
        [],
        0,
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

    it('should use broad question phase for first question', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: true,
        clarifyingQuestion: 'Broad question',
      });

      await service.generateResponse('Question', [], [], 0, 3);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain('QUESTION PHASE: Broad Understanding');
    });

    it('should use specific question phase for middle questions', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: true,
        clarifyingQuestion: 'Specific question',
      });

      await service.generateResponse('Question', [], [], 1, 3);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain('QUESTION PHASE: Specific Details');
    });

    it('should use critical question phase near limit', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: true,
        clarifyingQuestion: 'Critical question',
      });

      await service.generateResponse('Question', [], [], 2, 3);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain('QUESTION PHASE: Critical Only');
    });

    it('should force answer at question limit', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: false,
        guidance: 'Final answer',
      });

      await service.generateResponse('Question', [], [], 3, 3);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain(
        'You have reached your clarifying question limit'
      );
      expect(systemPrompt).toContain('REQUIRED ACTIONS');
    });

    it('should handle conversation history', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: false,
        guidance: 'Response with context',
      });

      await service.generateResponse(
        'Follow-up question',
        [],
        [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
        ],
        1,
        3
      );

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const userPrompt = callArgs[1].find((m) => m.role === 'user').content;

      expect(userPrompt).toContain('USER: First message');
      expect(userPrompt).toContain('ASSISTANT: First response');
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

    it('should handle subscribed users with 6 questions differently', async () => {
      mockBedrockService.jsonCompletion.mockResolvedValue({
        requiresClarification: true,
        clarifyingQuestion: 'Question',
      });

      // Question 2 of 6 should still be in specific phase
      await service.generateResponse('Question', [], [], 2, 6);

      const callArgs = mockBedrockService.jsonCompletion.mock.calls[0];
      const systemPrompt = callArgs[1].find((m) => m.role === 'system').content;

      expect(systemPrompt).toContain('QUESTION PHASE: Specific Details');
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
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should return general for unmatched themes', () => {
      const result = service.extractTheologicalThemes('Random unrelated topic');
      expect(result).toEqual(['general']);
    });

    it('should be case insensitive', () => {
      const result = service.extractTheologicalThemes('FAITH and SALVATION');
      expect(result).toEqual(expect.arrayContaining(['faith', 'salvation']));
    });

    it('should detect sin theme', () => {
      const result = service.extractTheologicalThemes('I struggle with sin');
      expect(result).toContain('sin');
    });

    it('should detect love theme', () => {
      const result = service.extractTheologicalThemes(
        "I need God's love and compassion"
      );
      expect(result).toContain('love');
    });

    it('should detect hope theme', () => {
      const result = service.extractTheologicalThemes('I have hope in Christ');
      expect(result).toContain('hope');
    });

    it('should detect righteousness theme', () => {
      const result = service.extractTheologicalThemes(
        'Seeking holiness and sanctification'
      );
      expect(result).toContain('righteousness');
    });
  });

  describe('extractScriptureReferences', () => {
    it('should extract simple verse reference', () => {
      const result = service.extractScriptureReferences('Read John 3:16 for guidance');
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
      const result = service.extractScriptureReferences('See John 3:16-18 today');
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
        'Read 1 Corinthians 13:4-7 today'
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

    it('should extract 2 Corinthians', () => {
      const result = service.extractScriptureReferences(
        'See 2 Corinthians 5:17 today'
      );
      expect(result).toEqual([
        {
          book: '2 Corinthians',
          chapter: 5,
          verse: 17,
          verseEnd: undefined,
        },
      ]);
    });

    it('should extract multiple references', () => {
      const result = service.extractScriptureReferences(
        'See Genesis 1:1 and John 3:16 and Romans 8:28'
      );
      expect(result).toHaveLength(3);
      expect(result[0].book).toBe('Genesis');
      expect(result[1].book).toBe('John');
      expect(result[2].book).toBe('Romans');
    });

    it('should extract Psalms', () => {
      const result = service.extractScriptureReferences('Psalms 23:1-6');
      expect(result[0].book).toBe('Psalms');
      expect(result[0].chapter).toBe(23);
    });

    it('should return empty array when no references found', () => {
      const result = service.extractScriptureReferences('No verses here');
      expect(result).toEqual([]);
    });
  });

  describe('detectCrisisContextual', () => {
    it('should detect true crisis with active suicidal ideation', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('true');

      const result = await service.detectCrisisContextual(
        'I am planning to harm myself tonight with a specific plan'
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

    it('should not flag questions about God as crisis', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectCrisisContextual('Where are you God?');

      expect(result).toBe(false);
    });

    it('should not flag spiritual doubt as crisis', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectCrisisContextual(
        'I feel distant from God lately'
      );

      expect(result).toBe(false);
    });

    it('should not flag metaphorical language as crisis', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectCrisisContextual(
        "This situation is killing me inside"
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

      const result = await service.detectCrisisContextual(
        'I have a plan to end my life'
      );

      expect(result).toBe(true);
    });

    it('should trim response before comparison', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('  true  ');

      const result = await service.detectCrisisContextual('Crisis message');

      expect(result).toBe(true);
    });
  });

  describe('detectGriefContextual', () => {
    it('should detect true grief from recent loss', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('true');

      const result = await service.detectGriefContextual(
        'My mother died last month and I cannot cope with the loss'
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

    it('should detect grief from recent spouse death', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('true');

      const result = await service.detectGriefContextual(
        'Just lost my husband two weeks ago, how do I go on?'
      );

      expect(result).toBe(true);
    });

    it('should not flag spiritual distance as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual(
        'I feel so distant from God right now'
      );

      expect(result).toBe(false);
    });

    it('should not flag general loneliness as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual('I feel so alone');

      expect(result).toBe(false);
    });

    it('should not flag seeking God as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual(
        'Why is God silent when I need Him?'
      );

      expect(result).toBe(false);
    });

    it('should not flag general hard times as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual(
        "I'm going through a really hard time right now"
      );

      expect(result).toBe(false);
    });

    it('should not flag past processed loss as grief', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('false');

      const result = await service.detectGriefContextual(
        'I lost my father five years ago but have found peace'
      );

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockBedrockService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await service.detectGriefContextual('Some message');

      expect(result).toBe(false);
    });

    it('should handle case-insensitive response', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('TRUE');

      const result = await service.detectGriefContextual(
        'My child died last week'
      );

      expect(result).toBe(true);
    });

    it('should trim response before comparison', async () => {
      mockBedrockService.chatCompletion.mockResolvedValue('  false  ');

      const result = await service.detectGriefContextual('Some message');

      expect(result).toBe(false);
    });
  });
});
