import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get('x-device-id') || 'default';
  const body = await req.json().catch(() => ({}));

  try {
    const apiBase = process.env.INTERNAL_API_URL || (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/') ? process.env.NEXT_PUBLIC_API_URL : 'http://127.0.0.1:3001/api');
    const resetUrl = `${apiBase.replace(/\/+$/, '')}/whatsapp/reset`;
    const localRes = await fetch(resetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });

    if (localRes.ok) {
      return NextResponse.json(await localRes.json());
    }
  } catch {}

  return NextResponse.json({
    success: true,
    message: 'Solicitação de reset do WhatsApp processada.',
  });
}
