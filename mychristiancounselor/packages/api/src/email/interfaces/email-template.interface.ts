/**
 * Email template interface
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base template data that all emails include
 */
export interface BaseTemplateData {
  recipientName?: string;
  appName: string;
  appUrl: string;
  supportEmail: string;
  currentYear: number;
}

/**
 * Email template types
 */
export type EmailType =
  | 'verification'
  | 'password_reset'
  | 'session_share'
  | 'note_added'
  | 'counselor_assignment'
  | 'org_invite'
  | 'billing'
  | 'crisis_alert';

/**
 * Verification email template data
 */
export interface VerificationEmailData extends BaseTemplateData {
  verificationUrl: string;
  expirationHours: number;
}

/**
 * Password reset email template data
 */
export interface PasswordResetEmailData extends BaseTemplateData {
  resetUrl: string;
  expirationHours: number;
}

/**
 * Session share email template data
 */
export interface SessionShareEmailData extends BaseTemplateData {
  senderName: string;
  sessionTitle: string;
  sessionTopics: string[];
  shareUrl: string;
  expiresAt?: Date;
}

/**
 * Note added email template data
 */
export interface NoteAddedEmailData extends BaseTemplateData {
  authorName: string;
  sessionTitle: string;
  sessionUrl: string;
}

/**
 * Counselor assignment email template data
 */
export interface CounselorAssignmentEmailData extends BaseTemplateData {
  counselorName?: string;
  memberName?: string;
  organizationName: string;
  dashboardUrl: string;
  isForMember: boolean; // true = email to member, false = email to counselor
}

/**
 * Organization invitation email template data
 */
export interface OrgInvitationEmailData extends BaseTemplateData {
  inviterName: string;
  organizationName: string;
  roleName: string;
  acceptUrl: string;
  expiresAt: Date;
}

/**
 * Billing email template data
 */
export interface BillingEmailData extends BaseTemplateData {
  emailSubType:
    | 'subscription_started'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'subscription_cancelled'
    | 'renewal_reminder'
    | 'org_90day_reminder'
    | 'org_30day_invoice'
    | 'org_suspension_notice'
    | 'org_suspended';
  amount?: number;
  currency?: string;
  nextBillingDate?: Date;
  invoiceUrl?: string;
  updatePaymentUrl?: string;
  gracePeriodDays?: number;
  organizationName?: string;
  renewalDate?: Date;
}

/**
 * Crisis alert email template data
 */
export interface CrisisAlertEmailData extends BaseTemplateData {
  counselorName: string;
  memberName: string;
  memberEmail: string;
  crisisType: string;
  confidence: string;
  detectionMethod: string;
  triggeringMessage: string;
  conversationUrl: string;
  memberProfileUrl: string;
}
