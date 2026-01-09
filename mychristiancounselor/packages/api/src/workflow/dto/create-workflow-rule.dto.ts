import { IsString, IsEnum, IsObject, IsOptional, IsInt, IsBoolean, IsArray, MinLength, MaxLength, Min } from 'class-validator';
import { WorkflowRuleLevel } from '@prisma/client';

export class CreateWorkflowRuleDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @IsEnum(WorkflowRuleLevel, { message: 'Invalid workflow rule level' })
  level: WorkflowRuleLevel;

  @IsObject({ message: 'Trigger must be an object' })
  trigger: any;

  @IsOptional()
  @IsObject({ message: 'Conditions must be an object' })
  conditions?: any;

  @IsArray({ message: 'Actions must be an array' })
  actions: any[];

  @IsOptional()
  @IsInt({ message: 'Priority must be an integer' })
  @Min(0, { message: 'Priority must be non-negative' })
  priority?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  ownerId?: string; // Will be set by controller from req.user.id
}
