import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RecoverDto } from './dto/recover.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('recovery-question')
  recoveryQuestion(@Body() body: { email: string }) { return this.authService.getRecoveryQuestion(body.email); }

  @Post('recover')
  recover(@Body() dto: RecoverDto) { return this.authService.recover(dto); }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  @Post('profile')
  updateProfile(@Body() body: { id?: string; name?: string; avatar?: string; phone?: string }) {
    const userId = body.id || 'user-admin';
    return this.authService.updateProfile(userId, body);
  }

  @Post('change-password')
  changePassword(@Body() body: { id?: string; newPassword: string }) {
    const userId = body.id || 'user-admin';
    return this.authService.changePassword(userId, body.newPassword);
  }
}
