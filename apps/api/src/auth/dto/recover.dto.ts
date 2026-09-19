import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RecoverDto {
  @IsEmail() email!: string;
  @IsString() @Length(2, 120) securityAnswer!: string;
  @IsString() @MinLength(8) newPassword!: string;
}
