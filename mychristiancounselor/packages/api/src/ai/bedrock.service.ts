import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

/**
 * AWS Bedrock Service - HIPAA-Compliant AI Provider
 *
 * This service wraps AWS Bedrock to provide Claude AI capabilities
 * with full HIPAA compliance through AWS BAA.
 *
 * Benefits:
 * - HIPAA-compliant (covered by AWS BAA)
 * - Data never leaves AWS infrastructure
 * - Model providers have NO access to data
 * - Same Claude models as Anthropic direct
 */
@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly region: string;

  // Claude 4.5 model IDs on AWS Bedrock (from your console)
  private readonly MODELS = {
    SONNET: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    HAIKU: 'anthropic.claude-haiku-4-5-20251001-v1:0',
    OPUS: 'anthropic.claude-opus-4-5-20251101-v1:0',
  };

  constructor(private configService: ConfigService) {
    // Get AWS credentials from environment
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    // Initialize Bedrock client
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`✅ AWS Bedrock initialized (region: ${this.region})`);
    this.logger.log(`✅ HIPAA-compliant AI ready`);
  }

  /**
   * Invoke Claude model via Bedrock
   *
   * @param model - 'sonnet', 'haiku', or 'opus'
   * @param messages - Array of message objects with role and content
   * @param options - Additional options (max_tokens, temperature, etc.)
   */
  async invokeModel(
    model: 'sonnet' | 'haiku' | 'opus',
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      system?: string;
    } = {}
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    // Select model ID
    const modelId = model === 'sonnet'
      ? this.MODELS.SONNET
      : model === 'haiku'
      ? this.MODELS.HAIKU
      : this.MODELS.OPUS;

    // Prepare request body in Bedrock format
    const requestBody: any = {
      anthropic_version: 'bedrock-2023-05-31',
      messages,
      max_tokens: options.max_tokens || 4096,
    };

    // Add optional parameters
    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }
    if (options.top_p !== undefined) {
      requestBody.top_p = options.top_p;
    }
    if (options.system) {
      requestBody.system = options.system;
    }

    // Create invoke command
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      this.logger.debug(`Invoking Bedrock model: ${modelId}`);

      // Invoke the model
      const response = await this.bedrockClient.send(command);

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      this.logger.debug(`Bedrock response received (tokens: ${responseBody.usage.input_tokens}/${responseBody.usage.output_tokens})`);

      return responseBody;
    } catch (error) {
      this.logger.error(`Bedrock invocation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Chat completion - similar to OpenAI/Anthropic interface
   * Returns just the text content for easy migration
   */
  async chatCompletion(
    model: 'sonnet' | 'haiku' | 'opus',
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
    } = {}
  ): Promise<string> {
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Invoke model
    const response = await this.invokeModel(
      model,
      userMessages,
      {
        ...options,
        system: systemMessage?.content,
      }
    );

    // Extract text from first content block
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) {
      throw new Error('No text content in response');
    }

    return textContent.text;
  }

  /**
   * JSON mode - forces model to return valid JSON
   * Useful for structured outputs
   */
  async jsonCompletion(
    model: 'sonnet' | 'haiku' | 'opus',
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      max_tokens?: number;
      temperature?: number;
    } = {}
  ): Promise<any> {
    // Add JSON instruction to system message
    const systemMessage = messages.find(msg => msg.role === 'system');
    const enhancedSystem = systemMessage
      ? `${systemMessage.content}\n\nIMPORTANT: You MUST respond with valid JSON only. No other text before or after the JSON.`
      : 'You MUST respond with valid JSON only. No other text before or after the JSON.';

    const userMessages = messages.filter(msg => msg.role !== 'system');

    // Invoke model
    const response = await this.invokeModel(
      model,
      userMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        ...options,
        system: enhancedSystem,
        temperature: options.temperature ?? 0, // Lower temperature for JSON
      }
    );

    // Extract and parse JSON
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent) {
      throw new Error('No text content in response');
    }

    try {
      return JSON.parse(textContent.text);
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${textContent.text}`);
      throw new Error('Model did not return valid JSON');
    }
  }

  /**
   * Get model usage statistics
   */
  getModelInfo() {
    return {
      region: this.region,
      models: {
        sonnet: {
          id: this.MODELS.SONNET,
          description: 'Claude Sonnet 4.5 - Best balance of quality and speed',
          pricing: '$3/$15 per million tokens (input/output)',
        },
        haiku: {
          id: this.MODELS.HAIKU,
          description: 'Claude Haiku 4.5 - Fast and economical',
          pricing: '$0.25/$1.25 per million tokens (input/output)',
        },
        opus: {
          id: this.MODELS.OPUS,
          description: 'Claude Opus 4.5 - Most powerful reasoning',
          pricing: '$15/$75 per million tokens (input/output)',
        },
      },
    };
  }
}
