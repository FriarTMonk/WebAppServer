import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowRuleLevel, Prisma } from '@prisma/client';

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

  async updateRule(
    ruleId: string,
    updates: Partial<CreateRuleDto> & { isActive?: boolean },
    userId: string,
  ) {
    this.logger.log(`Updating workflow rule: ${ruleId}`);

    // Get user to check if platform admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPlatformAdmin = user.isPlatformAdmin;

    // Filter out dangerous fields that shouldn't be modifiable
    const { ownerId, level, ...safeUpdates } = updates as any;

    try {
      if (isPlatformAdmin) {
        // Platform admins can update any rule
        return await this.prisma.workflowRule.update({
          where: { id: ruleId },
          data: safeUpdates,
        });
      } else {
        // Non-admins can only update rules they own (atomic check)
        return await this.prisma.workflowRule.update({
          where: {
            id: ruleId,
            ownerId: userId, // Atomic ownership check in WHERE clause
          },
          data: safeUpdates,
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Workflow rule not found or access denied');
      }
      throw error;
    }
  }

  async deleteRule(ruleId: string, userId: string) {
    this.logger.log(`Deleting workflow rule: ${ruleId}`);

    // Get user to check if platform admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPlatformAdmin = user.isPlatformAdmin;

    try {
      if (isPlatformAdmin) {
        // Platform admins can delete any rule
        return await this.prisma.workflowRule.delete({
          where: { id: ruleId },
        });
      } else {
        // Non-admins can only delete rules they own (atomic check)
        return await this.prisma.workflowRule.delete({
          where: {
            id: ruleId,
            ownerId: userId, // Atomic ownership check in WHERE clause
          },
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Workflow rule not found or access denied');
      }
      throw error;
    }
  }

  async getMemberRules(memberId: string, counselorId: string) {
    this.logger.log(`Getting workflow rules for member: ${memberId}`);

    // Get member's organization to find organization-level rules
    const assignments = await this.prisma.counselorAssignment.findMany({
      where: {
        counselorId,
        memberId: memberId,
      },
      select: { organizationId: true },
    });

    const organizationIds = assignments.map(a => a.organizationId);

    // Get all applicable rules:
    // 1. Platform-level rules (apply to everyone)
    // 2. Organization-level rules for member's organizations
    // 3. Counselor-level rules owned by this counselor
    return this.prisma.workflowRule.findMany({
      where: {
        isActive: true,
        OR: [
          { level: 'platform' },
          { level: 'organization', ownerId: { in: organizationIds } },
          { level: 'counselor', ownerId: counselorId },
        ],
      },
      orderBy: { priority: 'desc' },
    });
  }

  async getMemberActivity(memberId: string, counselorId: string) {
    this.logger.log(`Getting workflow activity for member: ${memberId}`);

    // Get workflow executions triggered by this member
    const executions = await this.prisma.workflowExecution.findMany({
      where: { triggeredBy: memberId },
      include: {
        rule: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 50, // Limit to last 50 executions
    });

    // Format for frontend
    return executions.map(exec => ({
      id: exec.id,
      ruleId: exec.ruleId,
      ruleName: exec.rule.name,
      memberId: exec.triggeredBy,
      triggeredAt: exec.executedAt.toISOString(),
      triggerReason: (exec.context as any)?.reason || 'Rule conditions met',
      actionsTaken: Array.isArray((exec.actions as any))
        ? (exec.actions as any).map((a: any) => a.type || a.action).join(', ')
        : 'Actions executed',
    }));
  }
}
