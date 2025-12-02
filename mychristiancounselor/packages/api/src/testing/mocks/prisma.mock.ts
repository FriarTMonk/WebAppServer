import { PrismaService } from '../../prisma/prisma.service';

/**
 * Creates a mock for a Prisma model with common operations
 */
function createModelMock(methods: string[] = []) {
  const mock: any = {};
  const allMethods = [
    'create',
    'createMany',
    'findUnique',
    'findFirst',
    'findMany',
    'update',
    'updateMany',
    'delete',
    'deleteMany',
    'upsert',
    'count',
    ...methods,
  ];

  // Create a jest.fn() for each method
  allMethods.forEach(method => {
    mock[method] = jest.fn();
  });

  return mock;
}

/**
 * Mock factory for PrismaService
 * Provides a comprehensive mock for database operations
 */
export function createPrismaMock(): any {
  const mock = {
    user: createModelMock(),
    session: createModelMock(),
    message: createModelMock(),
    sessionNote: createModelMock(),
    sessionShare: createModelMock(),
    sessionShareAccess: createModelMock(),
    counselorAssignment: createModelMock(),
    counselorCoverageGrant: createModelMock(),
    counselorObservation: createModelMock(),
    memberWellbeingStatus: createModelMock(),
    organization: createModelMock(),
    organizationMembership: createModelMock(),
    organizationMember: createModelMock(),
    subscription: createModelMock(),
    supportTicket: createModelMock(),
    $transaction: jest.fn((callback) => {
      // For transactions, pass a mock that has the same structure
      return callback(mock);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  return mock;
}

/**
 * Reset all Prisma mock functions
 */
export function resetPrismaMock(prismaMock: Partial<PrismaService>): void {
  Object.values(prismaMock).forEach((model: any) => {
    if (model && typeof model === 'object') {
      Object.values(model).forEach((method: any) => {
        if (typeof method?.mockReset === 'function') {
          method.mockReset();
        }
      });
    }
  });
}
