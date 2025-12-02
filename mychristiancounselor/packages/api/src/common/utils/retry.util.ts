import { Logger } from '@nestjs/common';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Default retry configuration for external API calls
 * Implements exponential backoff with jitter
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'NETWORK_ERROR',
  ],
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  // Check error code
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes (5xx server errors and 429 rate limit)
  if (error.response?.status) {
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  // Check error message for network-related errors
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('socket')
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (±25% randomness) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

  return Math.max(0, cappedDelay + jitter);
}

/**
 * Executes an async function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @param logger - Optional logger instance for retry attempts
 * @returns Promise that resolves with the function result or rejects after all retries
 *
 * @example
 * const result = await withRetry(
 *   () => openai.chat.completions.create(...),
 *   { maxAttempts: 3, initialDelayMs: 1000 },
 *   this.logger
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: Logger
): Promise<T> {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt or error is not retryable
      const isLastAttempt = attempt === config.maxAttempts;
      const shouldRetry = isRetryableError(error, config.retryableErrors);

      if (isLastAttempt || !shouldRetry) {
        if (logger) {
          logger.error(
            `Operation failed after ${attempt} attempt(s): ${lastError.message}`,
            lastError.stack
          );
        }
        throw lastError;
      }

      // Calculate delay and log retry attempt
      const delay = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      );

      if (logger) {
        logger.warn(
          `Retry attempt ${attempt}/${config.maxAttempts} after ${Math.round(delay)}ms delay. ` +
          `Error: ${lastError.message}`
        );
      }

      // Call optional retry callback
      if (options.onRetry) {
        options.onRetry(lastError, attempt);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
