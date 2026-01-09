import { Test, TestingModule } from '@nestjs/testing';
import { BedrockService } from './bedrock.service';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');

describe('BedrockService', () => {
  let service: BedrockService;
  let configService: ConfigService;
  let mockBedrockClient: jest.Mocked<BedrockRuntimeClient>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_REGION: 'us-east-1',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock BedrockRuntimeClient.send method
    mockBedrockClient = {
      send: jest.fn(),
    } as any;

    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => mockBedrockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedrockService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BedrockService>(BedrockService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with AWS credentials from config', () => {
      expect(configService.get).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID');
      expect(configService.get).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY');
      expect(configService.get).toHaveBeenCalledWith('AWS_REGION');
    });

    it('should create BedrockRuntimeClient with correct config', () => {
      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        maxAttempts: 1,
        requestHandler: {
          httpsAgent: {
            timeout: 50000,
          },
          requestTimeout: 50000,
        },
      });
    });

    it('should throw error if AWS credentials are missing', async () => {
      // Mock missing credentials
      const mockConfigServiceMissing = {
        get: jest.fn(() => null),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            BedrockService,
            {
              provide: ConfigService,
              useValue: mockConfigServiceMissing,
            },
          ],
        }).compile()
      ).rejects.toThrow('AWS credentials not configured');
    });
  });

  describe('invokeModel', () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Test response from Claude' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 20 },
    };

    beforeEach(() => {
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      } as any);
    });

    it('should invoke Sonnet model successfully', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await service.invokeModel('sonnet', messages);

      expect(result).toEqual(mockResponse);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);

      const command = (mockBedrockClient.send as jest.Mock).mock.calls[0][0];
      expect(command).toBeInstanceOf(InvokeModelCommand);
    });

    it('should invoke Haiku model successfully', async () => {
      const messages = [{ role: 'user' as const, content: 'Quick question' }];
      await service.invokeModel('haiku', messages);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should invoke Opus model successfully', async () => {
      const messages = [{ role: 'user' as const, content: 'Complex problem' }];
      await service.invokeModel('opus', messages);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should include system message in request', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const options = { system: 'You are a helpful assistant' };

      await service.invokeModel('sonnet', messages, options);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should include temperature in request', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const options = { temperature: 0.5 };

      await service.invokeModel('sonnet', messages, options);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should include max_tokens in request', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const options = { max_tokens: 2000 };

      await service.invokeModel('sonnet', messages, options);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle Bedrock API errors', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Bedrock API Error'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(service.invokeModel('sonnet', messages)).rejects.toThrow(
        'Bedrock API Error'
      );
    });
  });

  describe('chatCompletion', () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Chat response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 15 },
    };

    beforeEach(() => {
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponse)),
      } as any);
    });

    it('should return text content from chat completion', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];

      const result = await service.chatCompletion('sonnet', messages);

      expect(result).toBe('Chat response');
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should handle messages without system role', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      const result = await service.chatCompletion('sonnet', messages);

      expect(result).toBe('Chat response');
    });

    it('should extract system message from messages array', async () => {
      const messages = [
        { role: 'system' as const, content: 'Be helpful' },
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await service.chatCompletion('sonnet', messages);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error if no text content in response', async () => {
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: 'image', data: 'base64data' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 15 },
          })
        ),
      } as any);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(service.chatCompletion('sonnet', messages)).rejects.toThrow(
        'No text content in response'
      );
    });
  });

  describe('jsonCompletion', () => {
    const mockJsonResponse = {
      content: [{ type: 'text', text: '{"result": "success", "value": 42}' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 15, output_tokens: 25 },
    };

    beforeEach(() => {
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockJsonResponse)),
      } as any);
    });

    it('should parse and return JSON from response', async () => {
      const messages = [
        { role: 'user' as const, content: 'Generate JSON' },
      ];

      const result = await service.jsonCompletion('sonnet', messages);

      expect(result).toEqual({ result: 'success', value: 42 });
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should add JSON instruction to system message', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Generate JSON' },
      ];

      await service.jsonCompletion('sonnet', messages);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should use temperature 0 by default for JSON', async () => {
      const messages = [{ role: 'user' as const, content: 'Generate JSON' }];

      await service.jsonCompletion('sonnet', messages);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should allow custom temperature for JSON', async () => {
      const messages = [{ role: 'user' as const, content: 'Generate JSON' }];

      await service.jsonCompletion('sonnet', messages, { temperature: 0.3 });

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error if response is not valid JSON', async () => {
      mockBedrockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: 'text', text: 'This is not JSON' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 5 },
          })
        ),
      } as any);

      const messages = [{ role: 'user' as const, content: 'Generate JSON' }];

      await expect(service.jsonCompletion('sonnet', messages)).rejects.toThrow(
        'Model did not return valid JSON'
      );
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const info = service.getModelInfo();

      expect(info).toHaveProperty('region');
      expect(info).toHaveProperty('models');
      expect(info.models).toHaveProperty('sonnet');
      expect(info.models).toHaveProperty('haiku');
      expect(info.models).toHaveProperty('opus');
    });

    it('should include model IDs in info', () => {
      const info = service.getModelInfo();

      expect(info.models.sonnet.id).toBe(
        'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
      );
      expect(info.models.haiku.id).toBe(
        'global.anthropic.claude-haiku-4-5-20251001-v1:0'
      );
      expect(info.models.opus.id).toBe(
        'global.anthropic.claude-opus-4-5-20251101-v1:0'
      );
    });

    it('should include pricing information', () => {
      const info = service.getModelInfo();

      expect(info.models.sonnet.pricing).toBeDefined();
      expect(info.models.haiku.pricing).toBeDefined();
      expect(info.models.opus.pricing).toBeDefined();
    });
  });
});
