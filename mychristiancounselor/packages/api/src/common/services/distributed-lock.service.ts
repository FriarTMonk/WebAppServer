import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private redis: RedisService) {}

  /**
   * Acquire a distributed lock
   * @param lockKey The unique key for this lock
   * @param ttlSeconds Time-to-live in seconds (lock expires after this)
   * @returns true if lock acquired, false if already locked
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const result = await this.redis.set(
        lockKey,
        Date.now().toString(),
        'EX',
        ttlSeconds,
        'NX', // Only set if not exists
      );

      const acquired = result === 'OK';

      if (acquired) {
        this.logger.debug(`Lock acquired: ${lockKey}`);
      } else {
        this.logger.debug(`Lock already held: ${lockKey}`);
      }

      return acquired;
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release a distributed lock
   * @param lockKey The unique key for this lock
   */
  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redis.del(lockKey);
      this.logger.debug(`Lock released: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}: ${error.message}`);
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param lockKey The unique key for this lock
   * @param ttlSeconds Time-to-live in seconds
   * @param fn The function to execute
   * @returns The result of the function, or null if lock not acquired
   */
  async withLock<T>(
    lockKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(lockKey, ttlSeconds);

    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lockKey);
    }
  }
}
