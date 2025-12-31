// Counselor Assignment Types
export interface CounselorAssignment {
  id: string;
  counselorId: string;
  memberId: string;
  organizationId: string;
  status: 'active' | 'inactive';
  assignedBy: string;
  assignedAt: Date;
  endedAt?: Date;
  // Populated relations
  counselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface CreateCounselorAssignmentDto {
  counselorId: string;
  memberId: string;
  organizationId: string;
}

export interface AssignmentWithWorkload extends CounselorAssignment {
  caseloadCount?: number;
}

// Counselor Observation Types
export interface CounselorObservation {
  id: string;
  counselorId: string;
  memberId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateObservationDto {
  memberId: string;
  content: string;
}

export interface UpdateObservationDto {
  content: string;
}

// Counselor Coverage Types
export interface CounselorCoverageGrant {
  id: string;
  primaryCounselorId: string;
  backupCounselorId: string;
  memberId: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  // Populated relations
  primaryCounselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  backupCounselor?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateCoverageGrantDto {
  backupCounselorId: string;
  memberId: string;
  expiresAt?: Date;
}

// Member Wellbeing Status Types
export type WellbeingStatus = 'green' | 'yellow' | 'red';

export interface MemberWellbeingStatus {
  id: string;
  memberId: string;
  status: WellbeingStatus;
  aiSuggestedStatus: WellbeingStatus;
  overriddenBy?: string;
  summary: string;
  lastAnalyzedAt: Date;
  updatedAt: Date;
}

export interface OverrideStatusRequest {
  status: WellbeingStatus;
  reason: string;
}

export interface OverrideStatusResponse {
  success: boolean;
  status: MemberWellbeingStatus;
}

export interface RefreshAnalysisResponse {
  success: boolean;
  status: MemberWellbeingStatus | null;
}

// Counselor Dashboard Types
export interface CounselorMemberSummary {
  member: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  wellbeingStatus: MemberWellbeingStatus;
  lastLogin?: Date; // Most recent session created
  lastActive?: Date; // Most recent user message
  lastConversationDate?: Date; // Deprecated: use lastLogin instead
  totalConversations: number;
  observationCount: number;
  assignment: CounselorAssignment;
  // Task and assessment counts for status badges
  pendingTasks: number;
  overdueTasks: number;
  pendingAssessments: number;
}

// Notification Types
export type NotificationType = 'system' | 'message' | 'alert';
export type NotificationCategory =
  | 'assignment'
  | 'note_added'
  | 'status_change'
  | 'direct_message'
  | 'coverage_grant'
  | 'coverage_expiring';

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  linkTo?: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  // Populated relations
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateNotificationDto {
  recipientId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  linkTo?: string;
  expiresAt?: Date;
}

export interface SendMessageDto {
  recipientId: string;
  message: string;
}
