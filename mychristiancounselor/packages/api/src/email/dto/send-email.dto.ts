import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for resending verification email
 */
export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * DTO for forgot password request
 */
export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
