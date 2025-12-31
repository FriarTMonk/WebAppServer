import { Injectable, Logger } from '@nestjs/common';
import { WellbeingHistoryService } from './wellbeing-history.service';
import { WellbeingStatus, WellbeingTrajectory } from '@prisma/client';

@Injectable()
export class TrajectoryCalculationService {
  private readonly logger = new Logger(TrajectoryCalculationService.name);

  // Map status to numeric score for comparison
  private readonly STATUS_SCORES = {
    red: 1,
    yellow: 2,
    green: 3,
  };

  constructor(private historyService: WellbeingHistoryService) {}

  /**
   * Calculate wellbeing trajectory based on recent history
   */
  async calculateTrajectory(memberId: string): Promise<WellbeingTrajectory> {
    const recentHistory = await this.historyService.getRecentHistory(memberId, 3);

    if (recentHistory.length < 2) {
      return 'insufficient_data';
    }

    // Get status scores (most recent first)
    const scores = recentHistory.map(h => this.STATUS_SCORES[h.status as WellbeingStatus]);

    // Calculate trend
    const latestScore = scores[0];
    const previousScore = scores[1];
    const olderScore = scores[2];

    // Improving: latest > previous, or latest > older
    if (latestScore > previousScore) {
      return 'improving';
    }

    // Declining: latest < previous, or latest < older
    if (latestScore < previousScore) {
      return 'declining';
    }

    // If latest === previous, check longer trend
    if (scores.length >= 3 && olderScore) {
      if (latestScore > olderScore) {
        return 'improving';
      }
      if (latestScore < olderScore) {
        return 'declining';
      }
    }

    // No clear trend
    return 'stable';
  }

  /**
   * Get trajectory explanation for display
   */
  getTrajectoryExplanation(trajectory: WellbeingTrajectory): string {
    const explanations: Record<string, string> = {
      improving: 'Member wellbeing shows positive progression over recent assessments',
      declining: 'Member wellbeing shows concerning decline - consider check-in',
      stable: 'Member wellbeing remains consistent',
      insufficient_data: 'Not enough historical data to determine trajectory',
    };

    return explanations[trajectory] || 'Unknown trajectory status';
  }
}
