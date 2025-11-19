import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Detect priority level for a support ticket using Claude AI
   * @param title Ticket title
   * @param description Ticket description
   * @returns Priority level (urgent/high/medium/low/feature)
   */
  async detectPriority(title: string, description: string): Promise<string> {
    try {
      const prompt = `Analyze this support ticket and classify its priority level.

Ticket Title: ${title}
Ticket Description: ${description}

Priority Levels:
- urgent: System is completely down or unusable
- high: Major functionality is broken affecting multiple users
- medium: Minor issues, glitches, or questions
- low: Cosmetic issues or non-urgent questions
- feature: Feature request or enhancement

Return ONLY the priority level (urgent/high/medium/low/feature) with no explanation.`;

      this.logger.debug('Detecting priority for ticket', { title });

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract text from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const priority = content.text.trim().toLowerCase();

      // Validate priority
      const validPriorities = ['urgent', 'high', 'medium', 'low', 'feature'];
      if (!validPriorities.includes(priority)) {
        this.logger.warn('Invalid priority returned from AI', {
          priority,
          title,
        });
        return 'medium'; // fallback
      }

      this.logger.log('Priority detected', { priority, title });
      return priority;
    } catch (error) {
      this.logger.error('Failed to detect priority', {
        error: error.message,
        title,
      });
      // Fallback to medium on error
      return 'medium';
    }
  }
}
