import { IsBoolean, IsISO8601, IsInt, IsOptional, IsString, Length, Max, Min, Matches } from 'class-validator';

export class SafetyConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() typingEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(1000) dailyLimit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) hourlyLimit?: number;
}
export class ConsentDto {
  @IsString() @Matches(/^\+?[1-9][0-9]{7,14}$/) phone!: string;
  @IsISO8601() grantedAt!: string;
  @IsString() @Length(3, 300) source!: string;
  @IsString() @Length(10, 2000) evidence!: string;
  @IsString() @Length(3, 300) purpose!: string;
}
export class SuppressionDto {
  @IsString() @Matches(/^\+?[1-9][0-9]{7,14}$/) phone!: string;
  @IsString() @Length(3, 500) reason!: string;
}
