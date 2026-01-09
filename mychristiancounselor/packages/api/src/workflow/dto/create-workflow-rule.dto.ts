import { IsString, IsEnum, IsObject, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { WorkflowRuleLevel } from '@prisma/client';

export class CreateWorkflowRuleDto {
  @IsString()
  name: string;

  @IsEnum(WorkflowRuleLevel)
  level: WorkflowRuleLevel;

  @IsObject()
  trigger: any;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsObject()
  actions: any;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  ownerId?: string; // Will be set by controller from req.user.id
}
