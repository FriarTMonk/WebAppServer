/**
 * Testing utilities and helpers for MyChristianCounselor API
 *
 * Exports:
 * - Test utilities (test-utils.ts)
 * - Mock factories (mocks/)
 * - Test fixtures (fixtures/)
 *
 * Usage:
 * ```typescript
 * import {
 *   createTestingModule,
 *   createPrismaMock,
 *   createUserFixture,
 *   expectToThrow,
 * } from './testing';
 * ```
 */

// Test utilities
export * from './test-utils';

// Mocks
export * from './mocks/prisma.mock';
export * from './mocks/service.mocks';

// Fixtures
export * from './fixtures/test-data.fixtures';
