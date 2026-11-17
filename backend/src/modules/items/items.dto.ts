import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { COLORS } from '../../common/text';

export class RewardDto {
  @ApiPropertyOptional({
    description: 'Amount in KGS; the platform never holds or transfers money.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  amount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) note?: string;
}

export class CreateItemDto {
  @ApiProperty({ enum: ['LOST', 'FOUND'] }) @IsIn(['LOST', 'FOUND']) listingType: 'LOST' | 'FOUND';
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty() @IsString() @Length(3, 80) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1500) description?: string;
  @ApiPropertyOptional({ enum: COLORS }) @IsOptional() @IsIn([...COLORS]) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) size?: string;
  @ApiPropertyOptional({
    description: 'Approximate district / city id. Exact coordinates are never accepted.',
  })
  @IsOptional()
  @IsUUID()
  approximateLocationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventTimeStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventTimeEnd?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
  @ApiPropertyOptional({
    type: [String],
    description: 'Hidden verification features — never shown publicly.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  hiddenFeatures?: string[];
  @ApiPropertyOptional({
    example: '+996700123456',
    description:
      'Contact phone. Private: shown only to the owner and to a claimant whose claim was approved.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;
  @ApiPropertyOptional({ type: RewardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RewardDto)
  reward?: RewardDto;
  @ApiPropertyOptional({ description: 'True when AI suggestions were used to pre-fill fields.' })
  @IsOptional()
  @IsBoolean()
  aiAssisted?: boolean;
  @ApiPropertyOptional({ description: 'False keeps the item as a server-side draft.' })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
  @ApiPropertyOptional({ description: 'Must be true to publish: user accepted publication rules.' })
  @IsOptional()
  @IsBoolean()
  acceptRules?: boolean;
}

export class UpdateItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 80) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1500) description?: string;
  @ApiPropertyOptional({ enum: COLORS }) @IsOptional() @IsIn([...COLORS]) color?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) brand?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) size?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() approximateLocationId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventTimeStart?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventTimeEnd?: string | null;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  hiddenFeatures?: string[];
  @ApiPropertyOptional({
    example: '+996700123456',
    description:
      'Contact phone. Private: shown only to the owner and to a claimant whose claim was approved.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;
  @ApiPropertyOptional({ type: RewardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RewardDto)
  reward?: RewardDto | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() publish?: boolean;
}

export class CloseItemDto {
  @ApiProperty({
    enum: ['resolved', 'closed'],
    description: 'resolved = item returned / found; closed = no longer relevant',
  })
  @IsIn(['resolved', 'closed'])
  resolution: 'resolved' | 'closed';
}

export class ItemsQueryDto {
  @ApiPropertyOptional({ enum: ['LOST', 'FOUND'] }) @IsOptional() @IsIn(['LOST', 'FOUND']) type?:
    'LOST' | 'FOUND';
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() locationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ enum: ['PUBLISHED', 'RESOLVED'] })
  @IsOptional()
  @IsIn(['PUBLISHED', 'RESOLVED'])
  status?: 'PUBLISHED' | 'RESOLVED';
  @ApiPropertyOptional({ enum: ['newest', 'relevance'] })
  @IsOptional()
  @IsIn(['newest', 'relevance'])
  sort?: 'newest' | 'relevance';
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
  @ApiPropertyOptional({ description: 'Only items with a reward (LOST)' })
  @IsOptional()
  @IsString()
  withReward?: string;
}
