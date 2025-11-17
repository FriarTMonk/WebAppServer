import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateObservationDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
