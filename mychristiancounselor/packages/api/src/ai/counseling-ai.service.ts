import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { withRetry } from '../common/utils/retry.util';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts/system-prompt';
import { ScriptureReference } from '@mychristiancounselor/shared';

/**
 * CounselingAiService - AI operations for Christian counseling features
 *
 * Responsibilities:
 * - Generate counseling responses with clarifying questions (OpenAI)
 * - Extract theological themes from user messages
 * - Extract scripture references from AI-generated text
 * - Detect crisis situations requiring immediate intervention
 * - Detect grief situations requiring specialized resources
 *
 * Extracted from AiService to follow Single Responsibility Principle
 * Uses OpenAI GPT models for counseling-specific AI operations
 */
@Injectable()
export class CounselingAiService {
  private readonly logger = new Logger(CounselingAiService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI for counseling features
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  /**
   * Generate AI counseling response with optional clarifying questions
   *
   * @param userMessage User's counseling question
   * @param scriptures Relevant scripture passages
   * @param conversationHistory Previous conversation context
   * @param currentQuestionCount Number of clarifying questions asked so far
   * @param maxClarifyingQuestions Maximum allowed clarifying questions
   * @returns AI response with clarification flag and content
   */
  async generateResponse(
    userMessage: string,
    scriptures: ScriptureReference[],
    conversationHistory: { role: string; content: string }[],
    currentQuestionCount: number,
    maxClarifyingQuestions: number,
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
      currentQuestionCount,
      maxClarifyingQuestions
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

    const completion = await withRetry(
      () => this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      }),
      { maxAttempts: 3, initialDelayMs: 1000 },
      this.logger
    );

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);

    // Debug logging
    this.logger.debug('[AI RESPONSE DEBUG] Raw response:', response);
    this.logger.debug('[AI RESPONSE DEBUG] Parsed object:', JSON.stringify(parsed));
    this.logger.debug('[AI RESPONSE DEBUG] requiresClarification:', parsed.requiresClarification);
    this.logger.debug('[AI RESPONSE DEBUG] guidance field:', parsed.guidance);
    this.logger.debug('[AI RESPONSE DEBUG] clarifyingQuestion field:', parsed.clarifyingQuestion);

    // The JSON format uses 'guidance' or 'clarifyingQuestion', not 'content'
    const content = parsed.requiresClarification
      ? parsed.clarifyingQuestion
      : parsed.guidance;

    return {
      requiresClarification: parsed.requiresClarification === true,
      content: content,
    };
  }

  /**
   * Extract theological themes from user message using keyword matching
   *
   * @param message User's message
   * @returns Array of theological themes
   */
  extractTheologicalThemes(message: string): string[] {
    const themeKeywords: Record<string, string[]> = {
      forgiveness: ['forgive', 'forgiveness', 'pardon', 'mercy'],
      prayer: ['pray', 'prayer', 'praying', 'intercession'],
      faith: ['faith', 'believe', 'trust', 'conviction'],
      salvation: ['salvation', 'saved', 'redemption', 'eternal life'],
      suffering: ['suffer', 'pain', 'trial', 'hardship', 'tribulation'],
      grace: ['grace', 'mercy', 'undeserved', 'gift'],
      sin: ['sin', 'temptation', 'transgression', 'iniquity'],
      love: ['love', 'charity', 'compassion', 'kindness'],
      hope: ['hope', 'expectation', 'confidence'],
      righteousness: ['righteous', 'holiness', 'sanctification'],
    };

    const lowerMessage = message.toLowerCase();
    const themes: string[] = [];

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes.length > 0 ? themes : ['general'];
  }

  /**
   * Extract scripture references from AI response text
   * Matches patterns like: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1"
   *
   * @param text Text to extract references from
   * @returns Array of scripture references
   */
  extractScriptureReferences(text: string): Array<{
    book: string;
    chapter: number;
    verse: number;
    verseEnd?: number;
  }> {
    const references: Array<{
      book: string;
      chapter: number;
      verse: number;
      verseEnd?: number;
    }> = [];

    // Regular expression to match Bible verse patterns
    // Matches: "John 3:16", "1 Corinthians 13:4-7", "Genesis 1:1-3", etc.
    const bibleVersePattern = /\b(\d\s)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(\d+):(\d+)(?:-(\d+))?/g;

    let match;
    while ((match = bibleVersePattern.exec(text)) !== null) {
      const bookPrefix = match[1] ? match[1].trim() : '';
      const bookName = match[2];
      const book = bookPrefix ? `${bookPrefix} ${bookName}` : bookName;
      const chapter = parseInt(match[3], 10);
      const verseStart = parseInt(match[4], 10);
      const verseEnd = match[5] ? parseInt(match[5], 10) : undefined;

      references.push({
        book: book.trim(),
        chapter,
        verse: verseStart,
        verseEnd,
      });
    }

    return references;
  }

  /**
   * AI-powered contextual crisis detection
   * Uses theological discernment to identify genuine crisis situations
   *
   * @param message User's message
   * @returns True if crisis detected, false otherwise
   */
  async detectCrisisContextual(message: string): Promise<boolean> {
    try {
      const prompt = `As a Christian counselor with theological training, analyze this message for genuine crisis indicators requiring immediate professional intervention.

IMPORTANT CONTEXT: This is a Christian counseling platform where users ask spiritual questions and seek Biblical guidance. Questions directed TO God or ABOUT God are normal spiritual inquiries, not crisis situations.

Message: "${message}"

Criteria for TRUE crisis (requiring immediate intervention):
- Active suicidal ideation with specific intent or plan
- Immediate self-harm intent with imminent danger
- Active abuse or violence happening right now
- Life-threatening addiction requiring emergency intervention
- Severe mental health emergency with immediate danger

Do NOT flag as crisis:
- Questions directed to God ("God, are you listening?", "Where are you God?", "Why God?")
- Questions about God's existence, nature, or will
- Spiritual seeking or feeling distant from God
- Past struggles that are now resolved
- Hypothetical questions about theology of suffering
- Academic or theological discussions
- Historical references to past pain
- Metaphorical language ("dying inside", "killing me")
- Expressions of spiritual doubt or questioning faith
- Prayers for help or guidance

KEY DISTINCTION: Spiritual desperation (seeking God in hard times) is NOT a crisis. Only flag messages indicating IMMINENT physical danger or severe psychological emergency requiring professional intervention.

Respond with ONLY "true" or "false" and nothing else.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent detection
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content?.trim().toLowerCase();
      this.logger.debug(`[CRISIS DETECTION] Message: ${message.substring(0, 100)}`);
      this.logger.debug(`[CRISIS DETECTION] AI Response: ${response}`);
      this.logger.debug(`[CRISIS DETECTION] Result: ${response === 'true'}`);
      return response === 'true';
    } catch (error) {
      this.logger.error('AI crisis detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }

  /**
   * AI-powered contextual grief detection
   * Uses theological discernment to identify genuine grief situations
   *
   * @param message User's message
   * @returns True if grief detected, false otherwise
   */
  async detectGriefContextual(message: string): Promise<boolean> {
    try {
      const prompt = `As a Christian counselor, determine if this message indicates ACTIVE GRIEF from a RECENT ACTUAL LOSS that requires specialized grief resources.

CRITICAL CONTEXT: This is a Christian counseling platform. Spiritual questions, feeling distant from God, or seeking God during hard times are NORMAL and NOT grief situations.

Message: "${message}"

ONLY flag as TRUE grief if the message EXPLICITLY mentions:
- Death of a loved one (recent, within the past year) AND emotional distress about it
- Terminal diagnosis AND active emotional processing of impending death
- Current acute bereavement with explicit mention of who died

NEVER flag as grief:
- Questions to God or about God ("God, are you listening?", "Where are you God?", "Why God?")
- Feeling spiritually distant or abandoned
- Seeking God's help or guidance
- Questioning faith or God's presence
- General suffering or hard times without explicit death/loss
- Anxiety, worry, or stress (unless explicitly about recent death)
- Theological questions about death, suffering, or the afterlife
- Past loss that's been processed
- Metaphorical language about death or dying

EXAMPLE - NOT GRIEF:
- "God, are you listening?" = spiritual seeking, NOT grief
- "I feel so alone" = loneliness, NOT grief (unless they mention who died)
- "Why is God silent?" = spiritual doubt, NOT grief
- "I'm going through a hard time" = general struggle, NOT grief

EXAMPLE - IS GRIEF:
- "My mother died last month and I can't cope" = grief
- "Just lost my husband, how do I go on?" = grief

Be VERY conservative. When in doubt, respond "false". Only respond "true" if there is EXPLICIT mention of a RECENT death causing CURRENT distress.

Respond with ONLY "true" or "false" and nothing else.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent detection
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content?.trim().toLowerCase();
      this.logger.debug(`[GRIEF DETECTION] Message: ${message.substring(0, 100)}`);
      this.logger.debug(`[GRIEF DETECTION] AI Response: ${response}`);
      this.logger.debug(`[GRIEF DETECTION] Result: ${response === 'true'}`);
      return response === 'true';
    } catch (error) {
      this.logger.error('AI grief detection error:', error);
      return false;
    }
  }
}
