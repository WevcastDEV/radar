import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class WhatsappSecurityGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32 || /fallback|changeme|change-me|your-secret|supersecret/i.test(secret)) {
      throw new ServiceUnavailableException('WhatsApp bloqueado: configure JWT_SECRET próprio com pelo menos 32 caracteres.');
    }
    return true;
  }
}
