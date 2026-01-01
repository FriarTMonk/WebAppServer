import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomAssessmentDto } from './dto/create-custom-assessment.dto';
import { UpdateCustomAssessmentDto } from './dto/update-custom-assessment.dto';
import { AssessmentLibraryFiltersDto } from './dto/assessment-library-filters.dto';
import { AssessmentType } from '@prisma/client';

@Injectable()
export class AssessmentLibraryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all custom assessments for user's organization
   */
  async list(userId: string, filters: AssessmentLibraryFiltersDto) {
    // Get user's organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, isCounselor: true },
    });

    if (!user || !user.isCounselor) {
      throw new ForbiddenException('Only counselors can access assessment library');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    const where: any = {
      organizationId: user.organizationId,
      type: { in: [AssessmentType.custom_assessment, AssessmentType.custom_questionnaire] },
    };

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.assessment.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single assessment with full details
   */
  async getById(userId: string, assessmentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, isCounselor: true },
    });

    if (!user || !user.isCounselor) {
      throw new ForbiddenException('Only counselors can access assessment library');
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Cannot access assessments from other organizations');
    }

    return assessment;
  }

  /**
   * Create new custom assessment with validation
   */
  async create(userId: string, dto: CreateCustomAssessmentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, isCounselor: true },
    });

    if (!user || !user.isCounselor) {
      throw new ForbiddenException('Only counselors can create assessments');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    // Validate questions
    if (dto.questions.length === 0) {
      throw new BadRequestException('Assessment must have at least one question');
    }

    // Validate multiple choice questions have at least 2 options
    for (const question of dto.questions) {
      if (
        (question.type === 'multiple_choice_single' || question.type === 'multiple_choice_multi') &&
        (!question.options || question.options.length < 2)
      ) {
        throw new BadRequestException(`Question "${question.text}" must have at least 2 options`);
      }

      // Validate rating scales
      if (question.type === 'rating_scale') {
        if (!question.scale || question.scale.min >= question.scale.max) {
          throw new BadRequestException(`Question "${question.text}" has invalid rating scale`);
        }
      }
    }

    // Validate scoring rules for custom_assessment
    if (dto.type === AssessmentType.custom_assessment) {
      if (!dto.scoringRules || dto.scoringRules.categories.length === 0) {
        throw new BadRequestException('Custom assessments must have scoring rules with at least one category');
      }

      // Extract categories from questions
      const questionCategories = new Set(dto.questions.map((q) => q.category));

      // Validate all question categories have scoring rules
      for (const category of questionCategories) {
        const hasScoring = dto.scoringRules.categories.some((c) => c.name === category);
        if (!hasScoring) {
          throw new BadRequestException(`Category "${category}" is missing scoring interpretations`);
        }
      }

      // Validate interpretation ranges cover 0-100%
      this.validateInterpretationRanges(dto.scoringRules.categories);
      this.validateInterpretationRanges([{ name: 'overall', interpretations: dto.scoringRules.overallInterpretations }]);
    }

    return this.prisma.assessment.create({
      data: {
        name: dto.name,
        type: dto.type,
        category: dto.category,
        questions: dto.questions as any,
        scoringRules: dto.scoringRules as any,
        organizationId: user.organizationId,
        createdBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Update existing assessment (creator only)
   */
  async update(userId: string, assessmentId: string, dto: UpdateCustomAssessmentDto) {
    const assessment = await this.getById(userId, assessmentId);

    // Only creator can update
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can update this assessment');
    }

    // Validate questions if provided
    if (dto.questions) {
      if (dto.questions.length === 0) {
        throw new BadRequestException('Assessment must have at least one question');
      }

      // Same validation as create
      for (const question of dto.questions) {
        if (
          (question.type === 'multiple_choice_single' || question.type === 'multiple_choice_multi') &&
          (!question.options || question.options.length < 2)
        ) {
          throw new BadRequestException(`Question "${question.text}" must have at least 2 options`);
        }

        if (question.type === 'rating_scale') {
          if (!question.scale || question.scale.min >= question.scale.max) {
            throw new BadRequestException(`Question "${question.text}" has invalid rating scale`);
          }
        }
      }
    }

    // Validate scoring rules if provided
    if (dto.scoringRules) {
      const questionCategories = dto.questions
        ? new Set(dto.questions.map((q) => q.category))
        : new Set((assessment.questions as any[]).map((q: any) => q.category));

      for (const category of questionCategories) {
        const hasScoring = dto.scoringRules.categories.some((c) => c.name === category);
        if (!hasScoring) {
          throw new BadRequestException(`Category "${category}" is missing scoring interpretations`);
        }
      }

      this.validateInterpretationRanges(dto.scoringRules.categories);
      this.validateInterpretationRanges([{ name: 'overall', interpretations: dto.scoringRules.overallInterpretations }]);
    }

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        name: dto.name,
        questions: dto.questions as any,
        scoringRules: dto.scoringRules as any,
        isActive: dto.isActive,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Delete assessment (creator only, no assignments)
   */
  async delete(userId: string, assessmentId: string) {
    const assessment = await this.getById(userId, assessmentId);

    // Only creator can delete
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can delete this assessment');
    }

    // Check for existing assignments
    const assignmentCount = await this.prisma.assignedAssessment.count({
      where: { assessmentId },
    });

    if (assignmentCount > 0) {
      throw new BadRequestException('Cannot delete assessment with existing assignments');
    }

    await this.prisma.assessment.delete({
      where: { id: assessmentId },
    });

    return { success: true };
  }

  /**
   * Validate that interpretation ranges cover 0-100% without gaps
   */
  private validateInterpretationRanges(categories: Array<{ name: string; interpretations: any[] }>) {
    for (const category of categories) {
      const sorted = [...category.interpretations].sort((a, b) => a.maxPercent - b.maxPercent);

      // Check ranges cover 0-100
      if (sorted[0].maxPercent <= 0) {
        throw new BadRequestException(`Category "${category.name}": First range must have maxPercent > 0`);
      }

      if (sorted[sorted.length - 1].maxPercent !== 100) {
        throw new BadRequestException(`Category "${category.name}": Last range must have maxPercent = 100`);
      }

      // Check no gaps
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].maxPercent <= sorted[i - 1].maxPercent) {
          throw new BadRequestException(`Category "${category.name}": Ranges must be in ascending order without overlaps`);
        }
      }
    }
  }
}
