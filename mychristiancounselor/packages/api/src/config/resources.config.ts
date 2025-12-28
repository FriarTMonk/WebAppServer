export interface ResourcesConfig {
  readonly evaluation: {
    // Score thresholds (data-driven, not hardcoded)
    readonly notAlignedThreshold: number; // Default: 70
    readonly globallyAlignedThreshold: number; // Default: 90
    readonly borderlineRange: number; // Default: 3 (67-73, 87-93)

    // Models
    readonly primaryModel: string; // claude-sonnet-4-20250514
    readonly escalationModel: string; // claude-opus-4-20250514

    // Version tracking
    readonly currentVersion: string; // e.g., "1.0.0"
  };

  readonly aiEvaluation: {
    // AI Model configurations
    readonly models: {
      readonly primary: {
        readonly name: string;
        readonly maxTokens: number;
        readonly temperature: number;
      };
      readonly escalation: {
        readonly name: string;
        readonly maxTokens: number;
        readonly temperature: number;
      };
    };

    // Base prompt template
    readonly basePrompt: string;

    // Score thresholds (mirrored from evaluation for convenience)
    readonly thresholds: {
      readonly notAligned: number;
      readonly globallyAligned: number;
      readonly borderlineRange: number;
    };
  };

  readonly ageGating: {
    // Account type thresholds (configurable per org)
    readonly defaultMatureContentThreshold: 'child' | 'teen' | 'adult'; // Default: teen
    readonly accountTypeAges: {
      readonly child: { readonly min: 0; readonly max: 12 };
      readonly teen: { readonly min: 13; readonly max: 17 };
      readonly adult: { readonly min: 18; readonly max: 999 };
    };
  };

  readonly storage: {
    readonly activeTier: {
      readonly provider: 's3' | 'azure' | 'gcs';
      readonly bucket: string;
      readonly prefix: string; // 'active/books/'
    };
    readonly archivedTier: {
      readonly provider: 's3' | 'azure' | 'gcs';
      readonly bucket: string;
      readonly storageClass: string; // 'GLACIER'
      readonly prefix: string; // 'archived/books/'
    };
  };

  readonly lookup: {
    // Priority order for book APIs (data-driven)
    readonly apiPriority: ReadonlyArray<{
      readonly name: string;
      readonly enabled: boolean;
      readonly timeout: number;
      readonly rateLimit: number;
    }>;
  };
}

export const resourcesConfig: ResourcesConfig = {
  evaluation: {
    notAlignedThreshold: 70,
    globallyAlignedThreshold: 90,
    borderlineRange: 3,
    primaryModel: 'claude-sonnet-4-20250514',
    escalationModel: 'claude-opus-4-20250514',
    currentVersion: '1.0.0',
  },
  aiEvaluation: {
    models: {
      primary: {
        name: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.0,
      },
      escalation: {
        name: 'claude-opus-4-20250514',
        maxTokens: 4096,
        temperature: 0.0,
      },
    },
    basePrompt: `You are a theological expert evaluating Christian literature for biblical alignment. Analyze the following book and provide a comprehensive evaluation.

Book Title: {{title}}
Author: {{author}}
Genre: {{genre}}

Content to Analyze:
{{content}}

EVALUATION CRITERIA:

1. **Biblical Alignment Score (0-100%)**: Does this book agree with Scripture itself (Sola Scriptura)?
   - Core doctrines (deity of Christ, resurrection, salvation): Strict adherence required
   - Non-core doctrines (eschatology, baptism, spiritual gifts): Lenient if biblically grounded

2. **Genre-Specific Evaluation**:

   **For Non-Fiction (Theology, Devotional, Study, Commentary):**
   - Doctrinal precision matters
   - Scripture usage and accuracy
   - Theological soundness
   - Direct teaching should align with biblical doctrine

   **For Fiction (Novels, Allegory, Christian Fiction):**
   - Evaluate themes and values, NOT doctrinal precision of creative elements
   - Key questions:
     * Are the spiritual lessons biblical?
     * Does the worldview align with Scripture?
     * Does it draw readers toward truth?
   - Creative narrative elements (angels, demons, spiritual warfare depictions) should not be judged as theological statements
   - Fiction can score ≥90% if themes honor God and align with biblical values, even with creative liberties in storytelling

3. **Theological Analysis**:
   - Summarize the book's theological positions or themes
   - Identify per-doctrine alignment (Soteriology, Ecclesiology, Eschatology, Pneumatology, Christology)
   - Tag denominational perspective (Reformed, Arminian, Catholic, Orthodox, etc.) - informational only
   - Note theological strengths and any concerns

4. **Mature Content Detection**:
   - Flag if contains sexual content or violence/trauma themes
   - Does NOT include theological complexity

Provide your evaluation as a JSON object with the following structure:
{
  "biblicalAlignmentScore": <number 0-100>,
  "genreTag": "<detected genre: 'fiction', 'theology', 'devotional', 'study', 'commentary', or 'general'>",
  "theologicalSummary": "<brief summary of theological position or themes>",
  "doctrineCategoryScores": [
    {
      "category": "<doctrine name>",
      "score": <number 0-100>,
      "notes": "<specific observations>"
    }
  ],
  "denominationalTags": ["<denomination1>", "<denomination2>"],
  "matureContent": <boolean>,
  "matureContentReason": "<reason if true>",
  "scriptureComparisonNotes": "<how well it aligns with Scripture>",
  "theologicalStrengths": ["<strength1>", "<strength2>"],
  "theologicalConcerns": ["<concern1>", "<concern2>"],
  "scoringReasoning": "<detailed explanation of the score, noting whether evaluated as fiction or non-fiction>"
}

Focus on alignment with core Christian doctrines, scriptural accuracy, and theological soundness.`,
    thresholds: {
      notAligned: 70,
      globallyAligned: 90,
      borderlineRange: 3,
    },
  },
  ageGating: {
    defaultMatureContentThreshold: 'teen',
    accountTypeAges: {
      child: { min: 0, max: 12 },
      teen: { min: 13, max: 17 },
      adult: { min: 18, max: 999 },
    },
  },
  storage: {
    activeTier: {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'azure' | 'gcs') || 's3',
      bucket: process.env.S3_BUCKET || 'mychristiancounselor-active',
      prefix: 'active/books/',
    },
    archivedTier: {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'azure' | 'gcs') || 's3',
      bucket: process.env.S3_BUCKET || 'mychristiancounselor-archived',
      storageClass: 'GLACIER',
      prefix: 'archived/books/',
    },
  },
  lookup: {
    apiPriority: [
      { name: 'christianbook', enabled: true, timeout: 5000, rateLimit: 100 },
      { name: 'google-books', enabled: true, timeout: 5000, rateLimit: 1000 },
      { name: 'amazon', enabled: false, timeout: 5000, rateLimit: 50 },
    ],
  },
};
