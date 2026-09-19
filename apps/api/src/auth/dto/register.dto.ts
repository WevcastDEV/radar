import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @Length(2, 120) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @Length(8, 240) securityQuestion!: string;
  @IsString() @Length(2, 120) securityAnswer!: string;
}
