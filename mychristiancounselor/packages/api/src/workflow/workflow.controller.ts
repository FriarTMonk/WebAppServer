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
import { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { UpdateWorkflowRuleDto } from './dto/update-workflow-rule.dto';

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

  @Get('member/:memberId')
  async getMemberRules(@Param('memberId') memberId: string, @Request() req) {
    // Get all rules applicable to this member
    return this.ruleService.getMemberRules(memberId, req.user.id);
  }

  @Get('member/:memberId/activity')
  async getMemberActivity(@Param('memberId') memberId: string, @Request() req) {
    // Get workflow activity for this member
    return this.ruleService.getMemberActivity(memberId, req.user.id);
  }

  @Get(':id')
  async getRule(@Param('id') id: string) {
    return this.ruleService.getRule(id);
  }

  @Post()
  async createRule(@Body() dto: CreateWorkflowRuleDto, @Request() req) {
    // Set ownerId from authenticated user
    dto.ownerId = req.user.id;
    return this.ruleService.createRule(dto);
  }

  @Patch(':id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateWorkflowRuleDto, @Request() req) {
    return this.ruleService.updateRule(id, dto);
  }

  @Delete(':id')
  async deleteRule(@Param('id') id: string) {
    return this.ruleService.deleteRule(id);
  }
}
