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

    // Construct enhanced system prompt with progressive question strategy
    const remainingQuestions = maxClarifyingQuestions - currentQuestionCount;
    const isAtLimit = currentQuestionCount >= maxClarifyingQuestions;

    // Determine question phase based on maxClarifyingQuestions
    // Free users (3 questions): Q0=broad, Q1=specific, Q2+=critical
    // Subscribed users (6 questions): Q0=broad, Q1-2=specific, Q3-5=critical
    const specificPhaseEnd = maxClarifyingQuestions === 3 ? 1 : 2;
    const criticalPhaseStart = specificPhaseEnd + 1;

    let questionPhase: 'broad' | 'specific' | 'critical' | 'force-answer';
    if (isAtLimit) {
      questionPhase = 'force-answer';
    } else if (currentQuestionCount === 0) {
      questionPhase = 'broad';
    } else if (currentQuestionCount <= specificPhaseEnd) {
      questionPhase = 'specific';
    } else {
      questionPhase = 'critical';
    }

    let questionLimitGuidance = `

CLARIFYING QUESTION LIMITS:
- Questions asked: ${currentQuestionCount}/${maxClarifyingQuestions}
- Remaining: ${remainingQuestions}
`;

    // Progressive strategy based on question phase
    if (questionPhase === 'force-answer') {
      // AT LIMIT - Force answer, no more questions
      questionLimitGuidance += `
CRITICAL: You have reached your clarifying question limit (${maxClarifyingQuestions}/${maxClarifyingQuestions}).
You MUST now provide comprehensive Biblical guidance based on the information you have.

REQUIRED ACTIONS:
- Provide substantive Biblical counsel addressing their situation
- Cite relevant Scripture passages to support your guidance
- If details are unclear, make reasonable assumptions and acknowledge them
  (e.g., "While I don't know [specific detail], Biblical wisdom teaches...")
- DO NOT ask another clarifying question under any circumstances
- Set "requiresClarification" to false in your response

Your role is to provide Biblical wisdom and guidance, not to gather perfect information.
Give the best counsel you can with what you know.`;
    } else if (questionPhase === 'critical') {
      // CRITICAL PHASE - Only ask if absolutely necessary
      const questionsUntilLimit = remainingQuestions;
      questionLimitGuidance += `
QUESTION PHASE: Critical Only (${questionsUntilLimit} question${questionsUntilLimit === 1 ? '' : 's'} remaining)

You are in the CRITICAL QUESTIONS phase. Only ask if:
- You are genuinely unable to provide helpful Biblical guidance without this information
- The missing information is central to understanding their core spiritual need
- You cannot make a reasonable assumption about the missing detail

STRONG PREFERENCE: If you can provide meaningful Biblical counsel with what you know, do so now.
Consider whether the information you have is sufficient to guide them toward Scripture and Christ.

If you ask a question now, make it highly targeted and essential.
After ${questionsUntilLimit} more question${questionsUntilLimit === 1 ? '' : 's'}, you must provide your final answer.`;
    } else if (questionPhase === 'specific') {
      // SPECIFIC PHASE - Drill into key details
      questionLimitGuidance += `
QUESTION PHASE: Specific Details (${remainingQuestions} questions remaining after this)

You are in the SPECIFIC QUESTIONS phase. Focus on:
- Drilling into key details that will inform your Biblical counsel
- Understanding the practical circumstances of their situation
- Clarifying any ambiguities from their initial message
- Gathering information that will help you select the most relevant Scripture

Each question should be targeted and move you closer to providing Biblical guidance.
After this phase, you'll only be able to ask if absolutely critical.`;
    } else {
      // BROAD PHASE - First question, understand the situation
      questionLimitGuidance += `
QUESTION PHASE: Broad Understanding (${remainingQuestions - 1} questions remaining after this)

You are asking your FIRST clarifying question. Focus on:
- Understanding the overall situation and context
- Identifying the core spiritual or relational issue
- Determining what type of Biblical guidance would be most helpful
- Getting a holistic view before drilling into specifics

Ask a broad, open question that helps you understand the big picture.
You'll have opportunities for more specific questions after this.`;
    }

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
