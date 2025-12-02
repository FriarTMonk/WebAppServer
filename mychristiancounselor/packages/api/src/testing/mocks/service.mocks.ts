import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionService, SubscriptionFeature } from '../../subscription/subscription.service';
import { PermissionService } from '../../counsel/permission.service';
import { EmailService } from '../../email/email.service';

/**
 * Mock factories for common NestJS services
 */

/**
 * Create a mock ConfigService with common configuration values
 */
export function createConfigServiceMock(customConfig: Record<string, any> = {}): Partial<ConfigService> {
  const defaultConfig = {
    JWT_SECRET: 'test-jwt-secret',
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '30d',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    WEB_APP_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3697',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    SCRIPTURE_API_KEY: 'test-scripture-key',
    STRONGS_DB_PATH: '/path/to/test/strongs.db',
    STRIPE_SECRET_KEY: 'test-stripe-key',
    STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
    ...customConfig,
  };

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return defaultConfig[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value = defaultConfig[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" not found`);
      }
      return value;
    }),
  } as any;
}

/**
 * Create a mock JwtService
 */
export function createJwtServiceMock(): Partial<JwtService> {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'test-user-id', email: 'test@example.com' }),
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com' }),
  } as any;
}

/**
 * Create a mock SubscriptionService with configurable subscription status
 */
export function createSubscriptionServiceMock(hasSubscription = true): Partial<SubscriptionService> {
  const subscriptionStatus = {
    subscriptionStatus: hasSubscription ? ('active' as const) : ('none' as const),
    subscriptionTier: hasSubscription ? ('basic' as const) : undefined,
    maxClarifyingQuestions: hasSubscription ? 9 : 3,
    hasHistoryAccess: hasSubscription,
    hasSharingAccess: hasSubscription,
    hasArchiveAccess: hasSubscription,
  };

  return {
    getSubscriptionStatus: jest.fn().mockResolvedValue(subscriptionStatus),
    canAccessFeature: jest.fn().mockImplementation(
      async (userId: string | undefined | null, feature: SubscriptionFeature) => {
        if (!hasSubscription) return false;
        return true;
      }
    ),
    requireFeature: jest.fn().mockImplementation(
      async (userId: string | undefined | null, feature: SubscriptionFeature) => {
        if (!hasSubscription) {
          throw new Error('Feature requires subscription');
        }
      }
    ),
    requireHistoryAccess: jest.fn().mockImplementation(async () => {
      if (!hasSubscription) {
        throw new Error('History access requires subscription');
      }
    }),
    requireNoteAccess: jest.fn().mockImplementation(async () => {
      if (!hasSubscription) {
        throw new Error('Note access requires subscription');
      }
    }),
    requireSharingAccess: jest.fn().mockImplementation(async () => {
      if (!hasSubscription) {
        throw new Error('Sharing access requires subscription');
      }
    }),
    requireExportAccess: jest.fn().mockImplementation(async () => {
      if (!hasSubscription) {
        throw new Error('Export access requires subscription');
      }
    }),
    getMaxClarifyingQuestions: jest.fn().mockResolvedValue(subscriptionStatus.maxClarifyingQuestions),
    createSubscription: jest.fn().mockResolvedValue({}),
    cancelSubscription: jest.fn().mockResolvedValue({}),
  } as any;
}

/**
 * Create a mock PermissionService with configurable permissions
 */
export interface PermissionMockConfig {
  isOwner?: boolean;
  isAssignedCounselor?: boolean;
  isCoverageCounselor?: boolean;
  hasShareAccess?: boolean;
  allowNotesAccess?: boolean;
}

export function createPermissionServiceMock(config: PermissionMockConfig = {}): Partial<PermissionService> {
  const {
    isOwner = false,
    isAssignedCounselor = false,
    isCoverageCounselor = false,
    hasShareAccess = false,
    allowNotesAccess = false,
  } = config;

  return {
    isSessionOwner: jest.fn().mockResolvedValue(isOwner),
    isAssignedCounselor: jest.fn().mockResolvedValue(isAssignedCounselor),
    isCoverageCounselor: jest.fn().mockResolvedValue(isCoverageCounselor),
    getCounselorRole: jest.fn().mockResolvedValue({
      isAssigned: isAssignedCounselor,
      isCoverage: isCoverageCounselor,
      hasAccess: isAssignedCounselor || isCoverageCounselor,
      role: isAssignedCounselor ? 'assigned' : isCoverageCounselor ? 'coverage' : 'none',
    }),
    getShareAccess: jest.fn().mockResolvedValue({
      hasAccess: hasShareAccess,
      allowNotesAccess,
      shareId: hasShareAccess ? 'mock-share-id' : undefined,
    }),
    hasWriteShare: jest.fn().mockResolvedValue(hasShareAccess && allowNotesAccess),
    canCreateNote: jest.fn().mockResolvedValue(undefined),
    canAccessNotes: jest.fn().mockResolvedValue(undefined),
    canViewNote: jest.fn().mockResolvedValue(true),
    canEditNote: jest.fn().mockResolvedValue(undefined),
    canDeleteNote: jest.fn().mockResolvedValue(undefined),
    canMakeNotePrivate: jest.fn().mockResolvedValue(!isCoverageCounselor),
    canAccessSession: jest.fn().mockResolvedValue(isOwner || isAssignedCounselor || hasShareAccess),
    determineAuthorRole: jest.fn().mockResolvedValue(
      isOwner ? 'user' : isAssignedCounselor || isCoverageCounselor ? 'counselor' : 'viewer'
    ),
  } as any;
}

/**
 * Create a mock EmailService
 */
export function createEmailServiceMock(): Partial<EmailService> {
  return {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendNoteAddedEmail: jest.fn().mockResolvedValue(undefined),
    sendBillingEmail: jest.fn().mockResolvedValue(undefined),
    sendOrganizationInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendSupportTicketEmail: jest.fn().mockResolvedValue(undefined),
    sendSessionShareEmail: jest.fn().mockResolvedValue(undefined),
  } as any;
}
