import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { WhatsappSecurityGuard } from './whatsapp-security.guard';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappSafetyService, WhatsappSecurityGuard],
  exports: [WhatsappService, WhatsappSafetyService],
})
export class WhatsappModule {}
