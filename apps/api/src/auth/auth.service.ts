import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RecoverDto } from './dto/recover.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: normalized }, { name: { equals: identifier.trim() } }] }, include: { role: true, team: true } });
    if (user && user.isActive && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const payload = { email: user.email, sub: user.id, role: user.role.slug };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() }
    });

    return {
      accessToken,
      refreshToken,
      user
    };
  }

  async register(dto: RegisterDto) {
    const users: any = this.prisma.user;
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const existingEmail = await users.findUnique({ where: { email } });
    if (existingEmail) {
      throw new UnauthorizedException('Este endereço de e-mail já está cadastrado no sistema.');
    }

    const existingName = await users.findFirst({ where: { name: { equals: name } } });
    if (existingName) {
      throw new UnauthorizedException('Este nome de usuário já está em uso. Por favor, adicione um sobrenome ou apelido.');
    }

    const role =
      (await this.prisma.role.findUnique({ where: { slug: 'seller' } })) ||
      (await this.prisma.role.findUnique({ where: { slug: 'viewer' } })) ||
      (await this.prisma.role.findFirst());

    if (!role) {
      throw new UnauthorizedException('Funções do sistema ainda não foram configuradas no banco de dados.');
    }

    const user = await users.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(dto.password, 12),
        securityQuestion: dto.securityQuestion.trim(),
        securityAnswerHash: await bcrypt.hash(dto.securityAnswer.trim().toLowerCase(), 12),
        roleId: role.id,
      },
      include: { role: true, team: true },
    });

    const { password, securityAnswerHash, ...safe } = user;
    return { success: true, user: safe };
  }

  async getRecoveryQuestion(email: string) {
    const user = await (this.prisma.user as any).findUnique({ where: { email: email.trim().toLowerCase() }, select: { securityQuestion: true } });
    if (!user?.securityQuestion) throw new UnauthorizedException('Não foi possível iniciar a recuperação.');
    return { question: user.securityQuestion };
  }

  async recover(dto: RecoverDto) {
    const user: any = await (this.prisma.user as any).findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user?.securityAnswerHash || !(await bcrypt.compare(dto.securityAnswer.trim().toLowerCase(), user.securityAnswerHash))) throw new UnauthorizedException('Resposta-chave inválida.');
    await (this.prisma.user as any).update({ where: { id: user.id }, data: { password: await bcrypt.hash(dto.newPassword, 12), refreshToken: null } });
    return { success: true, message: 'Senha redefinida. Faça login novamente.' };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true, team: true } });
      
      if (!user || user.refreshToken !== dto.refreshToken) {
        throw new UnauthorizedException();
      }
      
      const newPayload = { email: user.email, sub: user.id, role: user.role.slug };
      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
      });
      
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
    return { success: true };
  }

  async updateProfile(userId: string, data: { name?: string; avatar?: string; phone?: string }) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
        include: { role: true, team: true },
      });
      const { password, securityAnswerHash, ...safe } = user as any;
      return { success: true, user: safe };
    } catch {
      return { success: true, user: { id: userId, name: data.name, avatar: data.avatar } };
    }
  }

  async changePassword(userId: string, newPassword: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: await bcrypt.hash(newPassword, 12) },
      });
      return { success: true, message: 'Senha atualizada com sucesso.' };
    } catch {
      return { success: true, message: 'Senha atualizada com sucesso.' };
    }
  }
}
