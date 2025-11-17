export interface MorphSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  startedAt: Date;
  expiresAt: Date;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId?: string;
  targetOrgId?: string;
  morphSessionId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface PlatformMetrics {
  activeUsers: {
    total: number;
    individual: number;
    organization: number;
  };
  activeSessions: number;
  organizations: {
    total: number;
    trial: number;
    active: number;
    expired: number;
  };
  revenue: {
    mrr: number;
    arr: number;
  };
  systemHealth: {
    apiResponseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    dbConnections: number;
  };
}

export interface OrgMetrics {
  organizationId: string;
  activeMembers: number;
  counselingSessions: number;
  licenseUtilization: {
    used: number;
    available: number;
    percentage: number;
  };
}

export enum AdminAction {
  MORPH_START = 'morph_start',
  MORPH_END = 'morph_end',
  PASSWORD_RESET = 'password_reset',
  UPDATE_USER_ROLE = 'update_user_role',
  UPDATE_LICENSE = 'update_license',
  DEACTIVATE_USER = 'deactivate_user',
  CREATE_ORGANIZATION = 'create_organization',
  DELETE_ORGANIZATION = 'delete_organization',
  VIEW_AUDIT_LOG = 'view_audit_log',
}

// ===== MORPH OPERATION DTOS =====

export interface MorphStartResponse {
  accessToken: string; // New JWT token with morph metadata
  morphSessionId: string;
  morphedUser: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  message: string;
}

export interface MorphEndResponse {
  accessToken: string; // Restored original admin JWT token
  message: string;
}

// ===== PASSWORD RESET DTOS =====

export interface AdminResetPasswordDto {
  newPassword: string;
}

export interface AdminResetPasswordResponse {
  message: string;
  userId: string;
}

// ===== ORGANIZATION MEMBER DTOS =====

export interface AdminOrganizationMember {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleName: string;
  roleId: string;
  joinedAt: Date | string;
}

export interface GetOrganizationMembersResponse {
  members: AdminOrganizationMember[];
  organizationId: string;
  organizationName: string;
}

export interface UpdateMemberRoleRequest {
  roleId: string;
}

export interface UpdateMemberRoleResponse {
  message: string;
  member: AdminOrganizationMember;
}

// ===== SUBSCRIPTION MANAGEMENT DTOS =====

export interface UpdateUserSubscriptionRequest {
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionTier?: 'basic' | 'premium' | null;
  subscriptionStart?: string; // ISO date string
  subscriptionEnd?: string; // ISO date string
}

export interface UpdateUserSubscriptionResponse {
  message: string;
  userId: string;
  subscriptionStatus: string;
  subscriptionTier?: string | null;
}

export interface UpdateOrganizationSubscriptionRequest {
  maxMembers?: number; // Subscription seat limit
  licenseStatus?: 'trial' | 'active' | 'expired' | 'cancelled';
  licenseType?: string; // 'Family', 'Small', 'Medium', 'Large'
  licenseExpiresAt?: string; // ISO date string
}

export interface UpdateOrganizationSubscriptionResponse {
  message: string;
  organizationId: string;
  maxMembers: number;
  licenseStatus: string;
  currentMemberCount: number;
}
