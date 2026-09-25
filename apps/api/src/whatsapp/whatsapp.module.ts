import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { WhatsappSecurityGuard } from './whatsapp-security.guard';

import { BotFlowService } from './flow/bot-flow.service';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappSafetyService, WhatsappSecurityGuard, BotFlowService],
  exports: [WhatsappService, WhatsappSafetyService, BotFlowService],
})
export class WhatsappModule {}
