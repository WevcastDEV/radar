import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { LeadStatus, Priority } from '@prisma/client';

export class CreateAddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() tradeName?: string;
  
  @ApiPropertyOptional()
  @IsOptional() @IsString() companyName?: string;
  
  @ApiPropertyOptional()
  @IsOptional() @IsString() cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() segmentId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() responsibleId?: string;
  
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional() @IsEnum(Priority) priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() estimatedEmployees?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() isNightOperation?: boolean;
  
  @ApiPropertyOptional()
  @IsOptional() @ValidateNested() @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
