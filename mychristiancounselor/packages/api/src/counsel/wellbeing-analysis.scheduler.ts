import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WellbeingAnalysisService } from './wellbeing-analysis.service';

@Injectable()
export class WellbeingAnalysisScheduler {
  private readonly logger = new Logger(WellbeingAnalysisScheduler.name);

  constructor(private wellbeingAnalysisService: WellbeingAnalysisService) {}

  /**
   * Run wellbeing analysis nightly at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'wellbeing-analysis',
    timeZone: 'America/New_York', // Adjust to your timezone
  })
  async handleNightlyAnalysis() {
    this.logger.log('Starting scheduled wellbeing analysis job');

    try {
      await this.wellbeingAnalysisService.analyzeAllMembers();
      this.logger.log('Scheduled wellbeing analysis completed successfully');
    } catch (error) {
      this.logger.error('Scheduled wellbeing analysis failed', error);
      // Don't throw - let scheduler continue
    }
  }
}
