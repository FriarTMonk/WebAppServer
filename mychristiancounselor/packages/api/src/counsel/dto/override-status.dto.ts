import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class OverrideStatusDto {
  @IsString()
  @IsIn(['red', 'yellow', 'green'])
  status: 'red' | 'yellow' | 'green';

  @IsString()
  @IsNotEmpty()
  reason: string;
}
