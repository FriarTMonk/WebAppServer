import { IsEmail, IsString } from 'class-validator';
import { LoginDto as ILoginDto } from '@mychristiancounselor/shared';

export class LoginDto implements ILoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  password: string;
}
