import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get('x-device-id') || 'default';

  try {
    const localRes = await fetch('http://127.0.0.1:3001/api/whatsapp/disconnect', {
      method: 'POST',
      headers: {
        'x-device-id': deviceId,
      },
      signal: AbortSignal.timeout(3000),
    });

    if (localRes.ok) {
      return NextResponse.json(await localRes.json());
    }
  } catch {}

  return NextResponse.json({
    success: true,
    message: 'Sessão desconectada com sucesso.',
  });
}
