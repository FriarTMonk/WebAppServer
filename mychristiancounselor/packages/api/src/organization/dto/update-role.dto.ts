import { IsString, MaxLength, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { Permission, UpdateRoleDto as IUpdateRoleDto } from '@mychristiancounselor/shared';

export class UpdateRoleDto implements IUpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Role name cannot be empty' })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Description must not exceed 200 characters' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Permissions must be an array' })
  @IsEnum(Permission, {
    each: true,
    message: 'Each permission must be a valid Permission value'
  })
  permissions?: Permission[];
}
