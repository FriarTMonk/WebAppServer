import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { CRISIS_KEYWORDS, CRISIS_RESOURCES, GRIEF_KEYWORDS, GRIEF_RESOURCES } from '@mychristiancounselor/shared';

export interface SafetyDetectionResult {
  isDetected: boolean;
  detectionMethod: 'pattern' | 'ai' | 'both' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);
  private openai: OpenAI | null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Initialize OpenAI for AI-powered detection
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log('✅ OpenAI initialized for safety detection');
    } else {
      this.openai = null;
      this.logger.warn('⚠️  OpenAI not configured - using pattern-only detection');
    }
  }
  /**
   * Normalizes text for better matching by:
   * - Converting to lowercase
   * - Removing extra spaces
   * - Normalizing punctuation
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
  }

  /**
   * LAYERED CRISIS DETECTION
   * Uses pattern matching first (instant, free), then AI if needed (smart, contextual)
   *
   * Detection Strategy:
   * 1. Pattern match → Crisis found → Return immediately (high confidence)
   * 2. No pattern match → Try AI detection (contextual analysis)
   * 3. AI fails → Fall back to pattern result (defensive)
   *
   * @param message User's message to analyze
   * @returns Detection result with method and confidence level
   */
  async detectCrisis(message: string): Promise<SafetyDetectionResult> {
    // Layer 1: Fast pattern matching with confidence categorization
    const patternResult = this.detectCrisisPattern(message);

    // HIGH CONFIDENCE pattern match - Immediate crisis, skip AI validation
    if (patternResult.detected && patternResult.confidence === 'high') {
      this.logger.warn(`🚨 CRISIS DETECTED: High-confidence pattern - "${message.substring(0, 50)}..."`);
      return {
        isDetected: true,
        detectionMethod: 'pattern',
        confidence: 'high',
      };
    }

    // MEDIUM CONFIDENCE pattern match - Need AI validation (might be false positive)
    if (patternResult.detected && patternResult.confidence === 'medium') {
      this.logger.debug(`⚠️  Medium-confidence pattern detected, validating with AI - "${message.substring(0, 50)}..."`);
    }

    // Layer 2: AI contextual analysis (for medium confidence patterns or no pattern match)
    if (this.openai) {
      try {
        const aiMatch = await this.detectCrisisContextual(message);

        if (aiMatch) {
          const method = patternResult.detected ? 'both' : 'ai';
          this.logger.warn(`🚨 CRISIS DETECTED: AI contextual [${method}] - "${message.substring(0, 50)}..."`);
          return {
            isDetected: true,
            detectionMethod: method,
            confidence: 'medium',
          };
        }

        // AI says no (even if medium-confidence pattern matched)
        if (patternResult.detected) {
          this.logger.debug(`✅ AI overrode medium-confidence pattern (false positive) - "${message.substring(0, 50)}..."`);
        }

        return {
          isDetected: false,
          detectionMethod: 'both',
          confidence: 'high',
        };
      } catch (error) {
        // Layer 3: AI failed - fall back to pattern result (defensive)
        this.logger.error('AI crisis detection failed, using pattern result', error);
        return {
          isDetected: patternResult.detected,
          detectionMethod: 'pattern',
          confidence: 'low',
        };
      }
    }

    // OpenAI not configured - pattern-only mode
    return {
      isDetected: patternResult.detected,
      detectionMethod: 'pattern',
      confidence: patternResult.confidence === 'high' ? 'high' : 'medium',
    };
  }

  /**
   * Pattern-based crisis detection with confidence categorization (private helper)
   * Fast, deterministic, rule-based detection
   *
   * Returns confidence level to inform whether AI validation is needed
   */
  private detectCrisisPattern(message: string): { detected: boolean; confidence: 'high' | 'medium' | 'none' } {
    const normalizedMessage = this.normalizeText(message);

    // HIGH CONFIDENCE PATTERNS - Explicit, unambiguous crisis indicators
    // These are immediate crisis flags that don't need AI validation
    const highConfidencePatterns = [
      /\bkill\s+my\s*self\b/i,              // "kill myself"
      /\bharm\s+my\s*self\b/i,              // "harm myself"
      /\bhurt\s+my\s*self\b/i,              // "hurt myself"
      /\bcut\s+my\s*self\b/i,               // "cut myself"
      /\bend\s+my\s+life\b/i,               // "end my life"
      /\btake\s+my\s+life\b/i,              // "take my life"
      /\bwant\s+to\s+die\b/i,               // "want to die"
      /\bwish\s+.{0,10}\s*dead\b/i,         // "wish I was dead"
      /\bbetter\s+off\s+dead\b/i,           // "better off dead"
      /\bno\s+reason\s+to\s+live\b/i,       // "no reason to live"
      /\bsuicid/i,                          // "suicide", "suicidal"
      /\bself[\s-]*harm/i,                  // "self-harm", "self harm"
      /\brap(e|ed|ing)\s+me\b/i,            // "raped me", "raping me" (with personal context)
      /\bi\s+was\s+(raped|molested|assaulted|beaten|abused)\b/i, // First-person past tense
      /\bbeat(s|ing)\s+me\b/i,              // "beats me", "beating me" (active abuse)
      /\bhit(s|ting)\s+me\b/i,              // "hits me", "hitting me" (active abuse)
      /\bbeing\s+(abused|beaten|molested|assaulted)/i, // Active ongoing abuse
    ];

    // Check only the explicit high-confidence patterns (not shared keywords which may be generic)
    if (highConfidencePatterns.some(pattern => pattern.test(message))) {
      return { detected: true, confidence: 'high' };
    }

    // MEDIUM CONFIDENCE PATTERNS - Ambiguous terms that need AI context validation
    // These could be metaphorical, historical, or academic discussions
    const mediumConfidencePatterns = [
      /\babuse\b/i,                         // Generic "abuse" (could be discussing it)
      /\bviolence\b/i,                      // Generic "violence" (could be discussing it)
      /\brap(e|ed|ing)\b/i,                 // Rape without personal context
      /\bbeat(s|en)\b/i,                    // Beat/beaten without "me"
      /\bhit\b/i,                           // Hit without "me"
      /\bsexual(ly)?\s+assault/i,           // Sexual assault (might be discussing)
      /\bmolest/i,                          // Molest (might be discussing)
    ];

    if (mediumConfidencePatterns.some(pattern => pattern.test(message))) {
      return { detected: true, confidence: 'medium' };
    }

    return { detected: false, confidence: 'none' };
  }

  /**
   * AI-powered contextual crisis detection (private helper)
   * Uses OpenAI to understand context and distinguish spiritual questions from real crisis
   *
   * @param message User's message
   * @returns True if crisis detected, false otherwise
   */
  private async detectCrisisContextual(message: string): Promise<boolean> {
    if (!this.openai) {
      return false;
    }

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
      this.logger.debug(`[AI CRISIS] "${message.substring(0, 50)}..." → ${response}`);
      return response === 'true';
    } catch (error) {
      this.logger.error('AI crisis detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }

  /**
   * Returns crisis resources for immediate help
   */
  getCrisisResources() {
    return CRISIS_RESOURCES;
  }

  /**
   * Generates crisis response message
   */
  generateCrisisResponse(): string {
    return `I'm concerned about what you're sharing. Your safety and well-being are very important.

Please reach out to these professional resources who can provide immediate help:

${CRISIS_RESOURCES.map(
  (resource) =>
    `• ${resource.name}: ${resource.contact}\n  ${resource.description}`
).join('\n\n')}

If you're in immediate danger, please call 911 or go to your nearest emergency room.

I'm here to provide spiritual guidance, but these trained professionals can offer the immediate support you need right now.`;
  }

  /**
   * LAYERED GRIEF DETECTION
   * Uses pattern matching first (instant, free), then AI if needed (smart, contextual)
   *
   * Detection Strategy:
   * 1. Pattern match → Grief found → Return immediately (high confidence)
   * 2. No pattern match → Try AI detection (contextual analysis)
   * 3. AI fails → Fall back to pattern result (defensive)
   *
   * @param message User's message to analyze
   * @returns Detection result with method and confidence level
   */
  async detectGrief(message: string): Promise<SafetyDetectionResult> {
    // Layer 1: Fast pattern matching with confidence categorization
    const patternResult = this.detectGriefPattern(message);

    // HIGH CONFIDENCE pattern match - Immediate grief, skip AI validation
    if (patternResult.detected && patternResult.confidence === 'high') {
      this.logger.debug(`😢 GRIEF DETECTED: High-confidence pattern - "${message.substring(0, 50)}..."`);
      return {
        isDetected: true,
        detectionMethod: 'pattern',
        confidence: 'high',
      };
    }

    // MEDIUM CONFIDENCE pattern match - Need AI validation (might be false positive)
    if (patternResult.detected && patternResult.confidence === 'medium') {
      this.logger.debug(`⚠️  Medium-confidence grief pattern detected, validating with AI - "${message.substring(0, 50)}..."`);
    }

    // Layer 2: AI contextual analysis (for medium confidence patterns or no pattern match)
    if (this.openai) {
      try {
        const aiMatch = await this.detectGriefContextual(message);

        if (aiMatch) {
          const method = patternResult.detected ? 'both' : 'ai';
          this.logger.debug(`😢 GRIEF DETECTED: AI contextual [${method}] - "${message.substring(0, 50)}..."`);
          return {
            isDetected: true,
            detectionMethod: method,
            confidence: 'medium',
          };
        }

        // AI says no (even if medium-confidence pattern matched)
        if (patternResult.detected) {
          this.logger.debug(`✅ AI overrode medium-confidence grief pattern (false positive) - "${message.substring(0, 50)}..."`);
        }

        // Both layers say no - no grief
        return {
          isDetected: false,
          detectionMethod: 'both',
          confidence: 'high',
        };
      } catch (error) {
        // Layer 3: AI failed - fall back to pattern result (defensive)
        this.logger.error('AI grief detection failed, using pattern result', error);
        return {
          isDetected: patternResult.detected,
          detectionMethod: 'pattern',
          confidence: 'low',
        };
      }
    }

    // OpenAI not configured - pattern-only mode
    return {
      isDetected: patternResult.detected,
      detectionMethod: 'pattern',
      confidence: patternResult.confidence === 'high' ? 'high' : 'medium',
    };
  }

  /**
   * Pattern-based grief detection with confidence categorization (private helper)
   * Fast, deterministic, rule-based detection
   *
   * Returns confidence level to inform whether AI validation is needed
   */
  private detectGriefPattern(message: string): { detected: boolean; confidence: 'high' | 'medium' | 'none' } {
    const normalizedMessage = this.normalizeText(message);

    // HIGH CONFIDENCE PATTERNS - Explicit recent loss with personal context
    // These clearly indicate active grief needing resources
    const highConfidencePatterns = [
      // Loss of loved ones with explicit personal context
      /\b(lost|losing|loss\s+of)\s+(my|our)\s+(mother|father|mom|dad|parent|parents|child|children|son|daughter|baby|wife|husband|spouse|partner|brother|sister|grandmother|grandfather|grandma|grandpa|loved\s+one)\b/i,

      // Death notifications with personal pronouns
      /\bmy\s+(mother|father|mom|dad|parent|parents|child|children|son|daughter|baby|wife|husband|spouse|partner|brother|sister|grandmother|grandfather|grandma|grandpa|loved\s+one)\s+(died|passed\s+away|passed\s+on|is\s+gone|has\s+gone)\b/i,

      // Death with personal context
      /\bdeath\s+of\s+(my|our)\b/i,

      // Terminal illness with personal pronouns
      /\bmy\s+.{1,30}\s+(terminal|terminally\s+ill|dying|hospice|palliative|not\s+(long|much\s+time)\s+to\s+live)\b/i,

      // Active grief expressions
      /\b(grief|grieving|mourning|bereaved)\s+(over|for|from)\b/i,
      /\bat\s+(the\s+)?(funeral|memorial|burial|wake)\s+(of|for)\b/i,
      /\bjust\s+(lost|buried)\b/i,
      /\bcan\'t\s+believe\s+.{1,10}\s+(died|gone|passed)\b/i,
    ];

    // Check only the explicit high-confidence patterns (not shared keywords which may be generic)
    if (highConfidencePatterns.some(pattern => pattern.test(message))) {
      return { detected: true, confidence: 'high' };
    }

    // MEDIUM CONFIDENCE PATTERNS - Ambiguous terms that might be historical or general
    // These need AI validation to distinguish present grief from past resolved loss or theological discussions
    const mediumConfidencePatterns = [
      // Death references with emotional or event context (not theological)
      /\b(dealing\s+with|coping\s+with|struggling\s+with|processing)\s+(the\s+)?(death|loss)\b/i,
      /\bsomeone\s+(died|passed\s+away|passed\s+on|is\s+gone)\b/i,
      /\b(recently|just)\s+(died|passed|lost)\b/i,

      // Attending grief events
      /\b(attending|went\s+to|going\s+to)\s+(a\s+)?(funeral|memorial|burial|wake|visitation)\b/i,

      // Terminal illness without clear personal connection
      /\b(terminal|terminally\s+ill|hospice|palliative)\b/i,

      // General grief words with emotional context
      /\b(feeling|so|very|extremely)\s+(heartbroken|devastated|lost)\b/i,
      /\b(suffering|in)\s+(so\s+much\s+)?pain\b/i,

      // Life support and critical care (might be discussing in general)
      /\bcritical\s+condition|intensive\s+care|life\s+support|ventilator\b/i,
    ];

    if (mediumConfidencePatterns.some(pattern => pattern.test(message))) {
      return { detected: true, confidence: 'medium' };
    }

    return { detected: false, confidence: 'none' };
  }

  /**
   * AI-powered contextual grief detection (private helper)
   * Uses OpenAI to distinguish genuine grief from spiritual questions
   *
   * @param message User's message
   * @returns True if grief detected, false otherwise
   */
  private async detectGriefContextual(message: string): Promise<boolean> {
    if (!this.openai) {
      return false;
    }

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
        temperature: 0.1,
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content?.trim().toLowerCase();
      this.logger.debug(`[AI GRIEF] "${message.substring(0, 50)}..." → ${response}`);
      return response === 'true';
    } catch (error) {
      this.logger.error('AI grief detection error:', error);
      // Fall back to false to avoid false positives
      return false;
    }
  }

  /**
   * Returns grief counseling resources
   */
  getGriefResources() {
    return GRIEF_RESOURCES;
  }

  /**
   * Generates grief response message with compassion and resources
   */
  generateGriefResponse(): string {
    return `I'm so sorry for your loss. Grief is a profound journey, and it's important to know you're not alone in this difficult time.

Here are some faith-based resources that can provide support and community:

${GRIEF_RESOURCES.map(
  (resource) =>
    `• ${resource.name}: ${resource.contact}\n  ${resource.description}`
).join('\n\n')}

God is close to the brokenhearted and saves those who are crushed in spirit (Psalm 34:18). I'm here to walk alongside you with spiritual guidance during this time of mourning.`;
  }

  /**
   * Log detection for continuous improvement tracking
   * Records detection events to measure accuracy and refine patterns
   *
   * @param detectionType - 'crisis' or 'grief'
   * @param result - The detection result with method and confidence
   * @param message - The user's message (will be anonymized)
   * @param sessionId - Optional session ID
   * @param messageId - Optional message ID
   * @param userId - Optional user ID
   */
  async logDetection(
    detectionType: 'crisis' | 'grief',
    result: SafetyDetectionResult,
    message: string,
    sessionId?: string,
    messageId?: string,
    userId?: string,
  ): Promise<void> {
    try {
      // Anonymize the message content (truncate if too long)
      const anonymizedContent = message.length > 500 ? message.substring(0, 500) + '...' : message;

      await this.prisma.safetyDetectionFeedback.create({
        data: {
          detectionType,
          detectionMethod: result.detectionMethod,
          confidenceLevel: result.confidence,
          messageContent: anonymizedContent,
          sessionId: sessionId || null,
          messageId: messageId || null,
          userId: userId || null,
          detectedAt: new Date(),
        },
      });

      this.logger.debug(`Logged ${detectionType} detection [${result.detectionMethod}, ${result.confidence}]`);
    } catch (error) {
      // Log but don't fail detection if logging fails
      this.logger.error('Failed to log detection feedback', error);
    }
  }

  /**
   * Submit user feedback on detection accuracy
   * Allows users to confirm or correct detection results
   *
   * @param feedbackId - ID of the detection feedback record
   * @param isAccurate - Whether the detection was accurate
   * @param feedbackNote - Optional user comment
   */
  async submitDetectionFeedback(
    feedbackId: string,
    isAccurate: boolean,
    feedbackNote?: string,
  ): Promise<void> {
    await this.prisma.safetyDetectionFeedback.update({
      where: { id: feedbackId },
      data: {
        isAccurate,
        feedbackNote: feedbackNote || null,
        feedbackSubmittedAt: new Date(),
      },
    });

    this.logger.log(`Detection feedback submitted: ${feedbackId} - accurate: ${isAccurate}`);
  }

  /**
   * Get detection accuracy statistics for continuous improvement
   * Query feedback data to identify patterns needing refinement
   *
   * @param detectionType - Optional filter by 'crisis' or 'grief'
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Aggregated statistics on detection accuracy
   */
  async getDetectionStatistics(
    detectionType?: 'crisis' | 'grief',
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {};

    if (detectionType) {
      where.detectionType = detectionType;
    }

    if (startDate || endDate) {
      where.detectedAt = {};
      if (startDate) where.detectedAt.gte = startDate;
      if (endDate) where.detectedAt.lte = endDate;
    }

    // Get overall counts
    const totalDetections = await this.prisma.safetyDetectionFeedback.count({ where });

    const feedbackSubmitted = await this.prisma.safetyDetectionFeedback.count({
      where: { ...where, isAccurate: { not: null } },
    });

    const accurateDetections = await this.prisma.safetyDetectionFeedback.count({
      where: { ...where, isAccurate: true },
    });

    const falsePositives = await this.prisma.safetyDetectionFeedback.count({
      where: { ...where, isAccurate: false },
    });

    // Get breakdown by method
    const byMethod = await this.prisma.safetyDetectionFeedback.groupBy({
      by: ['detectionMethod'],
      where,
      _count: true,
    });

    // Get breakdown by confidence
    const byConfidence = await this.prisma.safetyDetectionFeedback.groupBy({
      by: ['confidenceLevel'],
      where,
      _count: true,
    });

    // Calculate accuracy rate
    const accuracyRate = feedbackSubmitted > 0 ? (accurateDetections / feedbackSubmitted) * 100 : null;
    const falsePositiveRate = feedbackSubmitted > 0 ? (falsePositives / feedbackSubmitted) * 100 : null;

    return {
      totalDetections,
      feedbackSubmitted,
      accurateDetections,
      falsePositives,
      accuracyRate: accuracyRate ? accuracyRate.toFixed(2) + '%' : 'N/A',
      falsePositiveRate: falsePositiveRate ? falsePositiveRate.toFixed(2) + '%' : 'N/A',
      byMethod: byMethod.map((m) => ({ method: m.detectionMethod, count: m._count })),
      byConfidence: byConfidence.map((c) => ({ confidence: c.confidenceLevel, count: c._count })),
    };
  }

  /**
   * Get recent false positives for pattern refinement
   * Helps identify specific patterns that need adjustment
   *
   * @param detectionType - 'crisis' or 'grief'
   * @param limit - Maximum number of false positives to return
   * @returns List of false positive detections with message content
   */
  async getFalsePositives(detectionType: 'crisis' | 'grief', limit: number = 50) {
    return this.prisma.safetyDetectionFeedback.findMany({
      where: {
        detectionType,
        isAccurate: false,
      },
      orderBy: { feedbackSubmittedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        messageContent: true,
        detectionMethod: true,
        confidenceLevel: true,
        feedbackNote: true,
        detectedAt: true,
        feedbackSubmittedAt: true,
      },
    });
  }
}
