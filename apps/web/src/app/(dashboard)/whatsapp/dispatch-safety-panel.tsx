'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getTokens } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const whatsappApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 8000,
});
whatsappApi.interceptors.request.use(config => {
  const token = getTokens()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface SafetyStatus {
  enabled: boolean;
  typingEnabled: boolean;
  dailyLimit: number;
  hourlyLimit: number;
  counts: { lastHour: number; last24Hours: number };
  consentCount: number;
  suppressionCount: number;
  storageHealthy: boolean;
  identityReviewRequired: boolean;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Entre com uma conta autenticada para consultar e alterar os controles. O modo demonstração não autoriza envios.';
    if (error.response?.status === 403) return 'Sua conta precisa de permissão de administrador ou gerente.';
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return 'API indisponível. Não foi possível confirmar os controles de envio.';
}

export function DispatchSafetyPanel() {
  const [status, setStatus] = useState<SafetyStatus | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [evidence, setEvidence] = useState('');
  const [purpose, setPurpose] = useState('');
  const [grantedAt, setGrantedAt] = useState('');
  const [reason, setReason] = useState('');

  async function refresh() {
    try {
      const response = await whatsappApi.get('/whatsapp/safety');
      const data = response.data?.data ?? response.data;
      if (typeof data?.enabled !== 'boolean' || typeof data?.storageHealthy !== 'boolean' || !data?.counts) throw new Error('Invalid status');
      setStatus(data);
      setError('');
    } catch (err) {
      setStatus(null);
      setError(errorMessage(err));
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function save(path: string, body: object, success: string) {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await whatsappApi.post(`/whatsapp/safety/${path}`, body);
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
      setStatus(null);
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4" aria-label="Controles de envio responsável">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Controles de envio responsável</h2>
          <p className="text-sm text-muted-foreground">{!status ? 'Status indisponível' : !status.storageHealthy ? 'Armazenamento com falha — envios bloqueados' : status.identityReviewRequired ? 'Revisão de identidade pendente — envios bloqueados' : status.enabled ? 'Atendimento habilitado com restrições' : 'Envios desativados'}</p>
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>Atualizar status</Button>
      </div>
      <p className="text-sm text-muted-foreground">A conexão usa Baileys e não tem garantia contra bloqueios. Contatos proativos exigem consentimento registrado e ausência de descadastro. Respostas de atendimento exigem uma mensagem recebida nas últimas 24 horas. Os limites abaixo são internos, não limites aprovados pela Meta.</p>
      {status?.identityReviewRequired && <p role="alert" className="text-sm text-amber-500">Descadastro recebido com identificador privado: envios bloqueados até associação verificada na migração oficial.</p>}
      {error && <p role="alert" className="text-sm text-amber-500">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-500">{notice}</p>}
      {status && <>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Últimas 24h: {status.counts.last24Hours}/{status.dailyLimit}</span>
          <span>Última hora: {status.counts.lastHour}/{status.hourlyLimit}</span>
          <span>Consentimentos: {status.consentCount}</span>
          <span>Descadastros: {status.suppressionCount}</span>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="sm" disabled={busy || !status.storageHealthy || (status.identityReviewRequired && !status.enabled)} variant={status.enabled ? 'destructive' : 'outline'} onClick={() => void save('config', { enabled: !status.enabled }, status.enabled ? 'Envios desativados.' : 'Atendimento habilitado. Os critérios continuam obrigatórios.')}>{status.enabled ? 'Desativar todos os envios' : 'Habilitar atendimento autorizado'}</Button>
          <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={status.typingEnabled} disabled={busy || !status.storageHealthy} onChange={event => void save('config', { typingEnabled: event.target.checked }, 'Preferência de digitação salva.')} />Exibir “digitando” antes de enviar</label>
        </div>
        <p className="text-xs text-muted-foreground">“Digitando” é um indicador de conversa. Não evita banimento nem significa que um atendente humano está escrevendo.</p>
      </>}
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm font-semibold">Registrar consentimento ou descadastro de um contato</summary>
        <div className="space-y-3 mt-3">
          <label className="block text-sm">Telefone com código do país<Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Ex.: 5592999999999" /></label>
          <p className="text-xs text-muted-foreground">Registre apenas autorização real. Um número público ou importado do Maps não comprova consentimento. Registrar autorização não remove um descadastro existente.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Data da autorização (horário local)<Input type="datetime-local" value={grantedAt} onChange={event => setGrantedAt(event.target.value)} /></label>
            <label className="text-sm">Origem<Input value={source} onChange={event => setSource(event.target.value)} placeholder="Formulário, conversa ou contrato" /></label>
            <label className="text-sm">Referência da comprovação<Input value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="Registro verificável da autorização" /></label>
            <label className="text-sm">Finalidade autorizada<Input value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Ex.: atendimento sobre orçamento solicitado" /></label>
          </div>
          <Button size="sm" disabled={busy || !status?.storageHealthy || !phone.trim() || !source.trim() || !evidence.trim() || !purpose.trim() || !grantedAt} onClick={() => {
            const date = new Date(grantedAt);
            if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) { setError('Informe uma data válida, anterior ou igual ao momento atual.'); return; }
            void save('consent', { phone, source, evidence, purpose, grantedAt: date.toISOString() }, 'Consentimento registrado para auditoria. Campanhas continuam bloqueadas nesta conexão.');
          }}>Registrar autorização comprovada</Button>
          <div className="border-t pt-3 space-y-2">
            <label className="block text-sm">Motivo do descadastro<Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex.: contato solicitou não receber mensagens" /></label>
            <Button size="sm" variant="destructive" disabled={busy || !status?.storageHealthy || !phone.trim() || !reason.trim()} onClick={() => void save('suppress', { phone, reason }, 'Contato incluído na lista de descadastro. Novos envios serão bloqueados.')}>Bloquear mensagens para este contato</Button>
          </div>
        </div>
      </details>
    </section>
  );
}
