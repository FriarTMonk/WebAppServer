import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, Min, Max, IsDateString, Length } from 'class-validator';
import { SalesStage, LeadSource } from '@prisma/client';

export class CreateOpportunityDto {
  @IsString()
  @Length(10, 200)
  title: string;

  @IsString()
  @Length(20, 5000)
  description: string;

  @IsString()
  @Length(2, 100)
  contactName: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  companyName?: string;

  @IsEnum(LeadSource)
  leadSource: LeadSource;

  @IsNumber()
  @Min(0)
  dealValue: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  probability: number;

  @IsOptional()
  @IsDateString()
  estimatedCloseDate?: string;
}
