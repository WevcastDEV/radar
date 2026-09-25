import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get('x-device-id') || 'default';

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
