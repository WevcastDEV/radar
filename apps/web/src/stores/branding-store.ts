import { create } from 'zustand';

export type ColorPalette =
  | 'orange'
  | 'monochrome'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'indigo'
  | 'teal'
  | 'ruby'
  | 'custom';
export type LogoStyle = 'compact' | 'hero';

export interface BrandingSettings {
  companyName: string;
  companySlogan: string;
  platformTitle: string;
  companyLogo: string;
  logoStyle?: LogoStyle;
  instagramUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  attendantLabel?: string;
  colorPalette: ColorPalette;
  customPrimaryColor: string;
  themeMode: 'dark' | 'light' | 'system';
}

interface BrandingState extends BrandingSettings {
  isLoading: boolean;
  isSaving: boolean;
  initBranding: () => void;
  fetchSettings: () => Promise<void>;
  saveSettings: (partial: Partial<BrandingSettings>) => Promise<boolean>;
  setPalette: (palette: ColorPalette, customColor?: string) => void;
  setLogo: (logoBase64: string) => void;
  setLogoStyle: (style: LogoStyle) => void;
  setSocialLinks: (links: { instagramUrl?: string; linkedinUrl?: string; githubUrl?: string }) => void;
  setCompanyInfo: (name: string, slogan: string, title?: string) => void;
}

const DEFAULT_SETTINGS: BrandingSettings = {
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

export function cleanCorruptedUtf8(text?: string): string {
  if (!text) return '';
  return text
    .replace(/Comunica[\uFFFD\?]*o/gi, 'Comunicação')
    .replace(/Impress[\uFFFD\?]*o/gi, 'Impressão')
    .replace(/M[\uFFFD\?]*veis/gi, 'Móveis')
    .replace(/Gr[\uFFFD\?]*fica/gi, 'Gráfica')
    .replace(/\uFFFD/g, '');
}

function getBackendDirectUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://127.0.0.1:3001';
}

