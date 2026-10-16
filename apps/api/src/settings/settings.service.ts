import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemSettings {
  companyName: string;
  companySlogan: string;
  platformTitle: string;
  companyLogo: string;
  logoStyle?: 'compact' | 'hero';
  instagramUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  attendantLabel?: string;
  colorPalette: string;
  customPrimaryColor: string;
  themeMode: 'dark' | 'light' | 'system';
  updatedAt?: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'CRIART BRASIL',
  companySlogan: 'Comunicação Visual, Gráfica & Móveis Planejados',
  platformTitle: 'CRIART BRASIL',
  companyLogo: '',
  logoStyle: 'compact',
  instagramUrl: 'https://www.instagram.com/wctechn_',
  linkedinUrl: 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355',
  githubUrl: 'https://github.com/WevcastDEV',
  attendantLabel: 'Atendente',
  colorPalette: 'orange',
  customPrimaryColor: '#f97316',
  themeMode: 'dark',
};

function sanitizeText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/Comunica[\uFFFD\?]*o/gi, 'Comunicação')
    .replace(/Impress[\uFFFD\?]*o/gi, 'Impressão')
    .replace(/M[\uFFFD\?]*veis/gi, 'Móveis')
    .replace(/Gr[\uFFFD\?]*fica/gi, 'Gráfica')
    .replace(/\uFFFD/g, '');
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly filePath = path.join(process.cwd(), 'data', 'system_settings.json');
  private settings: SystemSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): SystemSettings {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.companySlogan) parsed.companySlogan = sanitizeText(parsed.companySlogan);
        if (parsed.companyName) parsed.companyName = sanitizeText(parsed.companyName);
        if (parsed.platformTitle) parsed.platformTitle = sanitizeText(parsed.platformTitle);

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao ler system_settings.json: ${err?.message}`);
    }

    // Se não existir, salva o padrão
    this.saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(settings: SystemSettings) {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.error(`Erro ao salvar system_settings.json: ${err?.message}`);
    }
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    const sanitized = { ...partial };
    if (sanitized.companySlogan) sanitized.companySlogan = sanitizeText(sanitized.companySlogan);
    if (sanitized.companyName) sanitized.companyName = sanitizeText(sanitized.companyName);
    if (sanitized.platformTitle) sanitized.platformTitle = sanitizeText(sanitized.platformTitle);

    this.settings = {
      ...this.settings,
      ...sanitized,
      companyLogo: sanitized.companyLogo !== undefined ? sanitized.companyLogo : this.settings.companyLogo,
      updatedAt: Date.now(),
    };
    this.saveSettings(this.settings);
    this.logger.log(`⚙️ Configurações da plataforma atualizadas: ${this.settings.companyName} (${this.settings.colorPalette})`);
    return { ...this.settings };
  }
}
