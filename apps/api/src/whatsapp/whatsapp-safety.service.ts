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
        if (!this.validState(value)) throw new Error('Invalid safety state');
        this.state = value;
      } else this.persist();
    } catch { this.healthy = false; }
  }

  private validState(s: any): s is State {
    const map = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
    const identity = (v: any) => typeof v === 'string' && (/^[1-9][0-9]{7,14}$/.test(v) || /^[0-9]{5,30}@lid$/.test(v));
    const time = (v: any) => typeof v === 'number' && Number.isFinite(v) && v > 0;
    const nonempty = (v: any) => typeof v === 'string' && v.trim().length > 0;
    return s?.version === 1 && typeof s.config?.enabled === 'boolean' && typeof s.config?.typingEnabled === 'boolean'
      && Number.isInteger(s.config.dailyLimit) && s.config.dailyLimit >= 1 && s.config.dailyLimit <= 1000
      && Number.isInteger(s.config.hourlyLimit) && s.config.hourlyLimit >= 1 && s.config.hourlyLimit <= 100
      && map(s.consents) && map(s.suppressions) && map(s.inbound)
      && Object.entries(s.consents).every(([key, v]: [string, any]) => identity(key) && map(v)
        && v.phone === key && nonempty(v.actor) && time(v.recordedAt) && nonempty(v.source)
        && nonempty(v.evidence) && nonempty(v.purpose) && typeof v.grantedAt === 'string' && Number.isFinite(Date.parse(v.grantedAt)))
      && Object.entries(s.suppressions).every(([key, v]: [string, any]) => identity(key) && map(v) && nonempty(v.reason) && time(v.at))
      && Object.entries(s.inbound).every(([key, v]) => identity(key) && time(v))
      && Array.isArray(s.reservations) && s.reservations.every((r: any) => map(r) && nonempty(r.id)
        && identity(r.phone) && /^[a-f0-9]{64}$/.test(r.hash) && time(r.at)
        && ['reserved', 'sent', 'failed', 'unknown'].includes(r.outcome));
  }

  private requireHealthy() {
    if (!this.healthy) throw new ServiceUnavailableException('SAFETY_STORAGE_UNAVAILABLE: envios bloqueados; restaure o arquivo de segurança.');
  }

  private persist() {
    this.requireHealthy();
    const temp = `${this.file}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const fd = fs.openSync(temp, 'w', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(this.state, null, 2)); fs.fsyncSync(fd); }
      finally { fs.closeSync(fd); }
      fs.renameSync(temp, this.file);
    } catch {
      this.healthy = false;
      throw new ServiceUnavailableException('SAFETY_STORAGE_WRITE_FAILED: envios bloqueados.');
    }
  }

  private phone(value: string) {
    const raw = String(value || '');
    // LIDs are opaque transport identities, NEVER phone numbers.
    if (/^[0-9]{5,30}@lid$/.test(raw)) return raw;
    const phone = raw.replace(/@s\.whatsapp\.net$/, '').replace(/^\+/, '');
    if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new BadRequestException('Telefone deve incluir código do país e somente dígitos.');
    return phone;
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
    const normalized = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (/\b(sair|pare|parar|stop|cancelar|descadastrar|remover|nao quero|nao me envie|nao envie)\b/.test(normalized)) {
      this.state.suppressions[phone] = { reason: 'Descadastro recebido no WhatsApp', at: Date.now() };
    }
    this.persist();
  }

  assertStillAllowed(value: string, purpose: Purpose = 'marketing') {
    this.requireHealthy(); const phone = this.phone(value);
    if (Object.keys(this.state.suppressions).some(key => key.endsWith('@lid'))) {
      throw new ForbiddenException('IDENTITY_REVIEW_REQUIRED: há descadastro por identidade LID sem associação verificada; todos os envios estão bloqueados até implementar associação segura.');
    }
    if (phone.endsWith('@lid')) {
      throw new ForbiddenException('LID_MAPPING_REQUIRED: identidade LID exige associação verificada ao telefone antes de permitir respostas.');
    }
    if (!this.state.config.enabled) throw new ForbiddenException('DISPATCH_PAUSED: envios pausados na configuração de segurança.');
    if (this.state.suppressions[phone]) throw new ForbiddenException('CONTACT_SUPPRESSED: contato descadastrado.');
    if (purpose === 'marketing') {
      if (!this.state.consents[phone]) throw new ForbiddenException('CONSENT_MISSING: registre consentimento comprovável antes do contato proativo.');
      return;
    }
    const inbound = this.state.inbound[phone];
    if (!inbound || Date.now() - inbound >= 24 * HOUR || inbound > Date.now()) {
      throw new ForbiddenException('CUSTOMER_WINDOW_CLOSED: é necessário recebimento real nas últimas 24 horas.');
    }
  }

  reserve(value: string, text: string, purpose: Purpose = 'marketing'): string {
    this.assertStillAllowed(value, purpose); const phone = this.phone(value); const now = Date.now();
    const rows = this.state.reservations;
    if (rows.filter(r => now - r.at < HOUR).length >= this.state.config.hourlyLimit
      || rows.filter(r => now - r.at < 24 * HOUR).length >= this.state.config.dailyLimit) {
      throw new ForbiddenException('LOCAL_QUOTA_EXCEEDED: limite conservador local atingido.');
    }
    const hash = createHash('sha256').update(`${phone}:${text}`).digest('hex');
    if (rows.some(r => r.hash === hash && now - r.at < 24 * HOUR)) throw new ForbiddenException('DUPLICATE_MESSAGE: tentativa duplicada nas últimas 24 horas.');
    const id = randomUUID();
    this.state.reservations.push({ id, phone, hash, at: now, outcome: 'reserved' });
    this.persist(); return id;
  }

  complete(id: string, outcome: 'sent' | 'failed' | 'unknown') {
    this.requireHealthy(); const reservation = this.state.reservations.find(r => r.id === id);
    if (!reservation) throw new BadRequestException('Reserva não encontrada.');
    reservation.outcome = outcome; this.persist();
  }
}
