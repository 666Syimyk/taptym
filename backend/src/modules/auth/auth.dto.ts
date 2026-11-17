import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class AuthStartDto {
  @ApiProperty({ enum: ['phone', 'email'] })
  @IsIn(['phone', 'email'])
  channel: 'phone' | 'email';

  @ApiProperty({ example: '+996700123456' })
  @IsString()
  @Length(3, 254)
  destination: string;
}

export class AuthVerifyDto {
  @ApiProperty()
  @IsString()
  @Length(10, 100)
  challengeId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code: string;

  @ApiPropertyOptional({ example: 'Pixel 7' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @ApiPropertyOptional({ enum: ['android', 'ios', 'web'] })
  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  platform?: string;

  @ApiPropertyOptional({ enum: ['ru', 'ky', 'en'] })
  @IsOptional()
  @IsIn(['ru', 'ky', 'en'])
  locale?: 'ru' | 'ky' | 'en';

  @ApiPropertyOptional({
    description:
      'Refresh token of the guest account on this device. Its listings, claims and chats ' +
      'are kept: the guest becomes a verified account or is merged into the existing one.',
  })
  @IsOptional()
  @IsString()
  @Length(20, 200)
  guestRefreshToken?: string;
}

export class GuestDto {
  @ApiPropertyOptional({ example: 'Pixel 7' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @ApiPropertyOptional({ enum: ['android', 'ios', 'web'] })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @ApiPropertyOptional({ enum: ['ru', 'ky', 'en'] })
  @IsOptional()
  @IsIn(['ru', 'ky', 'en'])
  locale?: 'ru' | 'ky' | 'en';
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  refreshToken: string;
}

export class AuthStartResponse {
  @ApiProperty() challengeId: string;
  @ApiProperty() expiresInSeconds: number;
  @ApiProperty() message: string;
  @ApiPropertyOptional({ description: 'Present only in development when OTP_DEV_ECHO=true' })
  devCode?: string;
}

export class TokenPairResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() expiresInSeconds: number;
  @ApiProperty() userId: string;
  @ApiProperty() isNewAccount: boolean;
}
