import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateObservationDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
