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
  theme?: string; // Theological theme or concept (e.g., "faith", "forgiveness", "grace")
  source?: 'ai-cited' | 'related' | 'theme'; // Source of the scripture: AI-cited, related verse, or theme-based
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
  currentSessionQuestionCount?: number;
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
  subscriptionStatus?: string;
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
  sub: string; // userId (when morphed, this is the morphed user's ID)
  email: string;
  iat?: number;
  exp?: number;
  // Morph session metadata (optional, only present when admin is morphed into another user)
  isMorphed?: boolean; // True when this token represents a morphed session
  originalAdminId?: string; // ID of the admin who initiated the morph
  morphSessionId?: string; // UUID linking all actions during this morph session
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
  MANAGE_ORGANIZATION = 'MANAGE_ORGANIZATION',
  VIEW_ORGANIZATION = 'VIEW_ORGANIZATION',

  // Member management
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  REMOVE_MEMBERS = 'REMOVE_MEMBERS',
  VIEW_MEMBERS = 'VIEW_MEMBERS',

  // Role management
  MANAGE_ROLES = 'MANAGE_ROLES',
  ASSIGN_ROLES = 'ASSIGN_ROLES',

  // Counseling features
  VIEW_MEMBER_CONVERSATIONS = 'VIEW_MEMBER_CONVERSATIONS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA',

  // Billing (for future)
  MANAGE_BILLING = 'MANAGE_BILLING',
  VIEW_BILLING = 'VIEW_BILLING',
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

// ===== SESSION NOTES (JOURNALING) TYPES =====

export interface SessionNote {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'counselor' | 'viewer';
  content: string;
  isPrivate: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateNoteRequest {
  content: string;
  isPrivate?: boolean;
}

export interface UpdateNoteRequest {
  content?: string;
  isPrivate?: boolean;
}

export interface NotesResponse {
  notes: SessionNote[];
}

// ===== SESSION SHARING TYPES =====

export interface SessionShare {
  id: string;
  sessionId: string;
  shareToken: string;
  sharedBy: string;
  sharedWith: string | null;
  organizationId: string | null;
  createdAt: Date | string;
  expiresAt: Date | string | null;
}

export interface CreateShareRequest {
  sessionId: string;
  expiresInDays?: number; // 7, 30, 90, or null for no expiration
  allowNotesAccess?: boolean; // If true, recipients can add notes (default: false - read-only)
  sharedWith?: string; // Optional email or user ID
}

export interface CreateShareResponse {
  share: SessionShare;
  shareUrl: string;
}

export interface ValidateShareResponse {
  sessionId: string;
  canView: boolean;
  canAddNotes: boolean;
  sharedBy: string;
  expiresAt: Date | string | null;
}

export * from './admin.types';
export * from './counselor.types';
