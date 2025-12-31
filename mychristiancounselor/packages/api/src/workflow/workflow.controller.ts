import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowRuleService } from './workflow-rule.service';
import { WorkflowRuleLevel } from '@prisma/client';

@Controller('workflow/rules')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private ruleService: WorkflowRuleService) {}

  @Get('executions')
  async getExecutions(@Query('ruleId') ruleId?: string) {
    // Implementation would query WorkflowExecution table
    return { message: 'Execution history endpoint' };
  }

  @Get()
  async getRules(
    @Request() req,
    @Query('level') level?: WorkflowRuleLevel,
    @Query('isActive') isActive?: string,
  ) {
    const options: any = {};

    if (level) {
      options.level = level;
    }

    if (isActive !== undefined) {
      options.isActive = isActive === 'true';
    }

    // If counselor-level, filter by ownerId
    if (level === 'counselor') {
      options.ownerId = req.user.id;
    }

    return this.ruleService.getRules(options);
  }

  @Get(':id')
  async getRule(@Param('id') id: string) {
    return this.ruleService.getRule(id);
  }

  @Post()
  async createRule(@Body() dto: any, @Request() req) {
    // If counselor-level rule, set ownerId to current user
    if (dto.level === 'counselor') {
      dto.ownerId = req.user.id;
    }

    return this.ruleService.createRule(dto);
  }

  @Patch(':id')
  async updateRule(@Param('id') id: string, @Body() updates: any) {
    return this.ruleService.updateRule(id, updates);
  }

  @Delete(':id')
  async deleteRule(@Param('id') id: string) {
    return this.ruleService.deleteRule(id);
  }
}
