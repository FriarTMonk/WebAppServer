import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateObservationDto {
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
