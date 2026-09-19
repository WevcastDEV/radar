import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { WhatsappSecurityGuard } from './whatsapp-security.guard';
import { ConsentDto, SafetyConfigDto, SuppressionDto } from './whatsapp-safety.dto';

@Controller('whatsapp')
@UseGuards(WhatsappSecurityGuard, JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService, private readonly safety: WhatsappSafetyService) {}

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
  getStatus() {
    return {
      success: true,
      data: this.whatsappService.getStatus(),
    };
  }

  @Post('auto-reply')
  toggleAutoReply(@Body() body: { enabled: boolean }) {
    const data = this.whatsappService.setAutoReplyEnabled(Boolean(body.enabled));
    return {
      success: true,
      data,
    };
  }

  @Post('cordiality')
  toggleCordiality(@Body() body: { enabled: boolean }) {
    const data = this.whatsappService.setCordialityEnabled(Boolean(body.enabled));
    return {
      success: true,
      data,
    };
  }

  @Get('queue')
  getQueue() {
    return {
      success: true,
      data: this.whatsappService.getQueueStatus(),
    };
  }

  @Post('queue/start')
  async startQueue(@Body() body: any) {
    const data = await this.whatsappService.startServerQueue(body);
    return {
      success: true,
      data,
    };
  }

  @Post('queue/pause')
  pauseQueue() {
    const data = this.whatsappService.pauseServerQueue();
    return {
      success: true,
      data,
    };
  }

  @Post('queue/resume')
  resumeQueue() {
    const data = this.whatsappService.resumeServerQueue();
    return {
      success: true,
      data,
    };
  }

  @Post('queue/skip-rest')
  skipQueueRest() {
    const data = this.whatsappService.skipServerBatchRest();
    return {
      success: true,
      data,
    };
  }

  @Post('queue/stop')
  stopQueue() {
    const data = this.whatsappService.stopServerQueue();
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

  @Post('send')
  async sendMessage(@Body() body: { 
    to: string; 
    text: string; 
    image?: string;
    leadId?: string;
    leadName?: string;
    category?: string;
    templateName?: string;
  }) {
    const result = await this.whatsappService.sendMessage(body.to, body.text, body.image);

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

  @Post('reconnect')
  async reconnect(@Body() body?: { forceNewSession?: boolean }) {
    await this.whatsappService.reconnect(body?.forceNewSession ?? true);
    return {
      success: true,
      message: 'Reconexão iniciada com sucesso. O QR Code será gerado se o aparelho não estiver pareado.',
    };
  }

  @Post('disconnect')
  async disconnect() {
    await this.whatsappService.disconnect();
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
}
