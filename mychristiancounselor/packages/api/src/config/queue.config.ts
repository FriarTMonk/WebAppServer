import { BullModuleOptions } from '@nestjs/bullmq';

export interface QueueConfig {
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
    readonly db?: number;
  };
  readonly defaultJobOptions: {
    readonly attempts: number;
    readonly backoff: {
      readonly type: 'exponential';
      readonly delay: number;
    };
    readonly removeOnComplete: boolean;
    readonly removeOnFail: boolean;
  };
  readonly evaluationQueue: {
    readonly name: string;
    readonly concurrency: {
      readonly sonnet: number;
      readonly opus: number;
    };
  };
  readonly pdfMigrationQueue: {
    readonly name: string;
    readonly concurrency: number;
    readonly attempts: number;
    readonly backoff: {
      readonly type: 'exponential';
      readonly delay: number;
    };
    readonly removeOnComplete: {
      readonly age: number;
      readonly count: number;
    };
    readonly removeOnFail: {
      readonly age: number;
      readonly count: number;
    };
  };
}

export const queueConfig: QueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10) || 0,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  evaluationQueue: {
    name: 'book-evaluation',
    concurrency: {
      sonnet: 5,
      opus: 2,
    },
  },
  pdfMigrationQueue: {
    name: 'pdf-migration',
    concurrency: parseInt(process.env.PDF_MIGRATION_CONCURRENCY || '3', 10) || 3,
    attempts: parseInt(process.env.PDF_MIGRATION_ATTEMPTS || '3', 10) || 3,
    backoff: {
      type: 'exponential' as const,
      delay: parseInt(process.env.PDF_MIGRATION_BACKOFF_DELAY || '1000', 10) || 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
      count: 500,
    },
  },
};

export function getBullModuleOptions(): BullModuleOptions {
  return {
    connection: {
      host: queueConfig.redis.host,
      port: queueConfig.redis.port,
      password: queueConfig.redis.password,
      db: queueConfig.redis.db,
      // Connection timeout and retry configuration
      connectTimeout: 5000, // 5 seconds timeout
      retryStrategy: (times: number) => {
        // Exponential backoff with max 30 seconds between retries
        const delay = Math.min(times * 1000, 30000);
        console.log(`[Redis] Connection attempt ${times}, retrying in ${delay}ms`);
        return delay;
      },
      // Prevent connection errors from bubbling up
      lazyConnect: true,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    },
  };
}
