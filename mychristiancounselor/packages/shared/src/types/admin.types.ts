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
  UPDATE_LICENSE = 'update_license',
  DEACTIVATE_USER = 'deactivate_user',
  CREATE_ORGANIZATION = 'create_organization',
  DELETE_ORGANIZATION = 'delete_organization',
  VIEW_AUDIT_LOG = 'view_audit_log',
}
