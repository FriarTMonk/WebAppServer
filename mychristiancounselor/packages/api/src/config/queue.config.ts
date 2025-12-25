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
}

export const queueConfig: QueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
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
};

export function getBullModuleOptions(): BullModuleOptions {
  return {
    connection: {
      host: queueConfig.redis.host,
      port: queueConfig.redis.port,
      password: queueConfig.redis.password,
      db: queueConfig.redis.db,
    },
  };
}
