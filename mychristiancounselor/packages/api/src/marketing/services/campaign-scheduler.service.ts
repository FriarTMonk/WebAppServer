import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignExecutionService } from '../campaign-execution.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private campaignExecutionService: CampaignExecutionService,
    private lockService: DistributedLockService,
  ) {}

  @Cron('*/5 * * * *', {
    name: 'scheduled-campaigns',
    timeZone: 'America/New_York',
  })
  async executeScheduledCampaigns() {
    const lockKey = 'campaign-scheduler-lock';
    const lockTTL = 300; // 5 minutes

    const result = await this.lockService.withLock(
      lockKey,
      lockTTL,
      async () => {
        return await this.executeScheduledCampaignsInternal();
      },
    );

    if (result === null) {
      this.logger.log('Another instance is executing campaigns, skipping');
    }
  }

  private async executeScheduledCampaignsInternal() {
    this.logger.log('Checking for scheduled campaigns...');

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    try {
      // Find campaigns due for execution
      const campaigns = await this.prisma.emailCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: {
            lte: now, // Due now or in the past
            gte: tenMinutesAgo, // Safety: not older than 10 minutes
          },
        },
      });

      if (campaigns.length === 0) {
        this.logger.log('No campaigns due for execution');
        return;
      }

      this.logger.log(`Found ${campaigns.length} campaigns to execute`);

      // Execute each campaign
      for (const campaign of campaigns) {
        try {
          await this.executeCampaign(campaign.id, campaign.name);
        } catch (error) {
          this.logger.error(
            `Failed to execute campaign ${campaign.id} (${campaign.name}): ${error.message}`,
            error.stack,
          );
          // Continue with next campaign even if this one fails
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check for scheduled campaigns: ${error.message}`,
        error.stack,
      );
    }
  }

  private async executeCampaign(campaignId: string, campaignName: string): Promise<void> {
    this.logger.log(`Executing campaign: ${campaignId} (${campaignName})`);

    // Update status to 'sending' to prevent duplicate execution
    try {
      const updated = await this.prisma.emailCampaign.updateMany({
        where: {
          id: campaignId,
          status: 'scheduled', // Only update if still scheduled (atomic)
        },
        data: { status: 'sending' },
      });

      if (updated.count === 0) {
        this.logger.warn(
          `Campaign ${campaignId} already being processed, skipping`,
        );
        return;
      }
    } catch (error) {
      this.logger.error(
        `Failed to update campaign ${campaignId} status: ${error.message}`,
      );
      throw error;
    }

    // Execute via existing service
    try {
      const result = await this.campaignExecutionService.executeCampaign(campaignId);

      // Result is ExecutionSummary: { campaignId, totalRecipients, sent, failed, skipped, errors }
      // CampaignExecutionService already updates status to 'sent'
      // Just log the summary
      this.logger.log(
        `Campaign ${campaignId} (${campaignName}) executed successfully: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`,
      );
    } catch (error) {
      // CampaignExecutionService marks as 'failed' on error
      this.logger.error(
        `Campaign ${campaignId} (${campaignName}) execution failed: ${error.message}`,
      );

      throw error;
    }
  }
}
