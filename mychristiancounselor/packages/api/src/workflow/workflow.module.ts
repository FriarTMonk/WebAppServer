import { Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowActionService } from './workflow-action.service';
import { WorkflowRuleService } from './workflow-rule.service';
import { WorkflowController } from './workflow.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, CounselModule, EmailModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowEngineService,
    WorkflowActionService,
    WorkflowRuleService,
  ],
  exports: [WorkflowEngineService, WorkflowRuleService],
})
export class WorkflowModule {}
