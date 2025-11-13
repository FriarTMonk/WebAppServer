import { Injectable } from '@nestjs/common';
import { CRISIS_KEYWORDS, CRISIS_RESOURCES, GRIEF_KEYWORDS, GRIEF_RESOURCES } from '@mychristiancounselor/shared';

@Injectable()
export class SafetyService {
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
   * Detects crisis keywords in user message using enhanced pattern matching
   */
  detectCrisis(message: string): boolean {
    const normalizedMessage = this.normalizeText(message);

    // Check for direct keyword matches
    const hasKeywordMatch = CRISIS_KEYWORDS.some((keyword) => {
      const normalizedKeyword = this.normalizeText(keyword);
      return normalizedMessage.includes(normalizedKeyword);
    });

    if (hasKeywordMatch) {
      return true;
    }

    // Additional pattern-based detection for common variations
    // Word boundary checks for critical terms
    const criticalPatterns = [
      /\bkill\s+my\s*self\b/i,
      /\bharm\s+my\s*self\b/i,
      /\bhurt\s+my\s*self\b/i,
      /\bcut\s+my\s*self\b/i,
      /\bend\s+my\s+life\b/i,
      /\btake\s+my\s+life\b/i,
      /\bwant\s+to\s+die\b/i,
      /\bwish\s+.{0,10}\s*dead\b/i, // "wish I was dead", "wish I were dead"
      /\bbetter\s+off\s+dead\b/i,
      /\bno\s+reason\s+to\s+live\b/i,
      /\bsuicid/i, // Catches suicide, suicidal, etc.
      /\bself[\s-]*harm/i, // Catches self-harm, self harm, selfharm
      /\babuse/i,
      /\bviolence/i,
      /\brap(e|ed|ing)\b/i, // Catches rape, raped, raping
      /\bbeaten\b/i,
      /\bbeating\s+me\b/i,
      /\bsexual(ly)?\s+assault/i, // Catches sexual assault, sexually assaulted
      /\bmolest/i, // Catches molest, molested, molesting
    ];

    return criticalPatterns.some((pattern) => pattern.test(message));
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
   * Detects grief-related keywords in user message using enhanced pattern matching
   */
  detectGrief(message: string): boolean {
    const normalizedMessage = this.normalizeText(message);

    // Check for direct keyword matches
    const hasKeywordMatch = GRIEF_KEYWORDS.some((keyword) => {
      const normalizedKeyword = this.normalizeText(keyword);
      return normalizedMessage.includes(normalizedKeyword);
    });

    if (hasKeywordMatch) {
      return true;
    }

    // Additional pattern-based detection for grief-related expressions
    // Organized by category for comprehensive coverage
    const griefPatterns = [
      // Loss of loved ones - catches "lost my [relationship]", "losing my [relationship]"
      /\b(lost|losing|loss\s+of)\s+(my|a|our|the)\s+(mother|father|mom|dad|parent|parents|child|children|son|daughter|baby|wife|husband|spouse|partner|friend|brother|sister|grandmother|grandfather|grandma|grandpa|loved\s+one)\b/i,

      // Death notifications - "[relationship] died/passed away"
      /\b(mother|father|mom|dad|parent|parents|child|children|son|daughter|baby|wife|husband|spouse|partner|friend|brother|sister|grandmother|grandfather|grandma|grandpa|loved\s+one)\s+(died|passed\s+away|passed\s+on|is\s+gone|has\s+gone|left\s+us)\b/i,

      // Death references
      /\bdeath\s+of\s+(my|a|our|the)\b/i,
      /\b(died|death|dying|passed\s+away|passed\s+on)\b/i,

      // Terminal illness and end of life
      /\b(terminal|terminally\s+ill|terminal\s+(illness|cancer|disease))\b/i,
      /\b(dying|is\s+dying|are\s+dying)\b/i,
      /\bend\s+of\s+life|end\s+stage|final\s+(days|hours|moments)|last\s+(days|hours)\b/i,
      /\b(hospice|palliative|comfort\s+care)\b/i,
      /\bnot\s+(long|much\s+time)\s+to\s+live\b/i,
      /\btime\s+is\s+running\s+out|counting\s+(the\s+)?days\b/i,

      // Critical illness and suffering
      /\b(critically|seriously)\s+(ill|sick)\b/i,
      /\bcritical\s+condition|intensive\s+care|life\s+support|on\s+(a\s+)?ventilator\b/i,
      /\b(won\'t|not\s+going\s+to|not\s+gonna)\s+make\s+it\b/i,
      /\b(losing|lost|gave\s+up)\s+(the|their|his|her)\s+(battle|fight)\b/i,
      /\bfighting\s+for\s+(life|their\s+life|his\s+life|her\s+life)\b/i,
      /\b(suffering|in\s+(so\s+much\s+)?pain)\b/i,

      // Grief and mourning
      /\b(grief|grieving|grieve|mourning|mourn|bereavement|bereaved)\b/i,
      /\b(funeral|memorial|burial|wake|visitation)\b/i,
      /\b(buried|laying\s+to\s+rest|laid\s+to\s+rest)\b/i,

      // Emotional expressions of grief
      /\b(heartbroken|heart\s+broken|devastated)\b/i,
      /\bcan\'t\s+believe\s+(they\'re|he\'s|she\'s)\s+gone\b/i,
      /\bmiss\s+(them|him|her)\s+so\s+much\b/i,
      /\bwish\s+(they|he|she)\s+(were|was)\s+(here|still\s+here)\b/i,
      /\b(gone|taken)\s+too\s+soon\b/i,
      /\b(left\s+a\s+void|hole\s+in\s+my\s+heart|empty\s+without)\b/i,
      /\blife\s+without\s+(them|him|her)\b/i,

      // Additional grief indicators
      /\b(departed|no\s+longer\s+with\s+us|gone\s+from\s+us|left\s+us)\b/i,
    ];

    return griefPatterns.some((pattern) => pattern.test(message));
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
}
