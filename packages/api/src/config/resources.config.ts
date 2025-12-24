/**
 * Resources Configuration
 *
 * Data-driven configuration for the Biblical Resources System.
 * Following Unix philosophy: configuration over hardcoded logic.
 */

export interface ResourcesConfig {
  readonly aiEvaluation: {
    // Prompt templates (data-driven)
    readonly basePrompt: string;
    readonly outputFormat: string;

    // Model configuration
    readonly models: {
      readonly primary: {
        readonly name: string;
        readonly maxTokens: number;
        readonly temperature: number;
        readonly concurrencyLimit: number;
      };
      readonly escalation: {
        readonly name: string;
        readonly maxTokens: number;
        readonly temperature: number;
        readonly concurrencyLimit: number;
      };
    };

    // Progressive analysis thresholds
    readonly progressiveAnalysis: {
      readonly useIsbnSummaryFirst: boolean;
      readonly requirePdfForBorderline: boolean;
      readonly requireFullTextForBorderline: boolean;
    };

    // Retry configuration
    readonly retry: {
      readonly maxAttempts: number;
      readonly backoffMs: number;
      readonly backoffMultiplier: number;
    };

    // Doctrine categories to evaluate
    readonly doctrineCategories: ReadonlyArray<string>;
  };
}

export const resourcesConfig: ResourcesConfig = {
  aiEvaluation: {
    basePrompt: `You are a theological evaluator assessing Christian books for biblical alignment.

BOOK INFORMATION:
Title: {{title}}
Author: {{author}}
Genre: {{genre}}
Description: {{content}}

EVALUATION CRITERIA:
1. Biblical Alignment Score (0-100%): Does this book agree with Scripture itself (Sola Scriptura)?
   - Core doctrines (deity of Christ, resurrection, salvation): Strict adherence required
   - Non-core doctrines (eschatology, baptism, spiritual gifts): Lenient if biblically grounded
   - Fiction: Evaluate themes/values, not doctrinal precision of creative elements

2. Theological Analysis:
   - Summarize the book's theological positions
   - Identify per-doctrine alignment (Soteriology, Ecclesiology, Eschatology, Pneumatology, Christology)
   - Tag denominational perspective (Reformed, Arminian, Catholic, Orthodox, etc.) - informational only
   - Note theological strengths and any concerns

3. Mature Content Detection:
   - Flag if contains sexual content or violence/trauma themes
   - Does NOT include theological complexity

OUTPUT FORMAT:
{
  "biblicalAlignmentScore": 0-100,
  "theologicalSummary": "2-3 paragraph summary",
  "doctrineCategoryScores": [
    { "category": "Soteriology", "score": 0-100, "notes": "..." },
    { "category": "Ecclesiology", "score": 0-100, "notes": "..." },
    { "category": "Eschatology", "score": 0-100, "notes": "..." },
    { "category": "Pneumatology", "score": 0-100, "notes": "..." },
    { "category": "Christology", "score": 0-100, "notes": "..." }
  ],
  "denominationalTags": ["Reformed", "Evangelical"],
  "matureContent": true/false,
  "matureContentReason": "Contains explicit discussion of sexuality/violence",
  "scriptureComparisonNotes": "...",
  "theologicalStrengths": ["...", "..."],
  "theologicalConcerns": ["...", "..."],
  "scoringReasoning": "Detailed explanation of score"
}`,

    outputFormat: 'JSON with fields: biblicalAlignmentScore, theologicalSummary, doctrineCategoryScores, denominationalTags, matureContent, matureContentReason, scriptureComparisonNotes, theologicalStrengths, theologicalConcerns, scoringReasoning',

    models: {
      primary: {
        name: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.3,
        concurrencyLimit: 5,
      },
      escalation: {
        name: 'claude-opus-4-20250514',
        maxTokens: 4096,
        temperature: 0.3,
        concurrencyLimit: 2,
      },
    },

    progressiveAnalysis: {
      useIsbnSummaryFirst: true,
      requirePdfForBorderline: true,
      requireFullTextForBorderline: true,
    },

    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },

    doctrineCategories: [
      'Soteriology',
      'Ecclesiology',
      'Eschatology',
      'Pneumatology',
      'Christology',
    ],
  },
};
