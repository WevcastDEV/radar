import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Req, UseGuards, Headers, BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { WhatsappSecurityGuard } from './whatsapp-security.guard';
import { ConsentDto, SafetyConfigDto, SuppressionDto } from './whatsapp-safety.dto';

import { BotFlowService } from './flow/bot-flow.service';
import { ConversationBrainService } from './conversation-brain.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService, 
    private readonly safety: WhatsappSafetyService,
    private readonly botFlowService: BotFlowService,
    private readonly conversationBrain: ConversationBrainService,
  ) {}

  @Get('safety')
  getSafety() { return { success: true, data: this.safety.getStatus() }; }

  @Post('safety/config')
  configureSafety(@Body() body: SafetyConfigDto) { return { success: true, data: this.safety.updateConfig(body) }; }

  @Post('safety/consent')
  recordConsent(@Body() body: ConsentDto, @Req() request: any) {
    return { success: true, data: this.safety.recordConsent(body, request.user.id) };
  }

  @Post('safety/suppress')
  suppress(@Body() body: SuppressionDto) {
    return { success: true, data: this.safety.suppress(body.phone, body.reason) };
  }

  @Get('status')
  getStatus(@Headers('x-device-id') deviceId?: string) {
    return {
      success: true,
      data: this.whatsappService.getStatus(deviceId),
    };
  }

  @Post('auto-reply')
  toggleAutoReply(@Body() body: { enabled: boolean }, @Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.setAutoReplyEnabled(Boolean(body.enabled), deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('auto-reply/universal')
  toggleUniversalAutoReply(@Body() body: { enabled: boolean; flowId?: string }) {
    const enabled = Boolean(body?.enabled);
    if (enabled) {
      // Religa o fluxo de conversa (sem fluxo ativo o robô fica mudo mesmo com auto-reply ligado)
      const flow = this.botFlowService.restoreActiveFlow(body?.flowId);
      if (!flow) {
        throw new BadRequestException('Nenhum fluxo de atendimento com etapas foi encontrado. Crie ou edite um fluxo em "Fluxos" antes de ligar o robô.');
      }
      const data = this.whatsappService.setAutoReplyEnabled(true, 'universal');
      return {
        success: true,
        data: { ...data, isFlowActive: true, activeFlowId: flow.id, activeFlowName: flow.name },
        message: `Robô de atendimento ATIVADO universalmente (fluxo "${flow.name}").`,
      };
    }
    this.botFlowService.deactivateFlow('all');
    const data = this.whatsappService.setAutoReplyEnabled(false, 'universal');
    return {
      success: true,
      data: { ...data, isFlowActive: false, activeFlowId: '' },
      message: 'Robô de atendimento DESATIVADO universalmente.',
    };
  }

  @Post('cordiality')
  toggleCordiality(@Body() body: { enabled: boolean }, @Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.setCordialityEnabled(Boolean(body.enabled), deviceId);
    return {
      success: true,
      data,
    };
  }

  @Get('queue')
  getQueue(@Headers('x-device-id') deviceId?: string) {
    return {
      success: true,
      data: this.whatsappService.getQueueStatus(deviceId),
    };
  }

  @Post('queue/start')
  async startQueue(@Body() body: any, @Headers('x-device-id') deviceId?: string) {
    const data = await this.whatsappService.startServerQueue(body, deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/pause')
  pauseQueue(@Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.pauseServerQueue(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/resume')
  resumeQueue(@Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.resumeServerQueue(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/skip-rest')
  skipQueueRest(@Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.skipServerBatchRest(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/skip-countdown')
  skipQueueCountdown(@Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.skipServerCountdown(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/stop')
  stopQueue(@Headers('x-device-id') deviceId?: string) {
    const data = this.whatsappService.stopServerQueue(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Get('history')
  getHistory() {
    return {
      success: true,
      data: this.whatsappService.getDispatchedHistory(),
    };
  }

  @Post('history')
  saveHistory(@Body() record: any) {
    const data = this.whatsappService.saveDispatchedHistory(record);
    return {
      success: true,
      data,
    };
  }

  @Delete('history')
  clearHistory() {
    const success = this.whatsappService.clearDispatchedHistory();
    return {
      success,
      message: 'Histórico de disparos zerado no servidor',
    };
  }

  @Post('check-numbers')
  async checkNumbers(@Body() body: { phones: string[] }, @Headers('x-device-id') deviceId?: string) {
    const data = await this.whatsappService.checkNumbersOnWhatsApp(body?.phones || [], deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post('send')
  async sendMessage(@Body() body: { 
    to: string; 
    text: string; 
    image?: string;
    leadId?: string;
    leadName?: string;
    category?: string;
    templateName?: string;
  }, @Headers('x-device-id') deviceId?: string) {
    const result = await this.whatsappService.sendMessage(body.to, body.text, body.image, 'marketing', deviceId);

    if (result.success && body.leadName) {
      const now = new Date();
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const dateLabel = `Hoje, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

      this.whatsappService.saveDispatchedHistory({
        leadId: body.leadId || `lead-${Date.now()}`,
        leadName: body.leadName,
        phone: body.to,
        category: body.category || 'Geral',
        date: now.toLocaleDateString('pt-BR'),
        dateLabel,
        time: now.toLocaleTimeString('pt-BR'),
        messageSent: body.text,
        templateName: body.templateName || 'Padrão',
        status: 'SENT',
        hasImage: !!body.image,
      });
    }

    return result;
  }

  @Post('reset')
  async resetConnection(@Headers('x-device-id') deviceId?: string) {
    const result = await this.whatsappService.resetAndGenerateQr(deviceId);
    return {
      success: true,
      data: result,
      message: 'Conexão resetada com sucesso. Gerando novo QR Code limpo...',
    };
  }

  @Post('reconnect')
  async reconnect(@Body() body?: { forceNewSession?: boolean }, @Headers('x-device-id') deviceId?: string) {
    const result = await this.whatsappService.reconnect(body?.forceNewSession ?? true, deviceId);
    return {
      success: true,
      data: result,
      message: 'Reconexão iniciada com sucesso. O QR Code será gerado se o aparelho não estiver pareado.',
    };
  }

  @Post('disconnect')
  async disconnect(@Headers('x-device-id') deviceId?: string) {
    await this.whatsappService.disconnect(deviceId);
    return {
      success: true,
      message: 'WhatsApp desconectado com sucesso. Nova sessão pronta para leitura de QR Code.',
    };
  }

  @Get('ignored-contacts')
  getIgnoredContacts() {
    return {
      success: true,
      data: this.whatsappService.getIgnoredContacts(),
    };
  }

  @Post('ignored-contacts')
  saveIgnoredContacts(@Body() body: { contacts: string[] }) {
    return {
      success: true,
      data: this.whatsappService.saveIgnoredContacts(body.contacts || []),
    };
  }

  @Get('human-chats')
  getHumanChats() {
    return {
      success: true,
      data: this.whatsappService.getHumanHandledChats(),
    };
  }

  @Delete('human-chats/:id?')
  clearHumanChats(@Param('id') id?: string) {
    return {
      success: true,
      data: this.whatsappService.clearHumanHandledChat(id),
    };
  }

  @Get('attended-phones')
  getAttendedPhones() {
    return {
      success: true,
      data: this.whatsappService.getAttendedPhonesList(),
    };
  }

  @Post('attended-phones/unlock')
  unlockAttendedPhone(@Body() body: { phone: string }) {
    return {
      success: true,
      data: this.whatsappService.unlockAttendedPhone(body.phone),
    };
  }

  @Get('hot-leads')
  getHotLeads() {
    return {
      success: true,
      data: this.whatsappService.getHotLeads(),
    };
  }

  @Post('hot-leads/mark-read')
  markHotLeadsRead() {
    return {
      success: true,
      data: this.whatsappService.markHotLeadsAsRead(),
    };
  }

  @Post('hot-leads/clear')
  clearHotLeads() {
    return {
      success: true,
      data: this.whatsappService.clearHotLeads(),
    };
  }

  @Delete('hot-leads')
  clearHotLeadsDelete() {
    return {
      success: true,
      data: this.whatsappService.clearHotLeads(),
    };
  }

  @Get('ab-analytics')
  getAbAnalytics() {
    return {
      success: true,
      data: this.whatsappService.getAbAnalytics(),
    };
  }

  @Get('sdr-config')
  getSdrConfig() {
    return {
      success: true,
      data: this.whatsappService.getSdrConfig(),
    };
  }

  @Post('sdr-config')
  saveSdrConfig(@Body() body: any) {
    return {
      success: true,
      data: this.whatsappService.saveSdrConfig(body),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🌿 FLUXOS DE CONVERSAÇÃO CONFIGURÁVEIS (MULTI-EMPRESA & CHATBOT)
  // ═══════════════════════════════════════════════════════════════════

  @Get('flows')
  getFlows() {
    return {
      success: true,
      data: {
        flows: this.botFlowService.getAllFlows(),
        activeFlow: this.botFlowService.getActiveFlow(),
      },
    };
  }

  @Get('flows/active')
  getActiveFlow() {
    return {
      success: true,
      data: this.botFlowService.getActiveFlow(),
    };
  }

  @Post('flows')
  saveFlow(@Body() body: any) {
    return {
      success: true,
      data: this.botFlowService.saveFlow(body),
      message: 'Fluxo de conversação salvo com sucesso!',
    };
  }

  @Post('flows/:id/activate')
  activateFlow(@Param('id') id: string, @Headers('x-device-id') deviceId?: string) {
    const target = this.botFlowService.getFlowById(id);
    if (!target || id === 'all') throw new NotFoundException('Fluxo não encontrado.');
    if (!Array.isArray(target.steps) || target.steps.length === 0) {
      throw new BadRequestException('Adicione pelo menos uma etapa antes de ativar o robô.');
    }
    const flow = this.botFlowService.setActiveFlow(id);
    this.whatsappService.setAutoReplyEnabled(true, deviceId);
    return {
      success: !!flow,
      data: flow,
      message: flow ? `Fluxo "${flow.name}" ativado com sucesso para o robô!` : 'Fluxo não encontrado.',
    };
  }

  @Post('flows/:id/deactivate')
  deactivateFlow(@Param('id') id: string, @Headers('x-device-id') deviceId?: string) {
    if (id !== 'all' && !this.botFlowService.getFlowById(id)) {
      throw new NotFoundException('Fluxo não encontrado.');
    }
    this.botFlowService.deactivateFlow(id);
    if (!this.botFlowService.isBotActive()) {
      this.whatsappService.setAutoReplyEnabled(false, deviceId);
    }
    return {
      success: true,
      message: this.botFlowService.isBotActive() ? 'Fluxo desativado.' : 'Robô silenciado globalmente.',
    };
  }

  @Delete('flows/:id')
  deleteFlow(@Param('id') id: string) {
    const deleted = this.botFlowService.deleteFlow(id);
    return {
      success: deleted,
      message: deleted ? 'Fluxo excluído com sucesso.' : 'Fluxo não encontrado.',
    };
  }

  @Post('flows/simulate')
  simulateFlow(@Body() body: { flowId: string; currentStepId: string | null; message: string; collectedData?: Record<string, string> }) {
    const result = this.botFlowService.simulateStep(
      body.flowId,
      body.currentStepId,
      body.message,
      body.collectedData || {}
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('flows/trigger')
  async triggerFlowForLeads(@Body() body: { flowId?: string; leads: Array<{ id: string; name: string; phone: string; category?: string }> }, @Headers('x-device-id') deviceId?: string) {
    const flow = (body.flowId ? this.botFlowService.getFlowById(body.flowId) : null) || this.botFlowService.getActiveFlow();
    if (!flow || !flow.steps || flow.steps.length === 0) {
      return {
        success: false,
        message: 'Nenhum fluxo de conversação ativo ou configurado para disparo.',
      };
    }

    const firstStep = flow.steps[0];
    const leadsToDispatch = (body.leads || []).map(lead => {
      let msg = firstStep.message || '';
      msg = msg
        .replace(/\{\{nome_cliente\}\}/gi, lead.name || 'Cliente')
        .replace(/\{\{minha_empresa\}\}/gi, flow.companyName || 'Nossa Empresa')
        .replace(/\{\{segmento\}\}/gi, lead.category || flow.segment || 'Geral');

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        category: lead.category || flow.segment,
        message: msg,
        templateName: flow.name,
      };
    });

    const queueRes = await this.whatsappService.startServerQueue({
      leads: leadsToDispatch,
      intervalSeconds: 60,
      batchSize: 10,
      batchPauseMinutes: 10,
    }, deviceId);

    return {
      success: true,
      data: queueRes,
      message: `Disparo do fluxo "${flow.name}" iniciado para ${leadsToDispatch.length} contatos!`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🧠 BASE DE CONHECIMENTO MANUAL E BANCO DE DADOS DE CONVERSAS
  // ═══════════════════════════════════════════════════════════════════

  @Get('conversation-config')
  getConversationConfig() {
    return {
      success: true,
      data: this.conversationBrain.getConfig(),
    };
  }

  @Post('conversation-config')
  saveConversationConfig(@Body() body: any) {
    const updated = this.conversationBrain.saveConfig(body);
    return {
      success: true,
      data: updated,
      message: 'Configurações de inteligência conversacional salvas com sucesso!',
    };
  }

  @Get('conversations')
  getConversations(@Req() req: any) {
    const status = req.query?.status as string | undefined;
    const search = req.query?.search as string | undefined;
    const limit = req.query?.limit ? Number(req.query.limit) : 100;

    const data = this.conversationBrain.getAllConversations({ status, search, limit });
    return {
      success: true,
      data,
    };
  }

  @Get('conversations/metrics/attendance-report')
  getAttendanceReport() {
    return {
      success: true,
      data: this.conversationBrain.getAttendanceReport(),
    };
  }

  @Post('conversations/:id/read')
  markConversationAsRead(@Param('id') id: string) {
    const success = this.conversationBrain.markConversationAsRead(id);
    return {
      success,
      message: success ? 'Conversa marcada como lida.' : 'Conversa não encontrada.',
    };
  }

  @Post('conversations/:id/unread')
  markConversationAsUnread(@Param('id') id: string) {
    const success = this.conversationBrain.markConversationAsUnread(id);
    return {
      success,
      message: success ? 'Conversa marcada como não lida.' : 'Conversa não encontrada.',
    };
  }

  @Get('conversations/:id')
  getConversationById(@Param('id') id: string) {
    const conv = this.conversationBrain.getConversation(id);
    return {
      success: !!conv,
      data: conv,
    };
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string) {
    const deleted = this.conversationBrain.deleteConversation(id);
    return {
      success: deleted,
      message: deleted ? 'Conversa removida do banco com sucesso.' : 'Conversa não encontrada.',
    };
  }

  @Post('conversations/:id/rename')
  @Patch('conversations/:id/rename')
  renameContact(
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('Nome do contato é obrigatório');
    const conv = this.conversationBrain.updateContactName(id, body.name.trim());
    return {
      success: !!conv,
      message: conv ? `Nome atualizado para "${body.name.trim()}".` : 'Conversa não encontrada.',
      data: conv,
    };
  }

  @Patch('conversations/:id/contact')
  @Post('conversations/:id/contact')
  updateContact(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; notes?: string; contactType?: any; crmStage?: string },
  ) {
    const success = this.conversationBrain.updateConversationContact(id, body);
    return {
      success,
      message: success ? 'Contato atualizado com sucesso.' : 'Conversa não encontrada.',
      data: this.conversationBrain.getConversation(id),
    };
  }

  @Put('conversations/:id/messages/:messageId')
  editMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() body: { text: string },
  ) {
    if (!body?.text) throw new BadRequestException('Texto da mensagem é obrigatório');
    const success = this.conversationBrain.editMessage(id, messageId, body.text);
    return {
      success,
      message: success ? 'Mensagem editada com sucesso.' : 'Mensagem não encontrada.',
    };
  }

  @Delete('conversations/:id/messages/:messageId')
  async deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const forEveryone = req.query?.forEveryone === 'true' || req.body?.forEveryone === true;
    
    // Procura a mensagem para obter baileysId se existir
    const conv = this.conversationBrain.getConversation(id);
    const msg = conv?.messages?.find(m => m.id === messageId || (m as any).baileysId === messageId);
    const baileysId = (msg as any)?.baileysId || messageId;
    const targetJid = conv?.jid || id;

    const success = this.conversationBrain.deleteMessage(id, messageId, forEveryone);

    if (forEveryone && baileysId) {
      // Dispara revoke no WhatsApp para remover do aparelho do cliente
      this.whatsappService.revokeMessage(targetJid, baileysId, deviceId).catch(() => {});
    }

    return {
      success,
      message: success ? 'Mensagem excluída com sucesso.' : 'Mensagem não encontrada.',
    };
  }

  @Delete('conversations/:id/messages')
  clearConversationMessages(@Param('id') id: string) {
    const success = this.conversationBrain.clearConversationMessages(id);
    return {
      success,
      message: success ? 'Mensagens da conversa limpas com sucesso.' : 'Conversa não encontrada.',
    };
  }

  @Post('conversations/:id/messages/:messageId/pin')
  togglePinMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const success = this.conversationBrain.togglePinMessage(id, messageId);
    return {
      success,
      message: success ? 'Status de fixação alterado.' : 'Mensagem não encontrada.',
    };
  }

  @Post('conversations/:id/messages/:messageId/star')
  toggleStarMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    const success = this.conversationBrain.toggleStarMessage(id, messageId);
    return {
      success,
      message: success ? 'Status de favorito alterado.' : 'Mensagem não encontrada.',
    };
  }

  @Post('conversations/:id/messages/:messageId/react')
  reactToMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
  ) {
    if (!body?.emoji) throw new BadRequestException('Emoji é obrigatório');
    const success = this.conversationBrain.reactToMessage(id, messageId, body.emoji);
    return {
      success,
      message: success ? 'Reação atualizada.' : 'Mensagem não encontrada.',
    };
  }

  @Delete('conversations')
  clearAllConversations() {
    this.conversationBrain.clearAllConversations();
    return {
      success: true,
      message: 'Banco de dados de conversas limpo com sucesso.',
    };
  }

  @Post('reset-client-history')
  resetClientHistory() {
    const result = this.conversationBrain.clearAllClientHistory();
    this.whatsappService.clearDispatchedHistory();
    return {
      success: true,
      data: result,
      message: 'Todo o histórico de clientes e conversas foi limpo com sucesso.',
    };
  }

  @Get('quick-messages')
  getQuickMessages() {
    return {
      success: true,
      data: this.conversationBrain.getQuickMessages(),
    };
  }

  @Post('quick-messages')
  saveQuickMessage(@Body() body: any) {
    const qm = this.conversationBrain.saveQuickMessage(body);
    return {
      success: true,
      data: qm,
      message: 'Mensagem rápida salva com sucesso.',
    };
  }

  @Delete('quick-messages/:id')
  deleteQuickMessage(@Param('id') id: string) {
    const success = this.conversationBrain.deleteQuickMessage(id);
    return {
      success,
      message: success ? 'Mensagem rápida excluída com sucesso.' : 'Mensagem rápida não encontrada.',
    };
  }

  @Post('conversations/simulate')
  simulateConversationalReply(@Body() body: { message: string; name?: string }) {
    const result = this.conversationBrain.processConversationalReply('sim_user', body.message, body.name);
    return {
      success: true,
      data: result,
    };
  }

  @Post('conversations/reply')
  async replyToConversation(
    @Body() body: { to?: string; text?: string; jid?: string; imageBase64OrUrl?: string; audioBase64?: string; audioBase64OrUrl?: string },
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.executeConversationReply(undefined, body, deviceId);
  }

  @Post('conversations/:id/reply')
  async replyToConversationWithId(
    @Param('id') id: string,
    @Body() body: { to?: string; text?: string; jid?: string; imageBase64OrUrl?: string; audioBase64?: string; audioBase64OrUrl?: string },
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.executeConversationReply(id, body, deviceId);
  }

  private async executeConversationReply(
    paramId?: string,
    body?: { to?: string; text?: string; jid?: string; imageBase64OrUrl?: string; audioBase64?: string; audioBase64OrUrl?: string },
    deviceId?: string,
  ) {
    const rawTarget = body?.jid || body?.to || paramId;
    if (!rawTarget) {
      return { success: false, message: 'Destinatário não informado.' };
    }
    const audioPayload = body?.audioBase64 || body?.audioBase64OrUrl;
    const text = body?.text || (audioPayload ? '[Áudio]' : (body?.imageBase64OrUrl ? '[Imagem]' : ''));
    if (!text && !body?.imageBase64OrUrl && !audioPayload) {
      return { success: false, message: 'Mensagem vazia.' };
    }

    // Tentar resolver o JID da conversa caso não tenha @
    let target = rawTarget;
    if (!target.includes('@')) {
      const conv = this.conversationBrain.getConversation(rawTarget) 
        || (paramId ? this.conversationBrain.getConversation(paramId) : undefined);
      if (conv?.jid) {
        target = conv.jid;
      }
    }

    const result = await this.whatsappService.sendMessage(
      target, 
      text, 
      body?.imageBase64OrUrl, 
      'service', 
      deviceId,
      audioPayload
    );

    if (result.success) {
      try {
        const mediaType = audioPayload ? 'audio' : (body?.imageBase64OrUrl ? 'image' : undefined);
        const mediaUrl = audioPayload || body?.imageBase64OrUrl;
        this.conversationBrain.recordHumanMessage(target, text, mediaType, mediaUrl, (result as any).messageId);
        this.whatsappService.registerHumanIntervention(target);
        if (paramId && paramId !== target) {
          this.whatsappService.registerHumanIntervention(paramId);
        }
      } catch {}
    }
    return result;
  }

  @Post('conversations/toggle-bot')
  toggleBotForContact(@Body() body: { jid: string; pause: boolean }) {
    if (!body.jid) return { success: false, message: 'JID é obrigatório.' };
    if (body.pause) {
      this.whatsappService.registerHumanIntervention(body.jid);
    } else {
      this.whatsappService.clearHumanHandledChat(body.jid);
    }
    return {
      success: true,
      paused: body.pause,
      message: body.pause ? 'Robô pausado para atendimento humano.' : 'Robô reativado para responder automaticamente.',
    };
  }

  @Post('conversations/:id/resume-bot')
  resumeBotForContact(@Param('id') id: string) {
    const success = this.whatsappService.resumeBotForContact(id);
    return { success, message: 'Robô reativado com sucesso para este contato.' };
  }

  @Post('conversations/:id/pause-bot')
  pauseBotForContact(@Param('id') id: string) {
    const success = this.whatsappService.pauseBotForContact(id);
    return { success, message: 'Robô pausado. Atendimento sob controle manual.' };
  }

  @Post('conversations/:id/restart-flow')
  restartFlowForContact(@Param('id') id: string) {
    this.whatsappService.resumeBotForContact(id);
    return { success: true, message: 'Fluxo de conversa reiniciado para o primeiro passo.' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 👥 BANCO DE DADOS DE CONTATOS (CLIENTES vs AMIGOS / PESSOAL)
  // ═══════════════════════════════════════════════════════════════════

  @Get('contacts')
  getContacts(@Req() req: any) {
    const type = req.query?.type as string | undefined;
    const search = req.query?.search as string | undefined;
    const limit = req.query?.limit ? Number(req.query.limit) : 200;

    const data = this.conversationBrain.getAllClassifiedContacts({ type, search, limit });
    return {
      success: true,
      data,
    };
  }

  @Post('contacts/classify')
  classifyContact(@Body() body: { jid: string; type: 'cliente' | 'amigo'; name?: string; notes?: string }) {
    const updated = this.conversationBrain.classifyContact(body.jid, body.type, body.name, body.notes);
    // Se for classificado como cliente, limpa qualquer silêncio humano para que o robô possa atender imediatamente
    if (body.type === 'cliente') {
      this.whatsappService.clearHumanHandledChat(body.jid);
    }
    return {
      success: true,
      data: updated,
      message: `Contato classificado com sucesso como ${body.type === 'amigo' ? 'Amigo (Robô Silenciado)' : 'Cliente (Robô Ativo)'}!`,
    };
  }

  @Post('contacts/add-friend')
  addFriend(@Body() body: { phoneOrName: string; notes?: string }) {
    const raw = (body.phoneOrName || '').trim();
    if (!raw) return { success: false, message: 'Telefone ou nome é obrigatório.' };

    const contact = this.conversationBrain.classifyContact(raw, 'amigo', raw, body.notes || 'Cadastrado manualmente como Amigo/Pessoal');
    const ignored = this.whatsappService.getIgnoredContacts();
    if (!ignored.includes(raw)) {
      this.whatsappService.saveIgnoredContacts([...ignored, raw]);
    }

    return {
      success: true,
      data: contact,
      message: `"${raw}" cadastrado como Amigo com sucesso! O robô não enviará mensagens comerciais para ele.`,
    };
  }

  @Delete('contacts/:id')
  deleteContact(@Param('id') id: string) {
    const deleted = this.conversationBrain.deleteClassifiedContact(id);
    return {
      success: deleted,
      message: deleted ? 'Contato removido com sucesso.' : 'Contato não encontrado.',
    };
  }

  @Post('contacts/clear-silence')
  clearHumanSilence(@Body() body: { id?: string }) {
    const res = this.whatsappService.clearHumanHandledChat(body?.id);
    return {
      success: true,
      data: res,
      message: body?.id 
        ? 'Silêncio temporário cancelado para este contato! Robô liberado para responder.'
        : 'Todos os silêncios temporários foram liberados! Robô operando para todos os clientes.',
    };
  }
}
