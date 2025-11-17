import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateObservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
