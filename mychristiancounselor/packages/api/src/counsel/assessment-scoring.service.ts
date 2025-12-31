import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentService } from './assessment.service';
import { getAssessmentById } from './assessments';
import { ScoredAssessment } from './assessments/assessment.types';

@Injectable()
export class AssessmentScoringService {
  private readonly logger = new Logger(AssessmentScoringService.name);

  constructor(
    private prisma: PrismaService,
    private assessmentService: AssessmentService,
  ) {}

  /**
   * Calculate score for a completed assessment
   */
  async scoreAssessment(assignedAssessmentId: string): Promise<ScoredAssessment> {
    // Get assignment
    const assignment = await this.prisma.assignedAssessment.findUnique({
      where: { id: assignedAssessmentId },
      include: { assessment: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assessment not found');
    }

    // Get assessment definition
    const assessmentDef = getAssessmentById(assignment.assessment.type);
    if (!assessmentDef) {
      throw new Error(`Unknown assessment type: ${assignment.assessment.type}`);
    }

    // Get responses
    const responseRecord = await this.assessmentService.getResponses(assignedAssessmentId);

    if (!responseRecord) {
      throw new NotFoundException('Assessment responses not found');
    }

    // Calculate score based on scoring method
    let totalScore = 0;

    if (assessmentDef.scoringRules.method === 'sum') {
      totalScore = responseRecord.answers.reduce((sum, answer) => {
        const value = typeof answer.value === 'number' ? answer.value : parseFloat(String(answer.value));
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    } else if (assessmentDef.scoringRules.method === 'average') {
      const sum = responseRecord.answers.reduce((s, answer) => {
        const value = typeof answer.value === 'number' ? answer.value : parseFloat(String(answer.value));
        return s + (isNaN(value) ? 0 : value);
      }, 0);
      totalScore = sum / responseRecord.answers.length;
    }

    // Determine severity level
    const severity = this.getSeverityLevel(assignment.assessment.type, totalScore);

    // Update assessment response with score and interpretation
    await this.prisma.assessmentResponse.update({
      where: { assignedAssessmentId },
      data: {
        score: totalScore,
        interpretation: severity.description,
      },
    });

    this.logger.log(
      `Scored ${assignment.assessment.type} for assignment ${assignedAssessmentId}: ` +
      `${totalScore} (${severity.level})`
    );

    return {
      totalScore,
      severityLevel: severity.level,
      interpretation: severity.description,
    };
  }

  /**
   * Get severity level based on score
   */
  getSeverityLevel(assessmentType: string, score: number) {
    const assessment = getAssessmentById(assessmentType);
    if (!assessment?.scoringRules.severityLevels) {
      return { level: 'unknown', description: 'No severity levels defined' };
    }

    for (const level of assessment.scoringRules.severityLevels) {
      if (score >= level.minScore && score <= level.maxScore) {
        return { level: level.level, description: level.description };
      }
    }

    return { level: 'out-of-range', description: 'Score outside expected range' };
  }
}
