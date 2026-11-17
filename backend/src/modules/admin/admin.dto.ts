import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminLoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @Length(8, 200) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(6, 6) totp?: string;
}
export class MfaEnableDto {
  @IsString() @Length(6, 6) code: string;
}
export class ItemStatusDto {
  @ApiProperty({ enum: ['PUBLISHED', 'PENDING_REVIEW', 'REMOVED'] })
  @IsIn(['PUBLISHED', 'PENDING_REVIEW', 'REMOVED'])
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'REMOVED';
  @ApiPropertyOptional({
    description: 'Sent to the owner as "needs fix" when status is PENDING_REVIEW/REMOVED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
export class UserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'RESTRICTED', 'BANNED'] })
  @IsIn(['ACTIVE', 'RESTRICTED', 'BANNED'])
  status: 'ACTIVE' | 'RESTRICTED' | 'BANNED';
  @ApiPropertyOptional() @IsOptional() @IsDateString() until?: string;
  @ApiProperty() @IsString() @Length(3, 400) reason: string;
}
export class CaseResolveDto {
  @ApiProperty() @IsString() @Length(2, 1000) resolution: string;
}
export class ClaimAdminDecisionDto {
  @ApiProperty({ enum: ['PLAUSIBLE', 'REJECTED', 'UNDER_REVIEW', 'NEEDS_MORE_INFORMATION'] })
  @IsIn(['PLAUSIBLE', 'REJECTED', 'UNDER_REVIEW', 'NEEDS_MORE_INFORMATION'])
  status: 'PLAUSIBLE' | 'REJECTED' | 'UNDER_REVIEW' | 'NEEDS_MORE_INFORMATION';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) note?: string;
}
export class CategoryUpsertDto {
  @IsOptional() @IsString() @Length(2, 40) slug?: string;
  @IsOptional() @IsString() @Length(2, 60) nameRu?: string;
  @IsOptional() @IsString() @Length(2, 60) nameKy?: string;
  @IsOptional() @IsString() @Length(2, 60) nameEn?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) synonyms?: string[];
  @IsOptional() @IsString() @MaxLength(40) icon?: string;
  @IsOptional() @IsBoolean() sensitive?: boolean;
  @IsOptional()
  @IsIn(['standard', 'restricted_photo', 'official_handover'])
  publicationPolicy?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class NotifyUserDto {
  @IsUUID() userId: string;
  @IsString() @Length(3, 400) note: string;
}
export class CreateAdminDto {
  @IsEmail() email: string;
  @IsString() @Length(12, 200) password: string;
  @IsIn(['SUPER_ADMIN', 'MODERATOR', 'SUPPORT', 'SECURITY_ANALYST', 'READONLY_ANALYST'])
  role: string;
}
export class FeatureFlagDto {
  @IsBoolean() enabled: boolean;
}
