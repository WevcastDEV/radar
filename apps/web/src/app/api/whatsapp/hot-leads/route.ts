import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const localRes = await fetch('http://127.0.0.1:3001/api/whatsapp/hot-leads', {
      signal: AbortSignal.timeout(1500),
    });
    if (localRes.ok) {
      return NextResponse.json(await localRes.json());
    }
  } catch {}

  return NextResponse.json({
    success: true,
    data: [],
  });
}
