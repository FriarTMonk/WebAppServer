import { IsString, IsObject, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ThresholdsDto {
  @IsNotEmpty()
  notAligned: number;

  @IsNotEmpty()
  globallyAligned: number;
}

export class CreateFrameworkDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsObject()
  @IsNotEmpty()
  criteria: any;

  @IsObject()
  @IsNotEmpty()
  categoryWeights: any;

  @ValidateNested()
  @Type(() => ThresholdsDto)
  thresholds: ThresholdsDto;
}
