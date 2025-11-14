import { IsEmail, IsUUID } from 'class-validator';
import { InviteMemberDto as IInviteMemberDto } from '@mychristiancounselor/shared';

export class InviteMemberDto implements IInviteMemberDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsUUID('4', { message: 'Role ID must be a valid UUID' })
  roleId: string;
}
