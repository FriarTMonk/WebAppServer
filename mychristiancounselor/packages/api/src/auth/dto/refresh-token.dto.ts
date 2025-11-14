import { IsString, IsNotEmpty } from 'class-validator';
import { RefreshTokenDto as IRefreshTokenDto } from '@mychristiancounselor/shared';

export class RefreshTokenDto implements IRefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
