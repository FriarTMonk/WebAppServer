export interface Session {
  id: string;
  userId: string | null;
  title: string;
  messages: Message[];
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scriptureReferences: ScriptureReference[];
  timestamp: Date;
}

// Bible translation type - Multiple translations available
export type BibleTranslation = 'KJV' | 'ASV' | 'NIV' | 'ESV' | 'NASB' | 'NKJV' | 'NLT' | 'YLT';

// Translation metadata interface
export interface TranslationInfo {
  code: BibleTranslation;
  name: string;
  fullName: string;
  description: string;
  yearPublished?: number;
  characteristics?: string[];
}

export interface StrongsNumber {
  word: string;
  number: string; // e.g., "H7225" or "G26"
  position: number;
}

export interface StrongsDefinition {
  number: string; // e.g., "H7225" or "G26"
  transliteration: string; // e.g., "reshiyth"
  pronunciation: string; // e.g., "ray-sheeth'"
  definition: string; // Short definition
  lemma?: string; // Original Greek/Hebrew word
  derivation?: string; // Etymology
  usage?: string; // How it's used in context
  occurrences?: number; // Number of times it appears
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: BibleTranslation;
  text: string;
  strongs?: StrongsNumber[]; // Strong's concordance numbers
}

export interface CounselRequest {
  sessionId: string;
  message: string;
  preferredTranslation?: BibleTranslation; // Optional, defaults to ASV
}

export interface CounselResponse {
  sessionId: string;
  message: Message;
  requiresClarification: boolean;
  clarifyingQuestion?: string;
  isCrisisDetected?: boolean;
  crisisResources?: CrisisResource[];
  isGriefDetected?: boolean;
  griefResources?: GriefResource[];
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
}

export interface GriefResource {
  name: string;
  contact: string;
  description: string;
}

// ===== AUTH TYPES =====

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetDto {
  token: string;
  newPassword: string;
}

export interface EmailVerificationDto {
  token: string;
}

// ===== ORGANIZATION TYPES =====

export type LicenseType = 'Family' | 'Small' | 'Medium' | 'Large';
export type LicenseStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  licenseType: LicenseType | null;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: Date | null;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  joinedAt: Date;
  user: User;
  role: OrganizationRole;
}

export interface OrganizationRole {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  invitedById: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  organization: Organization;
  invitedBy: User;
}

// Permission system
export enum Permission {
  // Organization management
  MANAGE_ORGANIZATION = 'manage_organization',
  VIEW_ORGANIZATION = 'view_organization',

  // Member management
  MANAGE_MEMBERS = 'manage_members',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  VIEW_MEMBERS = 'view_members',

  // Role management
  MANAGE_ROLES = 'manage_roles',
  ASSIGN_ROLES = 'assign_roles',

  // Counseling features
  VIEW_MEMBER_CONVERSATIONS = 'view_member_conversations',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',

  // Billing (for future)
  MANAGE_BILLING = 'manage_billing',
  VIEW_BILLING = 'view_billing',
}

// DTOs for organization operations
export interface CreateOrganizationDto {
  name: string;
  description?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
}

export interface InviteMemberDto {
  email: string;
  roleId: string;
}

export interface UpdateMemberRoleDto {
  roleId: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export interface AcceptInvitationDto {
  token: string;
}

export * from './admin.types';
