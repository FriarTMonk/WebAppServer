import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerClient } from 'postmark';
import { EmailConfig, SendEmailOptions, SendEmailResult } from './interfaces/email-config.interface';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTemplatesService } from './email-templates.service';

/**
 * Main email service with Postmark integration
 * Handles sending emails and mock mode for development
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly postmarkClient: ServerClient | null;
  private readonly mockMode: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private configService: ConfigService,
    private emailTracking: EmailTrackingService,
    private emailTemplates: EmailTemplatesService,
  ) {
    const apiKey = this.configService.get('POSTMARK_API_KEY');
    this.mockMode = this.configService.get('POSTMARK_MOCK_MODE', 'true') === 'true';
    this.fromEmail = this.configService.get('POSTMARK_FROM_EMAIL', 'noreply@mychristiancounselor.com');
    this.fromName = this.configService.get('POSTMARK_FROM_NAME', 'MyChristianCounselor');

    if (this.mockMode) {
      this.logger.warn('⚠️  Email service running in MOCK MODE - emails will not be sent');
      this.postmarkClient = null;
    } else {
      if (!apiKey) {
        throw new Error('POSTMARK_API_KEY is required when POSTMARK_MOCK_MODE is false');
      }
      this.postmarkClient = new ServerClient(apiKey);
      this.logger.log('✅ Postmark client initialized');
    }
  }

  /**
   * Send an email (either real or mocked)
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      if (this.mockMode) {
        return await this.sendMockEmail(options);
      }

      return await this.sendRealEmail(options);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message || 'Unknown error'}`, error);

      // Log failed email
      await this.emailTracking.markAsFailed({
        userId: options.userId,
        recipientEmail: options.to,
        emailType: options.emailType,
        bounceReason: error.message || 'Unknown error',
        metadata: options.metadata,
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send email via Postmark
   */
  private async sendRealEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const fromEmail = options.fromEmail || this.fromEmail;
    const fromName = options.fromName || this.fromName;

    const emailPayload: any = {
      From: `${fromName} <${fromEmail}>`,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.html,
      TextBody: options.text,
      Tag: options.tag || options.emailType,
      MessageStream: 'outbound',
    };

    // Add priority header if specified
    if (options.priority) {
      emailPayload.Headers = [
        {
          Name: 'X-Priority',
          Value: options.priority.toString(),
        },
      ];
    }

    const result = await this.postmarkClient!.sendEmail(emailPayload);

    // Log sent email
    const emailLogId = await this.emailTracking.logEmailSent({
      userId: options.userId,
      recipientEmail: options.to,
      emailType: options.emailType,
      postmarkId: result.MessageID,
      metadata: options.metadata,
    });

    this.logger.log(`✉️  Email sent to ${options.to} (MessageID: ${result.MessageID})`);

    return {
      success: true,
      messageId: result.MessageID,
      emailLogId,
    };
  }

  /**
   * Mock email sending (for development/testing)
   */
  private async sendMockEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log mock email
    const emailLogId = await this.emailTracking.logEmailSent({
      userId: options.userId,
      recipientEmail: options.to,
      emailType: options.emailType,
      postmarkId: mockMessageId,
      metadata: { ...options.metadata, mock: true },
    });

    this.logger.debug('📧 [MOCK EMAIL]');
    this.logger.debug(`   To: ${options.to}`);
    this.logger.debug(`   Subject: ${options.subject}`);
    this.logger.debug(`   Type: ${options.emailType}`);
    this.logger.debug(`   MessageID: ${mockMessageId}`);
    this.logger.debug('   ---');
    this.logger.debug(`   Preview: ${options.text.substring(0, 200)}...`);
    this.logger.debug('   ---');

    return {
      success: true,
      messageId: mockMessageId,
      emailLogId,
    };
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    recipientName: string | undefined,
    verificationToken: string,
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderVerificationEmail({
      recipientName,
      verificationToken,
      expirationHours: 24,
    });

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'verification',
      tag: 'verification',
      userId,
      metadata: {
        verificationToken,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    recipientName: string | undefined,
    resetToken: string,
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderPasswordResetEmail({
      recipientName,
      resetToken,
      expirationHours: 1,
    });

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'password_reset',
      tag: 'password-reset',
      userId,
      metadata: {
        resetToken,
      },
    });
  }

  /**
   * Send session share notification
   */
  async sendSessionShareEmail(
    email: string,
    data: {
      recipientName?: string;
      senderName: string;
      sessionTitle: string;
      sessionTopics: string[];
      shareToken: string;
      expiresAt?: Date;
    },
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderSessionShareEmail(data);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'session_share',
      tag: 'session-share',
      userId,
      metadata: {
        shareToken: data.shareToken,
        sessionTitle: data.sessionTitle,
      },
    });
  }

  /**
   * Send note added notification
   */
  async sendNoteAddedEmail(
    email: string,
    data: {
      recipientName?: string;
      authorName: string;
      sessionTitle: string;
      sessionId: string;
    },
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderNoteAddedEmail(data);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'note_added',
      tag: 'note-added',
      userId,
      metadata: {
        sessionId: data.sessionId,
        authorName: data.authorName,
      },
    });
  }

  /**
   * Send counselor assignment notification
   */
  async sendCounselorAssignmentEmail(
    email: string,
    data: {
      recipientName: string;
      counselorName?: string;
      memberName?: string;
      organizationName: string;
      isForMember: boolean;
    },
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderCounselorAssignmentEmail(data);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'counselor_assignment',
      tag: 'counselor-assignment',
      userId,
      metadata: {
        organizationName: data.organizationName,
        isForMember: data.isForMember,
      },
    });
  }

  /**
   * Send organization invitation
   */
  async sendOrgInvitationEmail(
    email: string,
    data: {
      recipientName?: string;
      inviterName: string;
      organizationName: string;
      roleName: string;
      inviteToken: string;
      expiresAt: Date;
    },
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderOrgInvitationEmail(data);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'org_invite',
      tag: 'org-invitation',
      userId,
      metadata: {
        inviteToken: data.inviteToken,
        organizationName: data.organizationName,
      },
    });
  }

  /**
   * Send billing notification
   */
  async sendBillingEmail(
    email: string,
    data: {
      recipientName?: string;
      emailSubType: string;
      amount?: number;
      nextBillingDate?: Date;
      organizationName?: string;
    },
    userId?: string,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderBillingEmail(data);

    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'billing',
      tag: `billing-${data.emailSubType}`,
      userId,
      metadata: {
        billingSubType: data.emailSubType,
        amount: data.amount,
      },
    });
  }

  /**
   * Send marketing campaign email
   */
  async sendMarketingCampaignEmail(
    email: string,
    data: {
      recipientName?: string;
      subject: string;
      htmlBody: string;
      textBody: string;
      campaignId: string;
      prospectId: string;
    },
  ): Promise<SendEmailResult> {
    const template = this.emailTemplates.renderMarketingCampaignEmail(data);

    const salesEmail = this.configService.get('POSTMARK_SALES_EMAIL', 'sales@mychristiancounselor.online');

    return this.sendEmail({
      to: email,
      fromEmail: salesEmail,
      fromName: 'MyChristianCounselor Sales',
      subject: template.subject,
      html: template.html,
      text: template.text,
      emailType: 'marketing_campaign',
      tag: 'marketing-campaign',
      metadata: {
        campaignId: data.campaignId,
        prospectId: data.prospectId,
      },
    });
  }
}
