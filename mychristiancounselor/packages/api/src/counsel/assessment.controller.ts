import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssessmentService } from './assessment.service';
import { AssessmentScoringService } from './assessment-scoring.service';
import { CLINICAL_ASSESSMENTS } from './assessments';
import { AssignCustomAssessmentDto } from './dto/assign-custom-assessment.dto';

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

  /**
   * Get all assessments for a member (counselor endpoint)
   */
  @Get('member/:memberId')
  async getMemberAssessments(
    @Param('memberId') memberId: string,
    @Query('status') status?: string,
  ) {
    return this.assessmentService.getAssignedAssessments(
      memberId,
      status as any,
    );
  }

  /**
   * Get assessment history for a member by type (counselor endpoint)
   */
  @Get('member/:memberId/history')
  async getAssessmentHistory(
    @Param('memberId') memberId: string,
    @Query('type') type: string,
  ) {
    return this.assessmentService.getAssessmentHistory(memberId, type);
  }

  /**
   * Assign a custom assessment to a member
   */
  @Post('custom/:assessmentId/assign')
  async assignCustomAssessment(
    @Param('assessmentId') assessmentId: string,
    @Request() req: any,
    @Body() dto: AssignCustomAssessmentDto,
  ) {
    return this.assessmentService.assignCustomAssessment({
      assessmentId,
      memberId: dto.memberId,
      assignedBy: req.user.id,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  /**
   * Get assessment form with questions for a member to complete
   */
  @Get('assigned/:assignedId/form')
  async getAssessmentForm(
    @Param('assignedId') assignedId: string,
    @Request() req: any,
  ) {
    // 1. Fetch assignment with assessment and responses
    const assignment = await this.assessmentService.getAssignmentWithForm(
      assignedId,
    );

    // 2. Verify ownership
    if (assignment.memberId !== req.user.id) {
      throw new ForbiddenException('Not your assessment');
    }

    // 3. Get assessment definition from CLINICAL_ASSESSMENTS
    const assessmentDefinition = CLINICAL_ASSESSMENTS[assignment.assessmentId];

    if (!assessmentDefinition) {
      throw new NotFoundException('Assessment definition not found');
    }

    return {
      assignment: {
        id: assignment.id,
        dueDate: assignment.dueDate,
        status: assignment.status,
      },
      assessment: {
        id: assessmentDefinition.id,
        name: assessmentDefinition.name,
        type: assessmentDefinition.type,
        questions: assessmentDefinition.questions,
      },
      responses: assignment.responses?.answers || [],
    };
  }
}
