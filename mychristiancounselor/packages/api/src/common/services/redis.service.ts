import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  /**
   * Set a key with value and optional expiration
   * @param key The key to set
   * @param value The value to set
   * @param mode Optional mode ('EX' for seconds, 'PX' for milliseconds)
   * @param duration Duration in seconds or milliseconds
   * @param flag Optional flag ('NX' = only if not exists, 'XX' = only if exists)
   * @returns 'OK' if successful, null if flag prevented setting
   */
  async set(
    key: string,
    value: string,
    mode?: 'EX' | 'PX',
    duration?: number,
    flag?: 'NX' | 'XX',
  ): Promise<string | null> {
    try {
      const args: any[] = [key, value];

      if (mode && duration !== undefined) {
        args.push(mode, duration);
      }

      if (flag) {
        args.push(flag);
      }

      const result = await this.client.set(...args);
      return result;
    } catch (error) {
      this.logger.error(`Failed to set key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a value by key
   * @param key The key to get
   * @returns The value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a key
   * @param key The key to delete
   * @returns Number of keys deleted (0 or 1)
   */
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param key The key to check
   * @returns 1 if exists, 0 if not
   */
  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }
}
