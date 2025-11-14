import { IsString, MaxLength, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { Permission, CreateRoleDto as ICreateRoleDto } from '@mychristiancounselor/shared';

export class CreateRoleDto implements ICreateRoleDto {
  @IsString()
  @MinLength(1, { message: 'Role name is required' })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Description must not exceed 200 characters' })
  description?: string;

  @IsArray({ message: 'Permissions must be an array' })
  @IsEnum(Permission, {
    each: true,
    message: 'Each permission must be a valid Permission value'
  })
  permissions: Permission[];
}
