import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleProxy(req: NextRequest) {
  const method = req.method;
  const authHeader = req.headers.get('authorization') || '';

  const apiBase =
    process.env.INTERNAL_API_URL ||
    (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith('/')
      ? process.env.NEXT_PUBLIC_API_URL
      : 'http://127.0.0.1:3001/api');

  const queryString = req.nextUrl?.search || '';
  const targetUrl = `${apiBase.replace(/\/+$/, '')}/goals${queryString}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
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
      headers: { 'Content-Type': contentType || 'text/plain' },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Serviço de Metas não respondeu em ${targetUrl}.`,
        details: err?.message,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}
