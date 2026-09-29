import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cache compartilhado em memória para sincronização do conector local
let globalSyncedState: Record<string, { data: any; updatedAt: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deviceId = req.headers.get('x-device-id') || body?.deviceId || 'default';
    if (body) {
      const payload = body.data || body;
      globalSyncedState[deviceId] = {
        data: payload,
        updatedAt: Date.now(),
      };
      // Mantém também no default se for a única sessão
      globalSyncedState['default'] = {
        data: payload,
        updatedAt: Date.now(),
      };
      return NextResponse.json({ success: true, message: 'Status sincronizado com sucesso' });
    }
    return NextResponse.json({ success: false, error: 'Payload vazio' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get('x-device-id') || 'default';

  // 1. Se recebemos um status sincronizado recentemente do conector do PC (últimos 30 segundos)
  const cached = globalSyncedState[deviceId] || globalSyncedState['default'];
  if (cached && (Date.now() - cached.updatedAt) < 30000) {
    return NextResponse.json({
      success: true,
      data: cached.data,
    });
  }

  const apiBase = process.env.INTERNAL_API_URL || (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/') ? process.env.NEXT_PUBLIC_API_URL : 'http://127.0.0.1:3001/api');

  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel && (apiBase.includes('127.0.0.1') || apiBase.includes('localhost'))) {
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        qrCode: null,
        deviceId,
        botName: 'Radar Bot',
        message: 'Robô Baileys local em espera no seu computador.',
      },
    });
  }

  try {
    const statusUrl = `${apiBase.replace(/\/+$/, '')}/whatsapp/status`;
    const localRes = await fetch(statusUrl, {
      headers: {
        'x-device-id': deviceId,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });

    if (localRes.ok) {
      return NextResponse.json(await localRes.json());
    }
  } catch {}

  // Se a API local de robô Baileys não estiver ativa nesta máquina, retorna status limpo
  return NextResponse.json({
    success: true,
    data: {
      connected: false,
      qrCode: null,
      deviceId,
      botName: 'Radar Bot',
      message: 'Robô Baileys local em espera ou utilize o botão WhatsApp Web direto.',
    },
  });
}
