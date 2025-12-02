/**
 * Test data fixtures for creating consistent test entities
 * Provides factory functions for common database entities
 */

/**
 * User fixture factory
 */
export function createUserFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: '$2b$10$hashedPassword',
    accountType: 'member',
    emailVerified: true,
    subscriptionStatus: 'active',
    subscriptionTier: 'basic',
    subscriptionStart: new Date('2024-01-01'),
    subscriptionEnd: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Session fixture factory
 */
export function createSessionFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-session-id',
    userId: 'test-user-id',
    title: 'Test Counseling Session',
    summary: 'This is a test session summary',
    preferredTranslation: 'KJV',
    status: 'active',
    topics: JSON.stringify([]),
    isArchived: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: createUserFixture(),
    messages: [],
    notes: [],
    ...overrides,
  };
}

/**
 * Message fixture factory
 */
export function createMessageFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-message-id',
    sessionId: 'test-session-id',
    role: 'user',
    content: 'This is a test message',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Session note fixture factory
 */
export function createNoteFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-note-id',
    sessionId: 'test-session-id',
    authorId: 'test-user-id',
    authorName: 'Test User',
    authorRole: 'user',
    content: 'This is a test note',
    isPrivate: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Organization fixture factory
 */
export function createOrganizationFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    subscriptionLimit: 100,
    isArchived: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Organization membership fixture factory
 */
export function createMembershipFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-membership-id',
    organizationId: 'test-org-id',
    userId: 'test-user-id',
    role: 'member',
    joinedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Counselor assignment fixture factory
 */
export function createAssignmentFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-assignment-id',
    organizationId: 'test-org-id',
    counselorId: 'test-counselor-id',
    memberId: 'test-member-id',
    status: 'active',
    assignedAt: new Date('2024-01-01'),
    assignedBy: 'test-admin-id',
    ...overrides,
  };
}

/**
 * Counselor coverage grant fixture factory
 */
export function createCoverageGrantFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-coverage-id',
    primaryCounselorId: 'test-counselor-id',
    backupCounselorId: 'test-backup-id',
    memberId: 'test-member-id',
    grantedAt: new Date('2024-01-01'),
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  };
}

/**
 * Session share fixture factory
 */
export function createShareFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-share-id',
    sessionId: 'test-session-id',
    token: 'test-share-token',
    sharedWith: null,
    allowNotesAccess: false,
    expiresAt: null,
    createdAt: new Date('2024-01-01'),
    createdBy: 'test-user-id',
    ...overrides,
  };
}

/**
 * Counselor observation fixture factory
 */
export function createObservationFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-observation-id',
    organizationId: 'test-org-id',
    counselorId: 'test-counselor-id',
    memberId: 'test-member-id',
    type: 'general',
    content: 'This is a test observation',
    severity: 'medium',
    isResolved: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Subscription fixture factory
 */
export function createSubscriptionFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-subscription-id',
    userId: 'test-user-id',
    status: 'active',
    tier: 'basic',
    startDate: new Date('2024-01-01'),
    endDate: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Support ticket fixture factory
 */
export function createTicketFixture(overrides: Partial<any> = {}): any {
  return {
    id: 'test-ticket-id',
    userId: 'test-user-id',
    subject: 'Test Support Ticket',
    description: 'This is a test support ticket description',
    status: 'open',
    priority: 'medium',
    category: 'technical',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Subscription status DTO fixture
 */
export function createSubscriptionStatusFixture(overrides: Partial<any> = {}): any {
  return {
    subscriptionStatus: 'active',
    subscriptionTier: 'basic',
    maxClarifyingQuestions: 9,
    hasHistoryAccess: true,
    hasSharingAccess: true,
    hasArchiveAccess: true,
    ...overrides,
  };
}

/**
 * Create multiple fixtures of the same type
 */
export function createMultiple<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overridesArray?: Array<Partial<T>>
): T[] {
  return Array.from({ length: count }, (_, index) => {
    const overrides = overridesArray?.[index] || {};
    return factory({
      id: `test-id-${index + 1}`,
      ...overrides,
    } as Partial<T>);
  });
}
