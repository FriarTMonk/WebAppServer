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

  // Claude 4.5 model IDs using cross-region inference profiles
  // Cross-region inference profiles (global.* prefix) support on-demand throughput
  private readonly MODELS = {
    SONNET: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
    HAIKU: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    OPUS: 'global.anthropic.claude-opus-4-5-20251101-v1:0',
  };

  constructor(private configService: ConfigService) {
    // Get AWS credentials from environment
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    // Initialize Bedrock client with timeout configuration
    // Environment variables are always strings, so parse to number
    const bedrockTimeoutMs = parseInt(this.configService.get<string>('BEDROCK_TIMEOUT_MS') || '50000', 10);
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Configurable request timeout (default 50s)
      // Should be less than Node.js server timeout to ensure proper error handling
      requestHandler: {
        requestTimeout: bedrockTimeoutMs,
        httpsAgent: {
          timeout: bedrockTimeoutMs,
        },
      },
      maxAttempts: 1, // Disable SDK retries (we handle retries at application level)
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

      // Validate response
      if (!response || !response.body) {
        throw new Error('Bedrock returned empty response');
      }

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Validate response structure
      if (!responseBody || !responseBody.content) {
        this.logger.error('Invalid Bedrock response structure:', JSON.stringify(responseBody));
        throw new Error('Bedrock response missing content');
      }

      if (!responseBody.usage) {
        this.logger.warn('Bedrock response missing usage data');
      } else {
        this.logger.debug(`Bedrock response received (tokens: ${responseBody.usage.input_tokens}/${responseBody.usage.output_tokens})`);
      }

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

    // Validate response has content
    if (!response || !response.content || !Array.isArray(response.content)) {
      this.logger.error('Invalid response structure from invokeModel:', JSON.stringify(response));
      throw new Error('Invalid response structure from Bedrock');
    }

    // Extract text from first content block
    const textContent = response.content.find(c => c && c.type === 'text' && c.text);
    if (!textContent || !textContent.text) {
      this.logger.error('No text content in response:', JSON.stringify(response.content));
      throw new Error('No text content in response');
    }

    return textContent.text;
  }

  /**
   * JSON mode - forces model to return valid JSON
   * Useful for structured outputs
   * Returns both the parsed JSON and usage metadata
   */
  async jsonCompletion(
    model: 'sonnet' | 'haiku' | 'opus',
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      max_tokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    data: any;
    usage: { input_tokens: number; output_tokens: number };
    modelId: string;
  }> {
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
      const rawText = textContent.text.trim();
      let jsonText = this.extractJSON(rawText);

      // Get the actual model ID used
      const modelId = model === 'sonnet'
        ? this.MODELS.SONNET
        : model === 'haiku'
        ? this.MODELS.HAIKU
        : this.MODELS.OPUS;

      return {
        data: JSON.parse(jsonText),
        usage: response.usage,
        modelId,
      };
    } catch (error) {
      this.logger.error(`Failed to parse JSON response. Raw response (first 1000 chars): ${textContent.text.substring(0, 1000)}`);
      this.logger.error(`Extracted text (first 1000 chars): ${this.extractJSON(textContent.text.trim()).substring(0, 1000)}`);
      this.logger.error(`Parse error: ${error.message}`);
      throw new Error('Model did not return valid JSON');
    }
  }

  /**
   * Intelligently extract JSON from text that may contain markdown or other formatting
   */
  private extractJSON(text: string): string {
    // Remove leading/trailing whitespace
    let cleaned = text.trim();

    // Strategy 1: Try to strip markdown code fences with language identifier (newline optional)
    if (cleaned.match(/^```(?:json|JSON)\s*/)) {
      cleaned = cleaned.replace(/^```(?:json|JSON)\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    // Strategy 2: Try to strip generic markdown code fences (newline optional)
    else if (cleaned.match(/^```\s*/)) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    // Strategy 3: Look for JSON embedded within markdown code blocks anywhere in text
    else {
      const markdownMatch = cleaned.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
      if (markdownMatch) {
        cleaned = markdownMatch[1].trim();
      }
    }

    // Strategy 4: If still no valid JSON start, try to find JSON object/array in the text
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      // Look for first { or [ and try to extract from there
      const objectMatch = cleaned.match(/(\{[\s\S]*\})/);
      const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);

      if (objectMatch) {
        cleaned = objectMatch[1];
      } else if (arrayMatch) {
        cleaned = arrayMatch[1];
      }
    }

    // Strategy 5: Remove any trailing non-JSON text after the last } or ]
    if (cleaned.includes('}')) {
      const lastBrace = cleaned.lastIndexOf('}');
      cleaned = cleaned.substring(0, lastBrace + 1);
    } else if (cleaned.includes(']')) {
      const lastBracket = cleaned.lastIndexOf(']');
      cleaned = cleaned.substring(0, lastBracket + 1);
    }

    return cleaned.trim();
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
