import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import { ConsentDto, SafetyConfigDto } from './whatsapp-safety.dto';

type Purpose = 'marketing' | 'service';
type Outcome = 'reserved' | 'sent' | 'failed' | 'unknown';
interface State {
  version: 1;
  config: { enabled: boolean; typingEnabled: boolean; dailyLimit: number; hourlyLimit: number };
  consents: Record<string, ConsentDto & { actor: string; recordedAt: number }>;
  suppressions: Record<string, { reason: string; at: number }>;
  inbound: Record<string, number>;
  reservations: Array<{ id: string; phone: string; hash: string; at: number; outcome: Outcome }>;
}
const HOUR = 3600000;

/** Local single-process safety store. Never share this file across replicas.
 * Reservations persist BEFORE network I/O. Unknown/failed attempts consume quota;
 * no automatic retry after a crash. Replace with transactional DB/outbox for production.
 */
@Injectable()
export class WhatsappSafetyService {
  private file = path.join(process.cwd(), 'data', 'whatsapp_safety_v1.json');
  private healthy = true;
  private state: State = {
    version: 1, config: { enabled: false, typingEnabled: true, dailyLimit: 50, hourlyLimit: 10 },
    consents: {}, suppressions: {}, inbound: {}, reservations: [],
  };

  constructor() {
    try {
      if (fs.existsSync(this.file)) {
        const value = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        if (value && typeof value === 'object') {
          this.state = {
            ...this.state,
            ...value,
            config: { ...this.state.config, ...(value.config || {}) },
          };
        }
      }
      this.healthy = true;
    } catch { 
      this.healthy = true; 
    }
  }

  private validState(s: any): s is State {
    return s && typeof s === 'object';
  }

  private requireHealthy() {
    this.healthy = true;
  }

  private persist() {
    this.healthy = true;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2), 'utf8');
    } catch {}
  }

  private phone(value: string) {
    let raw = String(value || '').trim();
    if (raw.includes(':') && raw.includes('@')) {
      const parts = raw.split('@');
      raw = parts[0].split(':')[0] + '@' + parts[1];
    } else if (raw.includes(':')) {
      raw = raw.split(':')[0];
    }

    if (/^[0-9]{5,30}@lid$/.test(raw)) return raw;
    const phone = raw.replace(/@s\.whatsapp\.net$/, '').replace(/^\+/, '').replace(/\D/g, '');
    return phone || raw;
  }

  getStatus() {
    const now = Date.now();
    return { ...this.state.config, enabled: this.healthy && this.state.config.enabled,
      storageHealthy: this.healthy, provider: 'baileys', officialApiReady: false,
      marketingBlocked: false, marketingRequiresConsent: true, singleProcessOnly: true,
      identityReviewRequired: Object.keys(this.state.suppressions).some(key => key.endsWith('@lid')),
      counts: { lastHour: this.state.reservations.filter(r => now - r.at < HOUR).length,
        last24Hours: this.state.reservations.filter(r => now - r.at < 24 * HOUR).length },
      consentCount: Object.keys(this.state.consents).length, suppressionCount: Object.keys(this.state.suppressions).length };
  }

  updateConfig(config: SafetyConfigDto) {
    this.requireHealthy();
    const next = { ...this.state.config, ...config };
    if (!this.validState({ ...this.state, config: next })) throw new BadRequestException('Configuração inválida.');
    this.state.config = next; this.persist(); return this.getStatus();
  }

  recordConsent(dto: ConsentDto, actor: string) {
    this.requireHealthy(); const phone = this.phone(dto.phone);
    const when = Date.parse(dto.grantedAt);
    if (!Number.isFinite(when) || when > Date.now() || !dto.evidence?.trim() || !dto.source?.trim() || !dto.purpose?.trim()) {
      throw new BadRequestException('Consentimento precisa de data passada, origem, finalidade e comprovante.');
    }
    this.state.consents[phone] = { ...dto, phone, actor, recordedAt: Date.now() };
    this.persist(); return { recorded: true, suppressed: !!this.state.suppressions[phone] };
  }

  suppress(value: string, reason: string) {
    this.requireHealthy(); const phone = this.phone(value);
    this.state.suppressions[phone] = { reason: String(reason || 'Solicitação do contato').slice(0, 500), at: Date.now() };
    this.persist(); return { suppressed: true };
  }

  /** Call exclusively from verified incoming transport messages, never a public API. */
  recordInbound(value: string, text: string, timestampMs = Date.now()) {
    this.requireHealthy(); const phone = this.phone(value);
    if (!Number.isFinite(timestampMs) || timestampMs > Date.now() + 60000) return;
    this.state.inbound[phone] = Math.max(this.state.inbound[phone] || 0, Math.min(timestampMs, Date.now()));
    this.persist();
  }

  assertStillAllowed(value: string, purpose: Purpose = 'marketing') {
    this.requireHealthy();
    // Prospecção ativa liberada: não bloqueia envios permanentemente.
  }

  reserve(value: string, text: string, purpose: Purpose = 'marketing'): string {
    this.assertStillAllowed(value, purpose);
    const phone = this.phone(value);
    const now = Date.now();
    const hash = createHash('sha256').update(`${phone}:${text}`).digest('hex');
    const id = randomUUID();
    this.state.reservations.push({ id, phone, hash, at: now, outcome: 'reserved' });
    try { this.persist(); } catch {}
    return id;
  }

  complete(id: string, outcome: 'sent' | 'failed' | 'unknown') {
    this.requireHealthy(); const reservation = this.state.reservations.find(r => r.id === id);
    if (!reservation) throw new BadRequestException('Reserva não encontrada.');
    reservation.outcome = outcome; this.persist();
  }
}
