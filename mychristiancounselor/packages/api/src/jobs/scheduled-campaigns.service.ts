import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignExecutionService } from '../marketing/campaign-execution.service';

/**
 * Service that processes scheduled email campaigns
 * Runs every 5 minutes to check for campaigns ready to be sent
 */
@Injectable()
export class ScheduledCampaignsService {
  private readonly logger = new Logger(ScheduledCampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private campaignExecution: CampaignExecutionService,
  ) {}

  /**
   * Process scheduled campaigns that are ready to be sent
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledCampaigns() {
    this.logger.log('Running scheduled campaigns job...');

    try {
      const now = new Date();

      // Find campaigns scheduled for execution
      const campaigns = await this.prisma.emailCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: {
            lte: now,
          },
        },
        select: {
          id: true,
          name: true,
          scheduledFor: true,
        },
      });

      if (campaigns.length === 0) {
        this.logger.log('No scheduled campaigns ready for execution');
        return;
      }

      this.logger.log(`Found ${campaigns.length} campaigns ready to execute`);

      let successCount = 0;
      let errorCount = 0;

      // Process each campaign
      for (const campaign of campaigns) {
        try {
          this.logger.log(
            `Executing campaign: ${campaign.name} (ID: ${campaign.id}, scheduled: ${campaign.scheduledFor?.toISOString()})`
          );

          const result = await this.campaignExecution.executeCampaign(campaign.id);

          this.logger.log(
            `Campaign ${campaign.id} executed successfully: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
          );

          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to execute campaign ${campaign.id} (${campaign.name}):`,
            error
          );

          // Mark campaign as failed
          try {
            await this.prisma.emailCampaign.update({
              where: { id: campaign.id },
              data: { status: 'failed' },
            });
            this.logger.log(`Marked campaign ${campaign.id} as failed`);
          } catch (updateError) {
            this.logger.error(
              `Failed to update campaign ${campaign.id} status to failed:`,
              updateError
            );
          }

          errorCount++;
        }
      }

      this.logger.log(
        `Scheduled campaigns job complete: ${successCount} executed successfully, ${errorCount} failed`
      );
    } catch (error) {
      this.logger.error('Error during scheduled campaigns job:', error);
    }
  }
}
