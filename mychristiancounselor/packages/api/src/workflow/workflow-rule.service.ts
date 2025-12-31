import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRuleLevel } from '@prisma/client';

export interface CreateRuleDto {
  name: string;
  level: WorkflowRuleLevel;
  ownerId?: string;
  trigger: any;
  conditions?: any;
  actions: any[];
  priority: number;
}

export interface GetRulesOptions {
  level?: WorkflowRuleLevel;
  ownerId?: string;
  isActive?: boolean;
}

@Injectable()
export class WorkflowRuleService {
  private readonly logger = new Logger(WorkflowRuleService.name);

  constructor(private prisma: PrismaService) {}

  async createRule(dto: CreateRuleDto) {
    this.logger.log(`Creating workflow rule: ${dto.name} (level: ${dto.level})`);

    return this.prisma.workflowRule.create({
      data: {
        name: dto.name,
        level: dto.level,
        ownerId: dto.ownerId,
        trigger: dto.trigger,
        conditions: dto.conditions,
        actions: dto.actions,
        priority: dto.priority,
        isActive: true,
      },
    });
  }

  async getRules(options?: GetRulesOptions) {
    const where: any = {};

    if (options?.level !== undefined) {
      where.level = options.level;
    }

    if (options?.ownerId !== undefined) {
      where.ownerId = options.ownerId;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    this.logger.log(`Getting workflow rules with filters: ${JSON.stringify(where)}`);

    return this.prisma.workflowRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });
  }

  async getRule(ruleId: string) {
    this.logger.log(`Getting workflow rule: ${ruleId}`);

    return this.prisma.workflowRule.findUnique({
      where: { id: ruleId },
    });
  }

  async updateRule(ruleId: string, updates: Partial<CreateRuleDto> & { isActive?: boolean }) {
    this.logger.log(`Updating workflow rule: ${ruleId}`);

    return this.prisma.workflowRule.update({
      where: { id: ruleId },
      data: updates,
    });
  }

  async deleteRule(ruleId: string) {
    this.logger.log(`Deleting workflow rule: ${ruleId}`);

    return this.prisma.workflowRule.delete({
      where: { id: ruleId },
    });
  }
}
