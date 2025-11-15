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
    clarificationCount: number,
    userName?: string,
    currentQuestionCount: number = 0,
    maxClarifyingQuestions: number = 3
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
      clarificationCount,
      userName
    );

    // Construct enhanced system prompt with question limits
    const questionLimitGuidance = `

IMPORTANT: You may ask clarifying questions to better understand the user's situation.
- Current clarifying questions asked: ${currentQuestionCount}
- Maximum clarifying questions allowed: ${maxClarifyingQuestions}
- Remaining questions you can ask: ${maxClarifyingQuestions - currentQuestionCount}

${currentQuestionCount >= maxClarifyingQuestions
  ? 'You have reached the maximum number of clarifying questions. Provide a final, comprehensive answer based on the information you have.'
  : 'You may ask clarifying questions if needed to provide better guidance, but be judicious.'}`;

    const enhancedSystemPrompt = SYSTEM_PROMPT + questionLimitGuidance;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
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
   * Extract theological themes from user's question
   * Returns 1-3 key biblical/theological concepts
   */
  async extractTheologicalThemes(userMessage: string): Promise<string[]> {
    try {
      const prompt = `Analyze this question and identify 1-3 key biblical or theological themes/concepts that are relevant. Return ONLY a JSON array of theme strings (lowercase, single words or short phrases).

Examples:
- "I'm struggling with forgiving someone" -> ["forgiveness", "mercy", "reconciliation"]
- "How do I deal with anxiety?" -> ["peace", "trust", "anxiety"]
- "What does the Bible say about marriage?" -> ["marriage", "covenant", "love"]

Question: ${userMessage}

Return only the JSON array, nothing else:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You extract biblical themes from questions. Always return valid JSON array.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const responseText = completion.choices[0].message.content || '[]';
      const themes = JSON.parse(responseText);
      return Array.isArray(themes) ? themes.slice(0, 3) : [];
    } catch (error) {
      console.error('Error extracting theological themes:', error);
      // Fallback to simple keyword extraction
      return this.extractSimpleKeywords(userMessage);
    }
  }

  /**
   * Simple fallback keyword extraction if AI fails
   */
  private extractSimpleKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'how', 'what', 'when', 'where', 'who', 'why']);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !stopWords.has(word))
      .slice(0, 3);
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
