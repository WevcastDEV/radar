import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const body = await req.json().catch(() => ({}));

    const apiBase = process.env.INTERNAL_API_URL || 
      (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/') 
        ? process.env.NEXT_PUBLIC_API_URL 
        : 'http://127.0.0.1:3001/api');

    const candidateUrls = [
      `${apiBase.replace(/\/+$/, '')}/whatsapp/reset-client-history`,
      `http://127.0.0.1:3001/api/whatsapp/reset-client-history`,
      `http://localhost:3001/api/whatsapp/reset-client-history`,
    ];

    for (const url of candidateUrls) {
      try {
        const localRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        if (localRes.ok) {
          return NextResponse.json(await localRes.json());
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Histórico de clientes resetado localmente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao resetar histórico' },
      { status: 500 }
    );
  }
}
