import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { WhatsappSecurityGuard } from './whatsapp-security.guard';

import { BotFlowService } from './flow/bot-flow.service';
import { ConversationBrainService } from './conversation-brain.service';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappSafetyService, WhatsappSecurityGuard, BotFlowService, ConversationBrainService],
  exports: [WhatsappService, WhatsappSafetyService, BotFlowService, ConversationBrainService],
})
export class WhatsappModule {}
