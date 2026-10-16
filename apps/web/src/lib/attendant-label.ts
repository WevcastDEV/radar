import { useBrandingStore } from '@/stores/branding-store';

/**
 * Título personalizável que identifica quem responde no WhatsApp.
 * Ex.: "Atendente", "Consultor", "Vendedor", "Especialista".
 * Configurado em Configurações > Identificação do Atendente.
 */
export const DEFAULT_ATTENDANT_LABEL = 'Atendente';

// Títulos usados historicamente — mensagens antigas continuam reconhecidas
const LEGACY_LABELS = ['Atendente'];

export function sanitizeAttendantLabel(raw?: string): string {
  const clean = (raw || '').replace(/[*\n\r:]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  return clean || DEFAULT_ATTENDANT_LABEL;
}

export function getAttendantLabel(): string {
  try {
    return sanitizeAttendantLabel(useBrandingStore.getState().attendantLabel);
  } catch {
    return DEFAULT_ATTENDANT_LABEL;
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function knownLabels(): string[] {
  return Array.from(new Set([getAttendantLabel(), ...LEGACY_LABELS]));
}

/** Monta a assinatura em negrito: *Consultor Weverton:* */
export function buildAttendantHeader(name: string): string {
  return `*${getAttendantLabel()} ${name}:*`;
}

/** Retorna true se a mensagem já começa com a assinatura (título atual ou antigo). */
export function hasAttendantHeader(text?: string): boolean {
  if (!text) return false;
  const t = text.trimStart();
  return knownLabels().some(l => t.toLowerCase().startsWith(`*${l.toLowerCase()} `));
}

/** Extrai "Título Nome" da assinatura para exibir na bolha da conversa. */
export function extractAttendantTag(text?: string): string | undefined {
  if (!text) return undefined;
  const pattern = new RegExp(`^\\s*\\*(${knownLabels().map(escapeRegex).join('|')})\\s+([^*\\n]+?):?\\*:?`, 'i');
  const m = text.match(pattern);
  return m ? m[2].trim() : undefined;
}
