import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssessmentService } from './assessment.service';
import { AssessmentScoringService } from './assessment-scoring.service';
import { CLINICAL_ASSESSMENTS } from './assessments';

@Controller('counsel/assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentController {
  constructor(
    private assessmentService: AssessmentService,
    private scoringService: AssessmentScoringService,
  ) {}

  /**
   * Get available assessment types
   */
  @Get('available')
  getAvailableAssessments() {
    return Object.keys(CLINICAL_ASSESSMENTS).map(key => {
      const assessment = CLINICAL_ASSESSMENTS[key];
      return {
        id: assessment.id,
        name: assessment.name,
        description: assessment.description,
        type: assessment.type,
        questionCount: assessment.questions.length,
      };
    });
  }

  /**
   * Get assessment definition (questions)
   */
  @Get('definitions/:assessmentId')
  getAssessmentDefinition(@Param('assessmentId') assessmentId: string) {
    return CLINICAL_ASSESSMENTS[assessmentId];
  }

  /**
   * Get assigned assessments for current user
   */
  @Get('assigned')
  async getAssignedAssessments(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.assessmentService.getAssignedAssessments(
      req.user.id,
      status as any,
    );
  }

  /**
   * Submit assessment responses
   */
  @Post('assigned/:assignedId/submit')
  async submitAssessment(
    @Param('assignedId') assignedId: string,
    @Request() req: any,
    @Body() body: { responses: any[] },
  ) {
    // Submit responses
    await this.assessmentService.submitResponse(
      assignedId,
      req.user.id,
      body.responses,
    );

    // Calculate score
    const scored = await this.scoringService.scoreAssessment(assignedId);

    return {
      message: 'Assessment submitted successfully',
      score: scored,
    };
  }

  /**
   * Get assessment results
   */
  @Get('assigned/:assignedId/results')
  async getResults(@Param('assignedId') assignedId: string) {
    const responses = await this.assessmentService.getResponses(assignedId);
    return { responses };
  }
}
