import { IsString, IsNotEmpty, MaxLength, MinLength, IsEnum, IsOptional } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['technical', 'account', 'billing', 'feature_request', 'license_management', 'member_issues', 'counselor_tools'])
  category: string;

  @IsOptional()
  @IsString()
  @IsEnum(['urgent', 'high', 'medium', 'low', 'feature'])
  priority?: string; // Manual priority in Phase 1
}
