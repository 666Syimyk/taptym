import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 40) publicName?: string;
  @ApiPropertyOptional({ enum: ['ru', 'ky', 'en'] }) @IsOptional() @IsIn(['ru', 'ky', 'en']) locale?:
    'ru' | 'ky' | 'en';
  @ApiPropertyOptional({ description: 'Map of optional notification type → enabled' })
  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;
}

export class PushTokenDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) pushToken?: string | null;
}

export class ConsentDto {
  @IsIn(['terms', 'privacy', 'ai_processing', 'analytics']) consentType: string;
  @IsString() @MaxLength(20) version: string;
  @IsBoolean() granted: boolean;
}
