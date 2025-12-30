import { IsString, IsEmail, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateProspectContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
