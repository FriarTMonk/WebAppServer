import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssessmentLibraryService } from './assessment-library.service';
import { CreateCustomAssessmentDto } from './dto/create-custom-assessment.dto';
import { UpdateCustomAssessmentDto } from './dto/update-custom-assessment.dto';
import { AssessmentLibraryFiltersDto } from './dto/assessment-library-filters.dto';

@Controller('counsel/assessments/library')
@UseGuards(JwtAuthGuard)
export class AssessmentLibraryController {
  constructor(private readonly assessmentLibraryService: AssessmentLibraryService) {}

  @Get()
  async list(@Request() req, @Query() filters: AssessmentLibraryFiltersDto) {
    return this.assessmentLibraryService.list(req.user.id, filters);
  }

  @Get(':id')
  async getById(@Request() req, @Param('id') id: string) {
    return this.assessmentLibraryService.getById(req.user.id, id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCustomAssessmentDto) {
    return this.assessmentLibraryService.create(req.user.id, dto);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCustomAssessmentDto) {
    return this.assessmentLibraryService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.assessmentLibraryService.delete(req.user.id, id);
  }
}
