import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleProxy(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const slug = params?.slug || [];
  let path = slug.join('/');
  if (path.startsWith('whatsapp/')) {
    path = path.substring(9);
  }

  const method = req.method;
  const deviceId = req.headers.get('x-device-id') || 'default';
  const authHeader = req.headers.get('authorization') || '';

  const apiBase = process.env.INTERNAL_API_URL || 
    (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/') 
      ? process.env.NEXT_PUBLIC_API_URL 
      : 'http://127.0.0.1:3001/api');

  // Se executando no servidor Vercel (nuvem) e a URL aponta para localhost,
  // a nuvem não alcança o PC do usuário. Retorna status limpo em vez de erro 502/404.
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel && (apiBase.includes('127.0.0.1') || apiBase.includes('localhost'))) {
    return NextResponse.json({
      success: true,
      data: null,
      message: 'Robô WhatsApp local em espera na máquina do usuário.',
    });
  }

  const targetUrl = `${apiBase.replace(/\/+$/, '')}/whatsapp/${path}`;

  const headers: Record<string, string> = {
    'x-device-id': deviceId,
    'Accept': 'application/json',
  };
  if (authHeader) headers['Authorization'] = authHeader;

  let body: any = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await req.text();
      headers['Content-Type'] = req.headers.get('content-type') || 'application/json';
    } catch {}
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(9000),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, { 
      status: res.status, 
      headers: { 'Content-Type': contentType || 'text/plain' } 
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Serviço WhatsApp não respondeu em ${targetUrl}. Verifique se o daemon está em execução na sua máquina.`,
      details: err?.message,
    }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: any) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: any) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: any) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: any) {
  return handleProxy(req, ctx);
}
