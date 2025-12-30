import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ProspectsService } from './prospects.service';

interface ExecutionSummary {
  campaignId: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ prospectId: string; email: string; reason: string }>;
}

@Injectable()
export class CampaignExecutionService {
  private readonly logger = new Logger(CampaignExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private prospectsService: ProspectsService,
  ) {}

  /**
   * Execute a campaign - send emails to all pending recipients
   */
  async executeCampaign(campaignId: string): Promise<ExecutionSummary> {
    this.logger.log(`Starting execution of campaign: ${campaignId}`);

    // Update campaign status to 'sending'
    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'sending' },
    });

    const summary: ExecutionSummary = {
      campaignId,
      totalRecipients: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Get campaign with all pending recipients
      const campaign = await this.prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            where: { status: 'pending' },
            include: {
              prospect: true,
              prospectContact: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      summary.totalRecipients = campaign.recipients.length;
      this.logger.log(`Processing ${summary.totalRecipients} recipients`);

      // Process each recipient
      for (const recipient of campaign.recipients) {
        try {
          // Double-check 90-day cooldown at prospect level
          const canReceive = await this.prospectsService.canReceiveCampaign(recipient.prospectId);
          if (!canReceive) {
            summary.skipped++;
            summary.errors.push({
              prospectId: recipient.prospectId,
              email: recipient.prospectContact.email,
              reason: '90-day cooldown not elapsed',
            });
            await this.prisma.emailCampaignRecipient.update({
              where: { id: recipient.id },
              data: { status: 'skipped', bounceReason: '90-day cooldown not elapsed' },
            });
            continue;
          }

          // Send email to prospect contact
          const result = await this.emailService.sendMarketingCampaignEmail(
            recipient.prospectContact.email,
            {
              recipientName: recipient.prospectContact.name,
              subject: campaign.subject,
              htmlBody: campaign.htmlBody,
              textBody: campaign.textBody,
              campaignId: campaign.id,
              prospectId: recipient.prospectId,
            },
          );

          if (result.success) {
            // Update recipient status
            await this.prisma.emailCampaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'sent',
                sentAt: new Date(),
                emailLogId: result.emailLogId,
              },
            });

            // Update prospect's lastCampaignSentAt
            await this.prospectsService.updateLastCampaignSent(recipient.prospectId);

            summary.sent++;
            this.logger.log(`Sent to ${recipient.prospectContact.email} (${recipient.prospectContact.name})`);
          } else {
            // Mark as failed
            await this.prisma.emailCampaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: 'failed',
                bounceReason: result.error || 'Unknown error',
              },
            });

            summary.failed++;
            summary.errors.push({
              prospectId: recipient.prospectId,
              email: recipient.prospectContact.email,
              reason: result.error || 'Unknown error',
            });
          }
        } catch (error) {
          // Per-recipient error handling - continue to next recipient
          this.logger.error(`Failed to send to ${recipient.prospectContact.email}:`, error);

          await this.prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'failed',
              bounceReason: error.message || 'Unknown error',
            },
          });

          summary.failed++;
          summary.errors.push({
            prospectId: recipient.prospectId,
            email: recipient.prospectContact.email,
            reason: error.message || 'Unknown error',
          });
        }
      }

      // Update campaign status to 'sent'
      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Campaign execution complete: ${campaignId}. Sent: ${summary.sent}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`);
      return summary;
    } catch (error) {
      // Campaign-level error - mark as failed
      this.logger.error(`Campaign execution failed: ${campaignId}`, error);

      await this.prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }
}
