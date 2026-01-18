import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupportService } from '../support/support.service';
import { SalesService } from '../sales/sales.service';
import { EmailService } from '../email/email.service';
import { EmailTrackingService } from '../email/email-tracking.service';
import { OptOutService } from '../marketing/opt-out.service';
import { PostmarkInboundDto } from './dto/postmark-inbound.dto';
import { PostmarkTrackingWebhookDto, PostmarkBounceWebhookDto } from './dto/postmark-tracking.dto';
import { CreateTicketDto } from '../support/dto/create-ticket.dto';
import { CreateOpportunityDto } from '../sales/dto/create-opportunity.dto';
import { SalesStage, LeadSource } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private supportService: SupportService,
    private salesService: SalesService,
    private emailService: EmailService,
    private emailTrackingService: EmailTrackingService,
    private optOutService: OptOutService,
  ) {}

  async handleInboundEmail(emailData: PostmarkInboundDto): Promise<any> {
    this.logger.log(`Received inbound email from ${emailData.FromFull.Email}`);

    try {
      // Filter: Only process emails sent to allowed recipients (configured via env)
      const allowedRecipientsEnv = process.env.INBOUND_EMAIL_ALLOWED_RECIPIENTS || '';
      const allowedRecipients = allowedRecipientsEnv
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0);

      const recipientEmails = emailData.ToFull.map(to => to.Email.toLowerCase());

      const hasAllowedRecipient = recipientEmails.some(email =>
        allowedRecipients.includes(email)
      );

      if (!hasAllowedRecipient) {
        this.logger.warn(
          `Rejected email from ${emailData.FromFull.Email} - ` +
          `recipients [${recipientEmails.join(', ')}] not in allowed list`
        );
        return {
          success: false,
          error: 'Email address not configured for support tickets',
        };
      }

      // Detect if this is a sales email
      const isSalesEmail = recipientEmails.some(email =>
        email.includes('sales@') || email.includes('sales+')
      );

      if (isSalesEmail) {
        this.logger.log(`Routing to sales pipeline: ${emailData.FromFull.Email}`);
        return await this.handleSalesEmail(emailData);
      }

      // Extract email details
      const fromEmail = emailData.FromFull.Email.toLowerCase();
      const fromName = emailData.FromFull.Name || fromEmail;
      const subject = emailData.Subject || 'No Subject';
      const body = emailData.TextBody || emailData.HtmlBody || '';

      // Find or create user by email
      let user = await this.prisma.user.findUnique({
        where: { email: fromEmail },
      });

      if (!user) {
        // Create a new user account for this email sender
        this.logger.log(`Creating new user account for ${fromEmail}`);

        const [firstName, ...lastNameParts] = fromName.split(' ');

        user = await this.prisma.user.create({
          data: {
            email: fromEmail,
            firstName: firstName || 'Support',
            lastName: lastNameParts.join(' ') || 'User',
            password: '', // No password - they'll need to use password reset to set one
            accountType: 'individual',
            subscriptionStatus: 'none',
            isActive: true,
            emailVerified: true, // Auto-verify since they can receive emails
          },
        });

        this.logger.log(`Created user ${user.id} for ${fromEmail}`);
      }

      // Parse ticket information
      const ticketData = this.parseEmailToTicket(subject, body);

      // Create support ticket
      const ticket = await this.supportService.createTicket(user.id, ticketData);

      this.logger.log(`Created ticket #${ticket.ticketNumber} from email`);

      // Send confirmation email
      await this.sendTicketConfirmationEmail(
        fromEmail,
        fromName,
        ticket.ticketNumber,
        subject
      );

      return {
        success: true,
        ticketNumber: ticket.ticketNumber,
        userId: user.id,
      };
    } catch (error) {
      this.logger.error('Failed to process inbound email', {
        error: error.message,
        stack: error.stack,
        from: emailData.FromFull.Email,
      });

      // Try to send error notification to sender
      try {
        await this.emailService.sendEmail({
          to: emailData.FromFull.Email,
          subject: 'Support Request - Processing Error',
          text: `We received your support request but encountered an error processing it. Please try again or visit ${process.env.WEB_APP_URL}/support/new to submit your request directly.\n\nError: ${error.message}`,
          html: `
            <h2>Support Request - Processing Error</h2>
            <p>We received your support request but encountered an error processing it.</p>
            <p>Please try again or visit <a href="${process.env.WEB_APP_URL}/support/new">our support page</a> to submit your request directly.</p>
            <p><small>Error: ${error.message}</small></p>
          `,
        });
      } catch (emailError) {
        this.logger.error('Failed to send error notification email', emailError);
      }

      throw error;
    }
  }

  private parseEmailToTicket(subject: string, body: string): CreateTicketDto {
    // Clean and prepare title (subject)
    let title = subject.trim();

    // Remove common email prefixes
    title = title.replace(/^(Re:|Fwd:|RE:|FW:)\s*/gi, '').trim();

    // Ensure title meets min/max length requirements
    if (title.length < 10) {
      title = `Support Request: ${title}`;
    }
    if (title.length > 200) {
      title = title.substring(0, 197) + '...';
    }

    // Clean and prepare description (body)
    let description = body.trim();

    // Remove excessive whitespace
    description = description.replace(/\n{3,}/g, '\n\n');

    // Ensure description meets min/max length requirements
    if (description.length < 50) {
      description = `${description}\n\n[This ticket was created from an email. The original message was shorter than our usual minimum, but we've processed it anyway.]`;
    }
    if (description.length > 5000) {
      description = description.substring(0, 4950) + '\n\n[Message truncated due to length]';
    }

    // Detect category from content
    const category = this.detectCategory(title, description);

    return {
      title,
      description,
      category,
      priority: 'medium', // Let AI detection determine priority
    };
  }

  private detectCategory(title: string, body: string): string {
    const content = `${title} ${body}`.toLowerCase();

    // Check for billing/payment keywords
    if (content.match(/\b(billing|payment|invoice|charge|subscription|refund|card|cancel)\b/)) {
      return 'billing';
    }

    // Check for account keywords
    if (content.match(/\b(account|login|password|reset|access|verify|email)\b/)) {
      return 'account';
    }

    // Check for license/organization keywords
    if (content.match(/\b(license|organization|org|member|invite|seat|quota)\b/)) {
      return 'license_management';
    }

    // Check for member issues keywords
    if (content.match(/\b(member|user|counselor|assign|permission|role)\b/)) {
      return 'member_issues';
    }

    // Check for feature request keywords
    if (content.match(/\b(feature|request|suggest|add|improve|enhancement|would be nice)\b/)) {
      return 'feature_request';
    }

    // Check for counselor tools keywords
    if (content.match(/\b(counsel|session|journal|notes|export|report)\b/)) {
      return 'counselor_tools';
    }

    // Default to technical
    return 'technical';
  }

  private async sendTicketConfirmationEmail(
    toEmail: string,
    toName: string,
    ticketNumber: string,
    subject: string
  ): Promise<void> {
    const webAppUrl = process.env.WEB_APP_URL || 'https://www.mychristiancounselor.online';

    await this.emailService.sendEmail({
      to: toEmail,
      subject: `Support Ticket Created - #${ticketNumber}`,
      text: `Hello ${toName},

Thank you for contacting MyChristianCounselor support!

Your support request has been received and a ticket has been created:

Ticket Number: #${ticketNumber}
Subject: ${subject}

Our support team will review your request and respond as soon as possible. You can view and track your ticket at:
${webAppUrl}/support/tickets

To reply to this ticket, simply reply to this email or visit the link above.

Best regards,
MyChristianCounselor Support Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Support Ticket Created</h2>

          <p>Hello ${toName},</p>

          <p>Thank you for contacting MyChristianCounselor support!</p>

          <p>Your support request has been received and a ticket has been created:</p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Ticket Number:</strong> #${ticketNumber}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          </div>

          <p>Our support team will review your request and respond as soon as possible.</p>

          <p>
            <a href="${webAppUrl}/support/tickets"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
              View Your Ticket
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            To reply to this ticket, simply reply to this email or click the link above.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 12px;">
            Best regards,<br>
            MyChristianCounselor Support Team
          </p>
        </div>
      `,
    });

    this.logger.log(`Sent confirmation email to ${toEmail} for ticket #${ticketNumber}`);
  }

  /**
   * Handle sales inquiry emails
   */
  async handleSalesEmail(emailData: PostmarkInboundDto): Promise<any> {
    try {
      // Extract email details
      const fromEmail = emailData.FromFull.Email.toLowerCase();
      const fromName = emailData.FromFull.Name || fromEmail;
      const subject = emailData.Subject || 'No Subject';
      const body = emailData.TextBody || emailData.HtmlBody || '';

      // Check for opt-out request FIRST
      const isOptOut = this.optOutService.isOptOutRequest(`${subject} ${body}`);

      if (isOptOut) {
        this.logger.log(`Detected opt-out request from ${fromEmail}`);

        // Process the opt-out
        const optOutResult = await this.optOutService.processOptOut(fromEmail);

        if (optOutResult.success) {
          this.logger.log(
            `Successfully processed opt-out for ${fromEmail}: ` +
            `contact=${optOutResult.contactOptedOut}, prospect=${optOutResult.prospectOptedOut}`
          );

          // Send confirmation email
          await this.sendOptOutConfirmationEmail(fromEmail, fromName);

          return {
            success: true,
            optedOut: true,
            contactOptedOut: optOutResult.contactOptedOut,
            prospectOptedOut: optOutResult.prospectOptedOut,
            message: optOutResult.message,
          };
        } else {
          this.logger.warn(`Opt-out processing failed for ${fromEmail}: ${optOutResult.message}`);
          // Continue with normal sales flow if opt-out fails (email might not be in system)
        }
      }

      // Check if this email is from a prospect contact in a marketing campaign
      let campaignRecipientId: string | undefined;
      const prospectContact = await this.prisma.prospectContact.findFirst({
        where: { email: fromEmail },
        include: { prospect: true },
      });

      if (prospectContact) {
        this.logger.log(`Found prospect contact ${prospectContact.id} for email ${fromEmail} (prospect: ${prospectContact.prospectId})`);

        // Check if already opted out - don't create opportunity
        if (prospectContact.optOut) {
          this.logger.warn(`Email from opted-out contact ${fromEmail} - skipping opportunity creation`);
          return {
            success: false,
            error: 'Contact has opted out of communications',
          };
        }

        // Find the most recent EmailCampaignRecipient that hasn't been marked as replied
        const recipient = await this.prisma.emailCampaignRecipient.findFirst({
          where: {
            prospectContactId: prospectContact.id,
            repliedAt: null,
            sentAt: { not: null }, // Only consider campaigns that were actually sent
          },
          orderBy: { sentAt: 'desc' },
        });

        if (recipient) {
          this.logger.log(
            `Tracking reply for campaign recipient ${recipient.id} (campaign: ${recipient.campaignId})`
          );

          // Update the recipient with reply timestamp
          await this.prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: { repliedAt: new Date() },
          });

          campaignRecipientId = recipient.id;
        }
      }

      // Find or create user by email
      let user = await this.prisma.user.findUnique({
        where: { email: fromEmail },
      });

      if (!user) {
        this.logger.log(`Creating new user account for sales inquiry: ${fromEmail}`);

        const [firstName, ...lastNameParts] = fromName.split(' ');

        user = await this.prisma.user.create({
          data: {
            email: fromEmail,
            firstName: firstName || 'Sales',
            lastName: lastNameParts.join(' ') || 'Inquiry',
            password: '',
            accountType: 'individual',
            subscriptionStatus: 'none',
            isActive: true,
            emailVerified: true,
          },
        });

        this.logger.log(`Created user ${user.id} for sales inquiry ${fromEmail}`);
      }

      // Parse opportunity data from email
      const opportunityData = this.parseEmailToOpportunity(subject, body, fromEmail, fromName);

      // Add campaign recipient link if found
      if (campaignRecipientId) {
        opportunityData.campaignRecipientId = campaignRecipientId;
      }

      // Create sales opportunity
      const opportunity = await this.salesService.createOpportunity(user.id, opportunityData);

      this.logger.log(
        `Created opportunity ${opportunity.id} from sales email` +
        (campaignRecipientId ? ` (linked to campaign recipient ${campaignRecipientId})` : '')
      );

      // Send confirmation email
      await this.sendSalesConfirmationEmail(
        fromEmail,
        fromName,
        opportunity.id,
        subject
      );

      return {
        success: true,
        opportunityId: opportunity.id,
        userId: user.id,
        campaignRecipientId,
      };
    } catch (error) {
      this.logger.error('Failed to process sales email', {
        error: error.message,
        stack: error.stack,
        from: emailData.FromFull.Email,
      });

      throw error;
    }
  }

  /**
   * Parse email content to create sales opportunity
   */
  private parseEmailToOpportunity(
    subject: string,
    body: string,
    email: string,
    name: string
  ): CreateOpportunityDto {
    // Clean and prepare title
    let title = subject.trim();
    title = title.replace(/^(Re:|Fwd:|RE:|FW:)\s*/gi, '').trim();

    if (title.length < 10) {
      title = `Sales Inquiry: ${title}`;
    }
    if (title.length > 200) {
      title = title.substring(0, 197) + '...';
    }

    // Clean and prepare description
    let description = body.trim();
    description = description.replace(/\n{3,}/g, '\n\n');

    if (description.length < 20) {
      description = `${description}\n\n[Sales inquiry received via email from ${name} (${email})]`;
    }
    if (description.length > 5000) {
      description = description.substring(0, 4950) + '\n\n[Message truncated]';
    }

    // Detect deal value from content
    const dealValue = this.detectDealValue(title, description);

    // Detect company name
    const companyName = this.detectCompanyName(email, body);

    // Extract name parts
    const [firstName, ...lastNameParts] = name.split(' ');

    return {
      title,
      description,
      contactName: name,
      contactEmail: email,
      companyName,
      leadSource: LeadSource.email,
      dealValue,
      probability: 20, // Initial probability for email leads
    };
  }

  /**
   * Detect deal value from email content
   */
  private detectDealValue(title: string, body: string): number {
    const content = `${title} ${body}`.toLowerCase();

    // Look for explicit dollar amounts
    const dollarMatch = content.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1].replace(/,/g, ''));
    }

    // Look for keywords indicating enterprise/organization scale
    if (content.match(/\b(enterprise|organization|church|ministry|school|university)\b/i)) {
      // Check for license counts
      const licenseMatch = content.match(/(\d+)\s*(licenses?|seats?|users?)/i);
      if (licenseMatch) {
        const count = parseInt(licenseMatch[1]);
        return count * 20; // Estimate $20 per seat/month * 12 months
      }
      return 5000; // Default enterprise estimate
    }

    // Look for team size mentions
    const teamMatch = content.match(/(\d+)\s*(people|members|counselors?|staff)/i);
    if (teamMatch) {
      const count = parseInt(teamMatch[1]);
      return count * 15 * 12; // $15/seat/month * 12 months
    }

    // Default individual inquiry
    return 500;
  }

  /**
   * Detect company name from email domain or content
   */
  private detectCompanyName(email: string, body: string): string | undefined {
    // Extract domain from email
    const domain = email.split('@')[1];

    // Skip common free email providers
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    if (!freeProviders.includes(domain)) {
      // Use domain as company name (capitalize first letter of each part)
      const parts = domain.split('.')[0].split('-');
      return parts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    // Try to extract company name from email signature or content
    const companyPatterns = [
      /(?:from|representing|at|with)\s+([A-Z][a-zA-Z\s&]+(?:Church|Ministry|Organization|Inc|LLC|Corp))/,
      /([A-Z][a-zA-Z\s&]+(?:Church|Ministry|Counseling|Center))/,
    ];

    for (const pattern of companyPatterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Send sales inquiry confirmation email
   */
  private async sendSalesConfirmationEmail(
    toEmail: string,
    toName: string,
    opportunityId: string,
    subject: string
  ): Promise<void> {
    const webAppUrl = process.env.WEB_APP_URL || 'https://www.mychristiancounselor.online';

    await this.emailService.sendEmail({
      to: toEmail,
      subject: `Thank You for Your Interest - MyChristianCounselor`,
      text: `Hello ${toName},

Thank you for reaching out to MyChristianCounselor!

We received your inquiry about: ${subject}

Our sales team will review your request and reach out to you within 24 hours to discuss how we can help meet your needs.

In the meantime, you can learn more about our services at:
${webAppUrl}

If you have any immediate questions, feel free to reply to this email.

Best regards,
MyChristianCounselor Sales Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank You for Your Interest!</h2>

          <p>Hello ${toName},</p>

          <p>Thank you for reaching out to MyChristianCounselor!</p>

          <p>We received your inquiry about: <strong>${subject}</strong></p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;">
              Our sales team will review your request and reach out to you within <strong>24 hours</strong> to discuss how we can help meet your needs.
            </p>
          </div>

          <p>In the meantime, you can learn more about our services:</p>

          <p>
            <a href="${webAppUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
              Visit Our Website
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If you have any immediate questions, feel free to reply to this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 12px;">
            Best regards,<br>
            MyChristianCounselor Sales Team
          </p>
        </div>
      `,
    });

    this.logger.log(`Sent sales confirmation email to ${toEmail} for opportunity ${opportunityId}`);
  }

  /**
   * Send opt-out confirmation email
   */
  private async sendOptOutConfirmationEmail(
    toEmail: string,
    toName: string
  ): Promise<void> {
    const webAppUrl = process.env.WEB_APP_URL || 'https://www.mychristiancounselor.online';

    await this.emailService.sendEmail({
      to: toEmail,
      subject: 'Unsubscribe Confirmed - MyChristianCounselor',
      text: `Hello ${toName},

You have been successfully unsubscribed from our marketing communications.

You will no longer receive marketing emails from MyChristianCounselor.

If you believe this was done in error, or if you would like to resubscribe in the future, please contact our team at ${process.env.SUPPORT_EMAIL || 'support@mychristiancounselor.online'}.

Thank you,
MyChristianCounselor Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Unsubscribe Confirmed</h2>

          <p>Hello ${toName},</p>

          <p>You have been successfully unsubscribed from our marketing communications.</p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;">
              ✅ You will no longer receive marketing emails from MyChristianCounselor.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If you believe this was done in error, or if you would like to resubscribe in the future,
            please contact our team at
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@mychristiancounselor.online'}" style="color: #2563eb;">
              ${process.env.SUPPORT_EMAIL || 'support@mychristiancounselor.online'}
            </a>.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 12px;">
            Thank you,<br>
            MyChristianCounselor Team
          </p>
        </div>
      `,
    });

    this.logger.log(`Sent opt-out confirmation email to ${toEmail}`);
  }

  /**
   * Handle Postmark tracking events (delivery, bounce, open, click)
   */
  async handleTrackingEvent(trackingData: PostmarkTrackingWebhookDto): Promise<void> {
    const messageId = trackingData.MessageID;

    this.logger.log(`Processing ${trackingData.RecordType} event for message ${messageId}`);

    switch (trackingData.RecordType) {
      case 'Delivery':
        await this.emailTrackingService.markAsDelivered(messageId);
        break;

      case 'Bounce':
        const bounceData = trackingData as PostmarkBounceWebhookDto;
        const bounceReason = `${bounceData.Type}: ${bounceData.Description}`;
        await this.emailTrackingService.markAsBounced(messageId, bounceReason);
        break;

      case 'Open':
        await this.emailTrackingService.markAsOpened(messageId);
        break;

      case 'Click':
        await this.emailTrackingService.markAsClicked(messageId);
        break;

      default:
        this.logger.warn(`Unknown tracking event type: ${trackingData.RecordType}`);
    }

    this.logger.log(`Successfully processed ${trackingData.RecordType} event for message ${messageId}`);
  }
}
