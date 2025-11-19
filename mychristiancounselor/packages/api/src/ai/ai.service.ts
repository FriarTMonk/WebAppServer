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

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
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

  /**
   * Extract theological themes from user message
   * TODO: Enhance with AI-powered theme extraction
   */
  async extractTheologicalThemes(message: string): Promise<string[]> {
    // Basic keyword-based theme detection
    const themes: string[] = [];
    const lowerMessage = message.toLowerCase();

    const themeKeywords = {
      prayer: ['pray', 'prayer', 'praying'],
      faith: ['faith', 'believe', 'believing', 'trust'],
      salvation: ['salvation', 'saved', 'eternal life'],
      forgiveness: ['forgive', 'forgiveness', 'mercy'],
      love: ['love', 'loving', 'charity'],
      hope: ['hope', 'hopeful', 'hoping'],
      suffering: ['suffer', 'suffering', 'pain', 'hurt'],
      guidance: ['guidance', 'guide', 'direction', 'path'],
      relationship: ['relationship', 'marriage', 'family'],
      sin: ['sin', 'sinning', 'temptation'],
      worship: ['worship', 'praise', 'glorify'],
      scripture: ['bible', 'scripture', 'word of god']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes.length > 0 ? themes : ['general'];
  }

  /**
   * AI-powered contextual crisis detection
   * Uses theological discernment to identify genuine crisis situations
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
      console.log('[CRISIS DETECTION] Message:', message.substring(0, 100));
      console.log('[CRISIS DETECTION] AI Response:', response);
      console.log('[CRISIS DETECTION] Result:', response === 'true');
      return response === 'true';
    } catch (error) {
      console.error('AI crisis detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }

  /**
   * AI-powered contextual grief detection
   * Uses theological discernment to identify genuine grief situations
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
      console.log('[GRIEF DETECTION] Message:', message.substring(0, 100));
      console.log('[GRIEF DETECTION] AI Response:', response);
      console.log('[GRIEF DETECTION] Result:', response === 'true');
      return response === 'true';
    } catch (error) {
      console.error('AI grief detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }
}
