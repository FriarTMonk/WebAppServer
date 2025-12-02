# Testing Infrastructure

Comprehensive testing utilities, mocks, and fixtures for the MyChristianCounselor API.

## Directory Structure

```
testing/
├── test-utils.ts           # Common testing utilities and helpers
├── mocks/
│   ├── prisma.mock.ts      # PrismaService mock factory
│   └── service.mocks.ts    # Service mock factories (Config, JWT, Subscription, etc.)
├── fixtures/
│   └── test-data.fixtures.ts  # Test data factories for database entities
└── index.ts                # Barrel export for all testing utilities
```

## Quick Start

### 1. Import Testing Utilities

```typescript
import {
  createTestingModule,
  createPrismaMock,
  createSubscriptionServiceMock,
  createUserFixture,
  expectToThrow,
} from '../testing';
```

### 2. Setting Up a Test

```typescript
describe('MyService', () => {
  let service: MyService;
  let prismaMock: Partial<PrismaService>;
  let subscriptionMock: Partial<SubscriptionService>;

  beforeEach(async () => {
    // Create mocks
    prismaMock = createPrismaMock();
    subscriptionMock = createSubscriptionServiceMock(true); // Has subscription

    // Create testing module
    const module = await createTestingModule([
      MyService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: SubscriptionService, useValue: subscriptionMock },
    ]);

    service = module.get<MyService>(MyService);
  });

  it('should do something', async () => {
    // Arrange
    const user = createUserFixture({ id: 'user-1' });
    prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);

    // Act
    const result = await service.doSomething('user-1');

    // Assert
    expect(result).toBeDefined();
    expect(prismaMock.user!.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });
});
```

## Available Utilities

### Test Utils (`test-utils.ts`)

#### `createMock<T>()`
Create a deep mock of any class or interface with type safety.

```typescript
const mockService = createMock<MyService>();
mockService.someMethod.mockResolvedValue('result');
```

#### `resetMock<T>(mock)`
Reset all mocks in a DeepMockProxy.

```typescript
resetMock(mockService);
```

#### `createTestingModule(providers, imports?, controllers?)`
Simplified NestJS testing module creation.

```typescript
const module = await createTestingModule([
  MyService,
  { provide: Dependency, useValue: mockDependency },
]);
```

#### `expectToThrow(fn, errorType?, errorMessage?)`
Assert that an async function throws a specific error.

```typescript
await expectToThrow(
  () => service.doSomething(),
  ForbiddenException,
  'Access denied'
);
```

#### `suppressConsoleLogs()`
Suppress console output during tests for cleaner output.

```typescript
const { restore } = suppressConsoleLogs();
// ... test code ...
restore();
```

#### `wait(ms)`
Wait for async operations.

```typescript
await wait(100);
```

#### `spyOn(object, method)`
Create a spy with automatic cleanup.

```typescript
const spy = spyOn(service, 'method');
// ... test code ...
spy.cleanup();
```

## Mock Factories

### PrismaService Mock

```typescript
const prismaMock = createPrismaMock();

// Configure specific methods
prismaMock.user!.findUnique = jest.fn().mockResolvedValue(userFixture);
prismaMock.session!.create = jest.fn().mockResolvedValue(sessionFixture);

// Reset all mocks
resetPrismaMock(prismaMock);
```

### ConfigService Mock

```typescript
const configMock = createConfigServiceMock({
  JWT_SECRET: 'custom-secret',
  DATABASE_URL: 'custom-url',
});
```

### JwtService Mock

```typescript
const jwtMock = createJwtServiceMock();
```

### SubscriptionService Mock

```typescript
// User with active subscription
const subscriptionMock = createSubscriptionServiceMock(true);

// User without subscription
const noSubMock = createSubscriptionServiceMock(false);
```

### PermissionService Mock

```typescript
const permissionMock = createPermissionServiceMock({
  isOwner: true,
  isAssignedCounselor: false,
  hasShareAccess: false,
  allowNotesAccess: false,
});
```

### EmailService Mock

```typescript
const emailMock = createEmailServiceMock();
```

## Test Fixtures

### User Fixtures

```typescript
const user = createUserFixture({
  id: 'custom-id',
  email: 'custom@example.com',
  subscriptionStatus: 'active',
});
```

### Session Fixtures

```typescript
const session = createSessionFixture({
  id: 'session-1',
  userId: 'user-1',
  title: 'Custom Session',
});
```

