import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

/**
 * Test utilities and helpers for NestJS testing
 * Provides common patterns for mocking, setup, and assertions
 */

/**
 * Create a deep mock of a class or interface
 * Uses jest-mock-extended for better type safety
 */
export function createMock<T>(): DeepMockProxy<T> {
  return mockDeep<T>();
}

/**
 * Reset all mocks in a DeepMockProxy
 */
export function resetMock<T>(mock: DeepMockProxy<T>): void {
  mockReset(mock);
}

/**
 * Create a NestJS testing module with provided configuration
 * Simplifies module creation for tests
 */
export async function createTestingModule(
  providers: any[],
  imports: any[] = [],
  controllers: any[] = []
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports,
    controllers,
    providers,
  }).compile();
}

/**
 * Mock console methods to suppress logs during testing
 * Useful for cleaner test output
 */
export function suppressConsoleLogs(): {
  restore: () => void;
} {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();

  return {
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Assert that a promise rejects with a specific error
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  errorType?: new (...args: any[]) => Error,
  errorMessage?: string | RegExp
): Promise<void> {
  let thrownError: Error | undefined;

  try {
    await fn();
  } catch (error) {
    thrownError = error as Error;
  }

  expect(thrownError).toBeDefined();

  if (errorType) {
    expect(thrownError).toBeInstanceOf(errorType);
  }

  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(thrownError?.message).toBe(errorMessage);
    } else {
      expect(thrownError?.message).toMatch(errorMessage);
    }
  }
}

/**
 * Wait for a specific amount of time (for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy on a method and return cleanup function
 */
export function spyOn<T, K extends keyof T>(
  object: T,
  method: K
): jest.SpyInstance & { cleanup: () => void } {
  const spy = jest.spyOn(object as any, method as any);
  return Object.assign(spy, {
    cleanup: () => spy.mockRestore(),
  });
}
