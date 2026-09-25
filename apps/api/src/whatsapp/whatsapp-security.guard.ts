import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class WhatsappSecurityGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
