import { Injectable } from '@nestjs/common';
import { CRISIS_KEYWORDS, CRISIS_RESOURCES } from '@mychrisiancounselor/shared';

@Injectable()
export class SafetyService {
  /**
   * Detects crisis keywords in user message
   */
  detectCrisis(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    return CRISIS_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );
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
}