### Note Fixtures

```typescript
const note = createNoteFixture({
  sessionId: 'session-1',
  authorId: 'user-1',
  isPrivate: true,
});
```

### Organization Fixtures

```typescript
const org = createOrganizationFixture({
  name: 'Test Church',
  subscriptionLimit: 50,
});

const membership = createMembershipFixture({
  organizationId: 'org-1',
  userId: 'user-1',
  role: 'admin',
});
```

### Counselor Fixtures

```typescript
const assignment = createAssignmentFixture({
  counselorId: 'counselor-1',
  memberId: 'member-1',
  status: 'active',
});

const coverage = createCoverageGrantFixture({
  primaryCounselorId: 'counselor-1',
  backupCounselorId: 'counselor-2',
});
```

### Support Ticket Fixtures

```typescript
const ticket = createTicketFixture({
  subject: 'Need help',
  priority: 'high',
  status: 'open',
});
```

### Creating Multiple Fixtures

```typescript
const users = createMultiple(createUserFixture, 5);
// Creates 5 users with IDs: test-id-1, test-id-2, etc.

const usersWithCustomData = createMultiple(
  createUserFixture,
  3,
  [
    { email: 'user1@test.com' },
    { email: 'user2@test.com' },
    { email: 'user3@test.com' },
  ]
);
```

## Best Practices

### 1. Use Fixtures for Test Data
Always use fixtures instead of creating raw test objects:

```typescript
// ✅ Good
const user = createUserFixture();

// ❌ Bad
const user = {
  id: 'test-id',
  email: 'test@example.com',
  // ... many more fields ...
};
```

### 2. Configure Mocks Before Use
Set up mock behavior before calling the service:

```typescript
prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);
const result = await service.getUser('user-1');
```

### 3. Use Type-Safe Mocks
Leverage TypeScript for better mocking:

```typescript
const mockService = createMock<MyService>();
mockService.method.mockResolvedValue(expectedResult);
```

### 4. Reset Mocks Between Tests
Clear mock state for test isolation:

```typescript
beforeEach(() => {
  resetPrismaMock(prismaMock);
});
```

### 5. Test Error Cases
Use expectToThrow for error testing:

```typescript
await expectToThrow(
  () => service.restrictedMethod(),
  ForbiddenException,
  'Access denied'
);
```

## Example: Complete Test Suite

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NoteService } from './note.service';
import {
  createTestingModule,
  createPrismaMock,
  createPermissionServiceMock,
  createEmailServiceMock,
  createUserFixture,
  createSessionFixture,
  createNoteFixture,
  expectToThrow,
} from '../testing';

describe('NoteService', () => {
  let service: NoteService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let permissionMock: ReturnType<typeof createPermissionServiceMock>;
  let emailMock: ReturnType<typeof createEmailServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    permissionMock = createPermissionServiceMock({ isOwner: true });
    emailMock = createEmailServiceMock();

    const module = await createTestingModule([
      NoteService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: PermissionService, useValue: permissionMock },
      { provide: EmailService, useValue: emailMock },
    ]);

    service = module.get<NoteService>(NoteService);
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      // Arrange
      const session = createSessionFixture();
      const user = createUserFixture();
      const noteData = { content: 'Test note', isPrivate: false };
      const createdNote = createNoteFixture(noteData);

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.user!.findUnique = jest.fn().mockResolvedValue(user);
      prismaMock.sessionNote!.create = jest.fn().mockResolvedValue(createdNote);
      permissionMock.canCreateNote = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.createNote(
        session.id,
        user.id,
        'org-1',
        noteData
      );

      // Assert
      expect(result).toEqual(createdNote);
      expect(permissionMock.canCreateNote).toHaveBeenCalledWith(
        user.id,
        session.id,
        'org-1',
        false
      );
    });

    it('should throw ForbiddenException when no permission', async () => {
      // Arrange
      permissionMock.canCreateNote = jest.fn().mockRejectedValue(
        new ForbiddenException('No permission')
      );

      // Act & Assert
      await expectToThrow(
        () => service.createNote('session-1', 'user-1', 'org-1', { content: 'Test' }),
        ForbiddenException,
        'No permission'
      );
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific file
npm test -- note.service.spec.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [jest-mock-extended Documentation](https://github.com/marchaos/jest-mock-extended)
