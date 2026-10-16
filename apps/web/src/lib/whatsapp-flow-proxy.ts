import { NextRequest, NextResponse } from 'next/server';

/** Forward to the service that actually runs the bot; never simulate a successful write. */
export async function proxyWhatsAppFlows(req: NextRequest, subPath: string) {
  const configured = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  const base = configured && !configured.startsWith('/') ? configured : 'http://127.0.0.1:3001/api';
  const apiBase = base.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
  try {
    const response = await fetch(`${apiBase}/whatsapp/flows${subPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') || '',
        'x-device-id': req.headers.get('x-device-id') || 'default',
      },
      body: req.method === 'POST' ? (await req.text()) || undefined : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.ok && data?.success === false ? 400 : response.status });
  } catch {
    return NextResponse.json({
      success: false,
      message: 'O serviço do WhatsApp não respondeu. Verifique se o conector está em execução e tente novamente.',
    }, { status: 502 });
  }
}
