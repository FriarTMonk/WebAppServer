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
