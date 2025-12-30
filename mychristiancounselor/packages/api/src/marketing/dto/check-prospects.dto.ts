import { IsArray, IsString } from 'class-validator';

export class CheckProspectsDto {
  @IsArray()
  @IsString({ each: true })
  prospectContactIds: string[];
}
