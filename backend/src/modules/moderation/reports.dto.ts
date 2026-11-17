import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'fraud',
  'spam',
  'inappropriate',
  'personal_data',
  'wrong_category',
  'harassment',
  'other',
] as const;

export class CreateReportDto {
  @ApiProperty({ enum: ['item', 'user', 'message', 'claim', 'comment'] })
  @IsIn(['item', 'user', 'message', 'claim', 'comment'])
  targetType: 'item' | 'user' | 'message' | 'claim' | 'comment';
  @ApiProperty() @IsUUID() targetId: string;
  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn([...REPORT_REASONS])
  reason: (typeof REPORT_REASONS)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