function hexToHsl(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return '24 95% 53%';
  const num = parseInt(c, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyColorPalette(palette: ColorPalette, customColor?: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-color-palette', palette);

  let styleTag = document.getElementById('radar-custom-palette-style') as HTMLStyleElement | null;

  if (palette === 'custom' && customColor) {
    const hsl = hexToHsl(customColor);
    const css = `
      [data-color-palette="custom"] {
        --primary: ${hsl} !important;
        --ring: ${hsl} !important;
      }
    `;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'radar-custom-palette-style';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = css;
  } else if (styleTag) {
    styleTag.textContent = '';
  }
}

export function updateDocumentTitle(companyName: string, title?: string) {
  if (typeof document === 'undefined') return;
  const finalTitle = title || companyName || 'CRIART BRASIL';
  if (document.title !== finalTitle) {
    document.title = finalTitle;
  }
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: false,
  isSaving: false,

  initBranding: () => {
    if (typeof localStorage === 'undefined') return;

    // 1. Tenta carregar do localStorage imediatamente (sem atraso na tela)
    try {
      const saved = localStorage.getItem('radar_branding_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          companyName: cleanCorruptedUtf8(parsed.companyName || DEFAULT_SETTINGS.companyName),
          companySlogan: cleanCorruptedUtf8(parsed.companySlogan || DEFAULT_SETTINGS.companySlogan),
          platformTitle: cleanCorruptedUtf8(parsed.platformTitle || DEFAULT_SETTINGS.platformTitle),
          logoStyle: parsed.logoStyle || DEFAULT_SETTINGS.logoStyle,
          instagramUrl: parsed.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
          linkedinUrl: parsed.linkedinUrl || DEFAULT_SETTINGS.linkedinUrl,
          githubUrl: parsed.githubUrl || DEFAULT_SETTINGS.githubUrl,
          attendantLabel: parsed.attendantLabel || DEFAULT_SETTINGS.attendantLabel,
        };
        set(merged);
        applyColorPalette(merged.colorPalette, merged.customPrimaryColor);
        updateDocumentTitle(merged.companyName, merged.platformTitle);
      } else {
        applyColorPalette(DEFAULT_SETTINGS.colorPalette, DEFAULT_SETTINGS.customPrimaryColor);
        updateDocumentTitle(DEFAULT_SETTINGS.companyName, DEFAULT_SETTINGS.platformTitle);
      }
    } catch {
      applyColorPalette(DEFAULT_SETTINGS.colorPalette, DEFAULT_SETTINGS.customPrimaryColor);
    }

    // 2. Sincroniza em background com o arquivo do servidor local (PC do usuário)
    get().fetchSettings();
  },

  fetchSettings: async () => {
    try {
      set({ isLoading: true });
      let res = await fetch('/api/settings', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${getBackendDirectUrl()}/api/settings`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      }

      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data) {
          const merged: BrandingSettings = {
            companyName: cleanCorruptedUtf8(data.companyName || DEFAULT_SETTINGS.companyName),
            companySlogan: cleanCorruptedUtf8(data.companySlogan || DEFAULT_SETTINGS.companySlogan),
            platformTitle: cleanCorruptedUtf8(data.platformTitle || DEFAULT_SETTINGS.platformTitle),
            companyLogo: data.companyLogo || '',
            logoStyle: data.logoStyle || DEFAULT_SETTINGS.logoStyle,
            instagramUrl: data.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
            linkedinUrl: data.linkedinUrl || DEFAULT_SETTINGS.linkedinUrl,
            githubUrl: data.githubUrl || DEFAULT_SETTINGS.githubUrl,
            attendantLabel: data.attendantLabel || DEFAULT_SETTINGS.attendantLabel,
            colorPalette: data.colorPalette || DEFAULT_SETTINGS.colorPalette,
            customPrimaryColor: data.customPrimaryColor || DEFAULT_SETTINGS.customPrimaryColor,
            themeMode: data.themeMode || DEFAULT_SETTINGS.themeMode,
          };
          set(merged);
          try {
            localStorage.setItem('radar_branding_settings', JSON.stringify(merged));
          } catch {}
          applyColorPalette(merged.colorPalette, merged.customPrimaryColor);
          updateDocumentTitle(merged.companyName, merged.platformTitle);
        }
      }
    } catch {
      // Offline ou backend reiniciando
    } finally {
      set({ isLoading: false });
    }
  },

  saveSettings: async (partial: Partial<BrandingSettings>) => {
    const current = get();
    const updated: BrandingSettings = {
      companyName: cleanCorruptedUtf8(partial.companyName !== undefined ? partial.companyName : current.companyName),
      companySlogan: cleanCorruptedUtf8(partial.companySlogan !== undefined ? partial.companySlogan : current.companySlogan),
      platformTitle: cleanCorruptedUtf8(partial.platformTitle !== undefined ? partial.platformTitle : current.platformTitle),
      companyLogo: partial.companyLogo !== undefined ? partial.companyLogo : current.companyLogo,
      logoStyle: partial.logoStyle !== undefined ? partial.logoStyle : current.logoStyle,
      instagramUrl: partial.instagramUrl !== undefined ? partial.instagramUrl : current.instagramUrl,
      linkedinUrl: partial.linkedinUrl !== undefined ? partial.linkedinUrl : current.linkedinUrl,
      githubUrl: partial.githubUrl !== undefined ? partial.githubUrl : current.githubUrl,
      attendantLabel: partial.attendantLabel !== undefined ? partial.attendantLabel : current.attendantLabel,
      colorPalette: partial.colorPalette !== undefined ? partial.colorPalette : current.colorPalette,
      customPrimaryColor: partial.customPrimaryColor !== undefined ? partial.customPrimaryColor : current.customPrimaryColor,
      themeMode: partial.themeMode !== undefined ? partial.themeMode : current.themeMode,
    };

    // Aplicação imediata no frontend
    set({ ...updated, isSaving: true });
    try {
      localStorage.setItem('radar_branding_settings', JSON.stringify(updated));
    } catch {}
    applyColorPalette(updated.colorPalette, updated.customPrimaryColor);
    updateDocumentTitle(updated.companyName, updated.platformTitle);

    // Persistência definitiva no PC (arquivo system_settings.json)
    try {
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify(updated);
      let res = await fetch('/api/settings', { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${getBackendDirectUrl()}/api/settings`, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) }).catch(() => null);
      }
      return Boolean(res && res.ok);
    } catch {
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  setPalette: (palette: ColorPalette, customColor?: string) => {
    const current = get();
    const updated = {
      colorPalette: palette,
      customPrimaryColor: customColor || current.customPrimaryColor,
    };
    get().saveSettings(updated);
  },

  setLogo: (logoBase64: string) => {
    get().saveSettings({ companyLogo: logoBase64 });
  },

  setLogoStyle: (style: LogoStyle) => {
    get().saveSettings({ logoStyle: style });
  },

  setSocialLinks: (links: { instagramUrl?: string; linkedinUrl?: string; githubUrl?: string }) => {
    get().saveSettings(links);
  },

  setCompanyInfo: (name: string, slogan: string, title?: string) => {
    get().saveSettings({
      companyName: name,
      companySlogan: slogan,
      platformTitle: title || name,
    });
  },
}));
