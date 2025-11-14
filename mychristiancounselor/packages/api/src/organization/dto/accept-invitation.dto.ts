import { IsString, IsNotEmpty } from 'class-validator';
import { AcceptInvitationDto as IAcceptInvitationDto } from '@mychristiancounselor/shared';

export class AcceptInvitationDto implements IAcceptInvitationDto {
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token: string;
}
