import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
