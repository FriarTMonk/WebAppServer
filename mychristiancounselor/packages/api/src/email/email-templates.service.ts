import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailTemplate,
  VerificationEmailData,
  PasswordResetEmailData,
  SessionShareEmailData,
  NoteAddedEmailData,
  CounselorAssignmentEmailData,
  OrgInvitationEmailData,
  BillingEmailData,
  BaseTemplateData,
} from './interfaces/email-template.interface';
import { renderVerificationEmail } from './templates/verification.template';
import { renderPasswordResetEmail } from './templates/password-reset.template';
import { renderSessionShareEmail } from './templates/session-share.template';
import { renderNoteAddedEmail } from './templates/note-added.template';
import { renderCounselorAssignmentEmail } from './templates/counselor-assignment.template';
import { renderOrgInvitationEmail } from './templates/org-invite.template';
import { renderSubscriptionStartedEmail } from './templates/subscription-started.template';
import { renderPaymentSucceededEmail } from './templates/payment-succeeded.template';
import { renderPaymentFailedEmail } from './templates/payment-failed.template';
import { renderSubscriptionCancelledEmail } from './templates/subscription-cancelled.template';
import { renderRenewalReminderEmail } from './templates/renewal-reminder.template';
import { renderOrg90DayReminderEmail } from './templates/org-90day-reminder.template';
import { renderOrg30DayInvoiceEmail } from './templates/org-30day-invoice.template';
import { renderOrgSuspensionNoticeEmail } from './templates/org-suspension-notice.template';
import { renderOrgSuspendedEmail } from './templates/org-suspended.template';

/**
 * Service for rendering email templates
 * Centralizes all email template generation logic
 */
@Injectable()
export class EmailTemplatesService {
  private readonly appName: string;
  private readonly appUrl: string;
  private readonly supportEmail: string;

  constructor(private configService: ConfigService) {
    this.appName = this.configService.get('APP_NAME', 'MyChristianCounselor');
    this.appUrl = this.configService.get('WEB_APP_URL', 'http://localhost:3699');
    this.supportEmail = this.configService.get('SUPPORT_EMAIL', 'support@mychristiancounselor.com');
  }

  /**
   * Get base template data that all emails include
   */
  private getBaseTemplateData(recipientName?: string): BaseTemplateData {
    return {
      recipientName,
      appName: this.appName,
      appUrl: this.appUrl,
      supportEmail: this.supportEmail,
      currentYear: new Date().getFullYear(),
    };
  }

  /**
   * Render email verification template
   */
  renderVerificationEmail(data: {
    recipientName?: string;
    verificationToken: string;
    expirationHours?: number;
  }): EmailTemplate {
    const verificationUrl = `${this.appUrl}/verify-email/${data.verificationToken}`;

    const templateData: VerificationEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      verificationUrl,
      expirationHours: data.expirationHours || 24,
    };

    return renderVerificationEmail(templateData);
  }

  /**
   * Render password reset template
   */
  renderPasswordResetEmail(data: {
    recipientName?: string;
    resetToken: string;
    expirationHours?: number;
  }): EmailTemplate {
    const resetUrl = `${this.appUrl}/reset-password/${data.resetToken}`;

    const templateData: PasswordResetEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      resetUrl,
      expirationHours: data.expirationHours || 1,
    };

    return renderPasswordResetEmail(templateData);
  }

  /**
   * Render session share notification template
   */
  renderSessionShareEmail(data: {
    recipientName?: string;
    senderName: string;
    sessionTitle: string;
    sessionTopics: string[];
    shareToken: string;
    expiresAt?: Date;
  }): EmailTemplate {
    const shareUrl = `${this.appUrl}/shared/${data.shareToken}`;

    const templateData: SessionShareEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      senderName: data.senderName,
      sessionTitle: data.sessionTitle,
      sessionTopics: data.sessionTopics,
      shareUrl,
      expiresAt: data.expiresAt,
    };

    return renderSessionShareEmail(templateData);
  }

  /**
   * Render note added notification template
   */
  renderNoteAddedEmail(data: {
    recipientName?: string;
    authorName: string;
    sessionTitle: string;
    sessionId: string;
  }): EmailTemplate {
    const sessionUrl = `${this.appUrl}/sessions/${data.sessionId}?tab=notes`;

    const templateData: NoteAddedEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      authorName: data.authorName,
      sessionTitle: data.sessionTitle,
      sessionUrl,
    };

    return renderNoteAddedEmail(templateData);
  }

  /**
   * Render counselor assignment notification template
   */
  renderCounselorAssignmentEmail(data: {
    recipientName: string;
    counselorName?: string;
    memberName?: string;
    organizationName: string;
    isForMember: boolean;
  }): EmailTemplate {
    const dashboardUrl = data.isForMember
      ? `${this.appUrl}/dashboard`
      : `${this.appUrl}/counselor/dashboard`;

    const templateData: CounselorAssignmentEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      counselorName: data.counselorName,
      memberName: data.memberName,
      organizationName: data.organizationName,
      dashboardUrl,
      isForMember: data.isForMember,
    };

    return renderCounselorAssignmentEmail(templateData);
  }

  /**
   * Render organization invitation template
   */
  renderOrgInvitationEmail(data: {
    recipientName?: string;
    inviterName: string;
    organizationName: string;
    roleName: string;
    inviteToken: string;
    expiresAt: Date;
  }): EmailTemplate {
    const acceptUrl = `${this.appUrl}/invitations/accept/${data.inviteToken}`;

    const templateData: OrgInvitationEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      inviterName: data.inviterName,
      organizationName: data.organizationName,
      roleName: data.roleName,
      acceptUrl,
      expiresAt: data.expiresAt,
    };

    return renderOrgInvitationEmail(templateData);
  }

  /**
   * Render billing notification template
   */
  renderBillingEmail(data: {
    recipientName?: string;
    emailSubType: string;
    amount?: number;
    currency?: string;
    nextBillingDate?: Date;
    invoiceUrl?: string;
    updatePaymentUrl?: string;
    gracePeriodDays?: number;
    organizationName?: string;
    renewalDate?: Date;
  }): EmailTemplate {
    const templateData: BillingEmailData = {
      ...this.getBaseTemplateData(data.recipientName),
      emailSubType: data.emailSubType as any,
      amount: data.amount,
      currency: data.currency || 'USD',
      nextBillingDate: data.nextBillingDate,
      invoiceUrl: data.invoiceUrl,
      updatePaymentUrl: data.updatePaymentUrl,
      gracePeriodDays: data.gracePeriodDays,
      organizationName: data.organizationName,
      renewalDate: data.renewalDate,
    };

    // Route to appropriate template based on subtype
    switch (data.emailSubType) {
      case 'subscription_started':
        return renderSubscriptionStartedEmail(templateData);
      case 'payment_succeeded':
        return renderPaymentSucceededEmail(templateData);
      case 'payment_failed':
        return renderPaymentFailedEmail(templateData);
      case 'subscription_cancelled':
        return renderSubscriptionCancelledEmail(templateData);
      case 'renewal_reminder':
        return renderRenewalReminderEmail(templateData);
      case 'org_90day_reminder':
        return renderOrg90DayReminderEmail(templateData);
      case 'org_30day_invoice':
        return renderOrg30DayInvoiceEmail(templateData);
      case 'org_suspension_notice':
        return renderOrgSuspensionNoticeEmail(templateData);
      case 'org_suspended':
        return renderOrgSuspendedEmail(templateData);
      default:
        throw new Error(`Unknown billing email subtype: ${data.emailSubType}`);
    }
  }
}
