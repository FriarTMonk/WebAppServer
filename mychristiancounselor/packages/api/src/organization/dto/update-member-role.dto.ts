import { IsUUID } from 'class-validator';
import { UpdateMemberRoleDto as IUpdateMemberRoleDto } from '@mychristiancounselor/shared';

export class UpdateMemberRoleDto implements IUpdateMemberRoleDto {
  @IsUUID('4', { message: 'Role ID must be a valid UUID' })
  roleId: string;
}
