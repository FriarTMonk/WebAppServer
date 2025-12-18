import { IsNumber, IsOptional, IsString, Min, Length } from 'class-validator';

export class MarkWonDto {
  @IsNumber()
  @Min(0)
  actualValue: number;

  @IsOptional()
  @IsString()
  @Length(10, 2000)
  notes?: string;
}
