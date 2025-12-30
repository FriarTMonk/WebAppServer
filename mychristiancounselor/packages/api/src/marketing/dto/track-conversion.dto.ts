import { IsEmail, IsString, IsIn } from 'class-validator';

export class TrackConversionDto {
  @IsEmail()
  prospectEmail: string;

  @IsString()
  @IsIn(['trial_signup', 'demo_request'])
  conversionType: 'trial_signup' | 'demo_request';
}
