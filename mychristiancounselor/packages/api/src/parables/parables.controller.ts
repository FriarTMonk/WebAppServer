import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ParablesService } from './parables.service';
import { SaveParableDto, UpdateReflectionDto } from './dto/parable-metadata.dto';
import { AssignParableDto, SubmitReflectionDto } from './dto/assign-parable.dto';

/**
 * Parables Controller
 *
 * Handles parable metadata, user reading lists, and organization assignments.
 * MDX content is served from Next.js frontend.
 */
@Controller('parables')
export class ParablesController {
  constructor(private readonly parablesService: ParablesService) {}

  /**
   * GET /parables/featured/today
   * Get today's featured parable (public endpoint)
   */
  @Public()
  @Get('featured/today')
  async getFeaturedParable() {
    return this.parablesService.getFeaturedParable();
  }

  /**
   * GET /parables
   * List all parables (authenticated users only)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllParables() {
    return this.parablesService.getAllParables();
  }

  /**
   * GET /parables/category/:category
   * Get parables by category
   */
  @UseGuards(JwtAuthGuard)
  @Get('category/:category')
  async getParablesByCategory(@Param('category') category: string) {
    return this.parablesService.getParablesByCategory(category);
  }

  /**
   * GET /parables/:slug
   * Get parable metadata by slug
   */
  @UseGuards(JwtAuthGuard)
  @Get(':slug')
  async getParableBySlug(@Param('slug') slug: string) {
    return this.parablesService.getParableBySlug(slug);
  }

  /**
   * POST /parables/:id/save
   * Save parable to user's reading list
   * Requires: Premium subscription OR organization membership
   * TODO: Add PremiumOrOrgGuard to enforce this restriction
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  async saveParable(
    @Param('id') parableId: string,
    @Body() dto: SaveParableDto,
    @Req() req: any,
  ) {
    return this.parablesService.saveParable(req.user.userId, parableId, dto);
  }

  /**
   * DELETE /parables/:id/unsave
   * Remove parable from user's reading list
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/unsave')
  async unsaveParable(@Param('id') parableId: string, @Req() req: any) {
    return this.parablesService.unsaveParable(req.user.userId, parableId);
  }

  /**
   * GET /parables/my-list
   * Get user's saved parables
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-list')
  async getUserParables(@Req() req: any) {
    return this.parablesService.getUserParables(req.user.userId);
  }

  /**
   * PUT /parables/:id/reflection
   * Update reflection notes for a saved parable
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id/reflection')
  async updateReflection(
    @Param('id') parableId: string,
    @Body() dto: UpdateReflectionDto,
    @Req() req: any,
  ) {
    return this.parablesService.updateReflection(req.user.userId, parableId, dto);
  }

  /**
   * POST /parables/:id/assign
   * Assign parable to organization member
   * TODO: Add CounselorGuard when implemented
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/assign')
  async assignParable(
    @Param('id') parableId: string,
    @Body() dto: AssignParableDto,
    @Req() req: any,
  ) {
    // TODO: Get organizationId from request context
    const organizationId = req.user.organizationId || '';

    return this.parablesService.assignParable(
      req.user.userId,
      parableId,
      organizationId,
      dto,
    );
  }

  /**
   * GET /parables/assignments/:memberId
   * Get parable assignments for a member
   * TODO: Add authorization check (counselor or member themselves)
   */
  @UseGuards(JwtAuthGuard)
  @Get('assignments/:memberId')
  async getMemberAssignments(@Param('memberId') memberId: string) {
    return this.parablesService.getMemberAssignments(memberId);
  }

  /**
   * PUT /parables/assignments/:id/reflection
   * Submit reflection for an assignment
   */
  @UseGuards(JwtAuthGuard)
  @Put('assignments/:id/reflection')
  async submitReflection(
    @Param('id') assignmentId: string,
    @Body() dto: SubmitReflectionDto,
    @Req() req: any,
  ) {
    return this.parablesService.submitReflection(
      req.user.userId,
      assignmentId,
      dto,
    );
  }
}
