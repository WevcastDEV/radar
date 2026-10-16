import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService, SystemSettings } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return {
      success: true,
      data: this.settingsService.getSettings(),
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  updateSettings(@Body() body: Partial<SystemSettings>) {
    const updated = this.settingsService.updateSettings(body);
    return {
      success: true,
      message: 'Configurações do sistema salvas com sucesso no computador!',
      data: updated,
    };
  }

  @Post('logo')
  @HttpCode(HttpStatus.OK)
  updateLogo(@Body() body: { logoBase64: string }) {
    const updated = this.settingsService.updateSettings({ companyLogo: body.logoBase64 || '' });
    return {
      success: true,
      message: 'Logotipo da empresa atualizado com sucesso!',
      data: updated,
    };
  }
}
