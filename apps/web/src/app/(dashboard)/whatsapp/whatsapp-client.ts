import { getOrCreateDeviceId } from '@/lib/device-id';
import { getTokens } from '@/lib/auth';

/**
 * Normaliza o endpoint removendo qualquer prefixo repetido '/whatsapp' ou 'whatsapp'.
 * Exemplos:
 *   '/whatsapp/queue/start' -> '/queue/start'
 *   'whatsapp/status' -> '/status'
 *   '/status' -> '/status'
 *   'status' -> '/status'
 *   '/whatsapp' -> ''
 */
function normalizeSubPath(endpoint: string): string {
  let ep = (endpoint || '').trim();
  if (ep.startsWith('/whatsapp/')) {
    ep = ep.substring(9);
  } else if (ep === '/whatsapp') {
    ep = '';
  } else if (ep.startsWith('whatsapp/')) {
    ep = ep.substring(8);
  } else if (ep === 'whatsapp') {
    ep = '';
  }
  if (!ep.startsWith('/') && ep.length > 0) {
    ep = `/${ep}`;
  }
  return ep;
}

/**
 * Cliente resiliente para chamadas da API do WhatsApp.
 * Prioriza conexão direta com o daemon local na máquina do usuário (porta 3001)
 * com fallback transparente para a rota de proxy do Next.js.
 */
export async function requestWhatsAppApi(
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  endpoint: string,
  body?: any,
  config?: { timeout?: number }
) {
  const token = typeof window !== 'undefined'
    ? (getTokens()?.accessToken || localStorage.getItem('accessToken') || localStorage.getItem('auth_token'))
    : null;
  const did = getOrCreateDeviceId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-device-id': did,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const subPath = normalizeSubPath(endpoint);
  const timeoutMs = config?.timeout || 6000;

  // 1. Tenta direto na máquina local do usuário (onde o WhatsApp está conectado no PC)
  if (typeof window !== 'undefined') {
    try {
      const localUrl = `http://127.0.0.1:3001/api/whatsapp${subPath}`;
      const localRes = await fetch(localUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      let json: any = null;
      try {
        json = await localRes.json();
      } catch {
        json = { success: localRes.ok, status: localRes.status };
      }

      if (localRes.ok) {
        return { data: json };
      }

      // Se a máquina local respondeu mas com erro da API (ex: 400 Bad Request / validação)
      let errMsg = json?.message || json?.error || `Falha na requisição local (HTTP ${localRes.status})`;
      if (Array.isArray(errMsg)) errMsg = errMsg.join(', ');
      if (typeof errMsg !== 'string') errMsg = JSON.stringify(errMsg);
      
      const err = new Error(errMsg);
      (err as any).response = { status: localRes.status, data: json };
      throw err;
    } catch (localErr: any) {
      // Se for um erro lançado por nós (a máquina local respondeu status 4xx/5xx), propaga o erro
      if (localErr?.response) {
        throw localErr;
      }
      // Se for falha de conexão de rede (daemon desligado / porta fechada), continua para fallback
    }
  }

  // 2. Fallback para rota proxy do Next.js
  const proxyUrl = `/api/whatsapp${subPath}`;
  const res = await fetch(proxyUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(Math.max(timeoutMs, 8000)),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = { success: false, message: `Erro de comunicação HTTP ${res.status}` };
  }

  if (!res.ok) {
    let errMsg = json?.message || json?.error || `Falha na requisição (HTTP ${res.status})`;
    if (Array.isArray(errMsg)) errMsg = errMsg.join(', ');
    if (typeof errMsg !== 'string') errMsg = JSON.stringify(errMsg);
    
    const err = new Error(errMsg);
    (err as any).response = { status: res.status, data: json };
    throw err;
  }

  return { data: json };
}

export const safeWhatsAppClient = {
  get: (endpoint: string, config?: any) => requestWhatsAppApi('GET', endpoint, undefined, config),
  post: (endpoint: string, body?: any, config?: any) => requestWhatsAppApi('POST', endpoint, body, config),
  delete: (endpoint: string, config?: any) => requestWhatsAppApi('DELETE', endpoint, undefined, config),
};
