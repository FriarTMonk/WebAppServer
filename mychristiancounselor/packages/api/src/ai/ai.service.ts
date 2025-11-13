import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts/system-prompt';
import { ScriptureReference } from '@mychristiancounselor/shared';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService?.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(
    userMessage: string,
    scriptures: ScriptureReference[],
    conversationHistory: { role: string; content: string }[],
    clarificationCount: number
  ): Promise<{
    requiresClarification: boolean;
    content: string;
  }> {
    const scripturesText = scriptures
      .map(
        (s) =>
          `${s.book} ${s.chapter}:${s.verseStart} (${s.translation}): "${s.text}"`
      )
      .join('\n');

    const historyText = conversationHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const userPrompt = USER_PROMPT_TEMPLATE(
      userMessage,
      scripturesText,
      historyText,
      clarificationCount
    );

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const responseText = completion.choices[0].message.content || '';

      // Try to parse as JSON response
      try {
        const parsed = JSON.parse(responseText);
        return {
          requiresClarification: parsed.requiresClarification || false,
          content: parsed.clarifyingQuestion || parsed.guidance || responseText,
        };
      } catch {
        // If not JSON, treat as direct guidance
        return {
          requiresClarification: false,
          content: responseText,
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Extract scripture references from AI response text
   * Looks for patterns like "John 3:16" or "1 Corinthians 13:4"
   */
  extractScriptureReferences(text: string): Array<{
    book: string;
    chapter: number;
    verse: number;
  }> {
    const pattern = /(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)/g;
    const matches: Array<{ book: string; chapter: number; verse: number }> = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        book: match[1].trim(),
        chapter: parseInt(match[2], 10),
        verse: parseInt(match[3], 10),
      });
    }

    return matches;
  }
}
