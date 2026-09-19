import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { LeadStatus, Priority } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeadFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() segmentId?: string;
  @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() scoreMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() scoreMax?: number;
  
  @ApiPropertyOptional() @IsOptional() @IsString() responsibleId?: string;
  
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;
}
