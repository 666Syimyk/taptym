import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const EVIDENCE_TYPES = [
  'unique_feature',
  'contents',
  'purchase_proof',
  'old_photo',
  'other',
] as const;

export class EvidenceDto {
  @ApiProperty({ enum: EVIDENCE_TYPES })
  @IsIn([...EVIDENCE_TYPES])
  type: (typeof EVIDENCE_TYPES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) text?: string;
  @ApiPropertyOptional({
    description: 'Media id uploaded via /media (stored in the protected contour).',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}

export class CreateClaimDto {
  @ApiPropertyOptional({ description: 'Short message to the other party. No secrets here.' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  message?: string;

  @ApiProperty({ type: [EvidenceDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence: EvidenceDto[];
}

export class AddEvidenceDto {
  @ApiProperty({ type: [EvidenceDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence: EvidenceDto[];
}

export class ClaimDecisionDto {
  @ApiProperty({ enum: ['plausible', 'needs_more_information', 'rejected', 'approve_handoff'] })
  @IsIn(['plausible', 'needs_more_information', 'rejected', 'approve_handoff'])
  decision: 'plausible' | 'needs_more_information' | 'rejected' | 'approve_handoff';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) note?: string;
}
