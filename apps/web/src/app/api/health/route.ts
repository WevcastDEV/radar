import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check if local NestJS API is online
  let localOnline = false;
  try {
    const res = await fetch('http://127.0.0.1:3001/api/health', {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      localOnline = true;
    }
  } catch {}

  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      online: true,
      localApiConnected: localOnline,
      service: 'Radar de Oportunidades - WCTECH',
      timestamp: new Date().toISOString(),
    },
  });
}
