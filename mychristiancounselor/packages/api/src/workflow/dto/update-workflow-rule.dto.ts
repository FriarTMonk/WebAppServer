import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowRuleDto } from './create-workflow-rule.dto';

export class UpdateWorkflowRuleDto extends PartialType(CreateWorkflowRuleDto) {}
